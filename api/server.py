"""
ProCoach FCF API
================
FastAPI backend that wraps the scraper and discovery modules.

Run from project root:
    uvicorn api.server:app --reload --port 8000

Endpoints:
    GET  /api/competitions        → list all FCF Futbol 11 competitions
    POST /api/search              → find a team's competition/group
    POST /api/scrape              → start scraping job → {job_id}
    GET  /api/job/{job_id}        → poll job status & progress
    GET  /api/team/{team_id}      → get saved team data
    GET  /api/teams               → list all registered teams
"""

import json
import sys
import time
import threading
import uuid
from dataclasses import asdict
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ── Scraper imports ──────────────────────────────────────────────────────────
# Run from project root so 'scraper' package is importable
from scraper.discover import search_team as _search_team, COMPETITIONS, _keywords_from
from scraper.http_client import FCFClient
from scraper.standings import scrape_standings
from scraper.scorers import scrape_scorers, compute_scorers_from_actas
from scraper.sanctions import scrape_sanctions
from scraper.calendar_results import scrape_calendar, get_acta_urls_from_calendar, find_next_match, extract_referee_from_upcoming_acta, get_acta_url_for_team_in_jornada
from scraper.actas import scrape_all_actas
from scraper.validator import validate_all
from scraper.intelligence import build_team_intelligence, compute_conditional_insights, build_rival_report, build_referee_intelligence
from scraper.models import DataEncoder, Sanction, RefereeMatchInfo

app = FastAPI(title="ProCoach FCF API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory job store ──────────────────────────────────────────────────────
jobs: dict[str, dict] = {}

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
(DATA_DIR / "teams").mkdir(exist_ok=True)

REGISTRY_FILE = DATA_DIR / "teams_registry.json"

BASE = "https://www.fcf.cat"
SPORT = "futbol-11"


# ── Request models ───────────────────────────────────────────────────────────
class SearchRequest(BaseModel):
    team: str
    season: str = "2526"
    quick: bool = False


class ScrapeRequest(BaseModel):
    team: str
    season: str = "2526"
    competition: str
    group: str
    rival: str = ""
    full: bool = False
    team_id: str = ""


# ── Helper ───────────────────────────────────────────────────────────────────
def _build_urls(season: str, competition: str, group: str) -> dict:
    b = BASE
    return {
        "standings": f"{b}/classificacio/{season}/{SPORT}/{competition}/{group}",
        "calendar":  f"{b}/calendari/{season}/{SPORT}/{competition}/{group}",
        "results":   f"{b}/resultats/{season}/{SPORT}/{competition}/{group}",
        "scorers":   f"{b}/golejadors/{season}/{SPORT}/{competition}/{group}",
        "sanctions": f"{b}/sancions/{season}/{SPORT}/{competition}/{group}",
        "fair_play": f"{b}/jocnet/{season}/{SPORT}/{competition}/{group}",
    }


def _update_job(job_id: str, **kwargs):
    jobs[job_id].update(kwargs)


def _run_scrape(job_id: str, req: ScrapeRequest):
    """Background thread that runs the full scraping pipeline."""
    job = jobs[job_id]
    job["start_time"] = time.time()

    try:
        client = FCFClient(rate_limit_seconds=1.2, max_retries=3, use_cache=True, cache_ttl_seconds=3600)
        URLS = _build_urls(req.season, req.competition, req.group)

        all_data: dict[str, Any] = {}

        # ── Step 1: Standings ──
        _update_job(job_id, step="Descargando clasificación...", progress=5)
        try:
            standings = scrape_standings(client, URLS["standings"])
            all_data["standings"] = [asdict(s) for s in standings]
        except Exception as e:
            standings = []
            all_data["standings"] = []
            job["warnings"] = job.get("warnings", []) + [f"Standings error: {e}"]

        # ── Step 2: Scorers ──
        _update_job(job_id, step="Descargando golejadors...", progress=12)
        try:
            scorers = scrape_scorers(client, URLS["scorers"])
            all_data["scorers"] = [asdict(s) for s in scorers]
        except Exception as e:
            scorers = []
            all_data["scorers"] = []

        # ── Step 3: Sanctions ──
        _update_job(job_id, step="Descargando sancions...", progress=18)
        try:
            sanctions = scrape_sanctions(client, URLS["sanctions"])
            all_data["sanctions"] = [asdict(s) for s in sanctions]
        except Exception as e:
            sanctions = []
            all_data["sanctions"] = []

        # ── Step 4: Calendar ──
        _update_job(job_id, step="Descargando calendari i resultats...", progress=24)
        try:
            matches = scrape_calendar(client, URLS["calendar"])
            all_data["matches"] = [asdict(m) for m in matches]
        except Exception as e:
            matches = []
            all_data["matches"] = []

        # ── Step 4b: Detect Next Match ──
        diagnostics: list[str] = []
        if matches and req.team:
            _update_job(job_id, step="Detectant proper partit i rival...", progress=30)
            try:
                diagnostics.append(f"📋 Calendar returned {len(matches)} matches")
                # Log what team names are in the calendar for debugging
                cal_teams = set()
                for m in matches:
                    cal_teams.add(m.home_team)
                    cal_teams.add(m.away_team)
                diagnostics.append(f"🏟️ Teams in calendar: {', '.join(sorted(cal_teams)[:10])}{'...' if len(cal_teams) > 10 else ''}")
                diagnostics.append(f"🔍 Searching for: '{req.team}'")

                next_match = find_next_match(matches, req.team)
                if next_match:
                    diagnostics.append(f"✅ Next match found: J{next_match.jornada} | {next_match.date} {next_match.time}")
                    diagnostics.append(f"⚔️ Rival: {next_match.rival_name} ({'Casa' if next_match.is_home else 'Fuera'})")

                    # Auto-set the rival for the intelligence gathering
                    if not req.rival:
                        req.rival = next_match.rival_name

                    # Fetch acta URL + date/time/venue from per-jornada resultats page
                    # (calendar doesn't have acta links for future matches)
                    if not next_match.acta_url and URLS.get("results"):
                        match_info = get_acta_url_for_team_in_jornada(
                            client, URLS["results"], next_match.jornada, req.team
                        )
                        if match_info["acta_url"]:
                            next_match.acta_url = match_info["acta_url"]
                            if match_info["date"]:
                                next_match.date = match_info["date"]
                            if match_info["time"]:
                                next_match.time = match_info["time"]
                            if match_info["venue"]:
                                next_match.venue = match_info["venue"]
                            diagnostics.append(f"📄 Acta URL from resultats: {match_info['acta_url']}")
                            diagnostics.append(f"📅 {match_info['date']} {match_info['time']} @ {match_info['venue']}")
                        else:
                            diagnostics.append(f"⚠️ No acta URL found in resultats J{next_match.jornada}")

                    # Try to extract referee from upcoming acta
                    if next_match.acta_url:
                        refs = extract_referee_from_upcoming_acta(client, next_match.acta_url)
                        if refs:
                            next_match.referees = refs
                            next_match.referee = refs[0]
                            diagnostics.append(f"👨‍⚖️ Referee found: {refs[0]}")
                        else:
                            diagnostics.append("⚠️ No referee in acta (not yet assigned)")
                    else:
                        diagnostics.append("⚠️ No acta URL for next match")
                    
                    all_data["next_match"] = asdict(next_match)
                else:
                    diagnostics.append("❌ No match found for team in calendar (name mismatch?)")
                    diagnostics.append(f"   Team name: '{req.team}'")
            except Exception as e:
                diagnostics.append(f"💥 Error: {e}")
                job["warnings"] = job.get("warnings", []) + [f"Next match error: {e}"]

        all_data["diagnostics"] = diagnostics
        for d in diagnostics:
            print(f"[DIAG] {d}")

        # ── Step 6: Actas ──
        _update_job(job_id, step="Descargando actes de partits...", progress=35)
        acta_urls = get_acta_urls_from_calendar(client, URLS["calendar"])

        if not req.full and req.team:
            # Filter to team's matches
            team_kws = _keywords_from(req.team)
            rival_kws = _keywords_from(req.rival) if req.rival else []
            def _url_relevant(url: str) -> bool:
                u = url.lower()
                return (any(k in u for k in team_kws) or
                        (rival_kws and any(k in u for k in rival_kws)))
            filtered = [u for u in acta_urls if _url_relevant(u)]
            # If no URLs matched by keyword (keyword not in URL), scrape all
            acta_urls_to_scrape = filtered if filtered else acta_urls
        else:
            acta_urls_to_scrape = acta_urls

        total_actas = len(acta_urls_to_scrape)
        _update_job(job_id, step=f"Processant {total_actas} actes...", progress=38)

        def _progress(current: int, total: int, _url: str):
            pct = 38 + int((current / max(total, 1)) * 45)
            _update_job(job_id,
                step=f"Acta {current}/{total}...",
                progress=pct,
                actas_done=current,
                actas_total=total)

        actas = scrape_all_actas(client, acta_urls_to_scrape, progress_callback=_progress)
        all_data["actas"] = [asdict(a) for a in actas]

        # ── Step 6b: Scorers from actas ──
        _update_job(job_id, step="Calculant golejadors des de les actes...", progress=84)
        if actas:
            computed_scorers = compute_scorers_from_actas(actas)
            all_data["scorers_from_actas"] = [asdict(s) for s in computed_scorers]
            if not scorers:
                scorers = computed_scorers
            
            # ── Step 6c: Update Global Referee Database ──
            _update_job(job_id, step="Actualitzant base de dades d'àrbitres...", progress=86)
            global_ref_path = DATA_DIR / "global_referees.json"
            global_refs = {}
            if global_ref_path.exists():
                try:
                    with open(global_ref_path, "r", encoding="utf-8") as f:
                        global_refs = json.load(f)
                except Exception as e:
                    print(f"Error loading global_referees.json: {e}")
            
            new_refs_count = 0
            for acta in actas:
                ref_info = RefereeMatchInfo.from_acta(
                    acta=acta,
                    comp=req.competition,
                    group=req.group,
                    season=req.season
                )
                
                # Use the unique ID generated by the model (JornadaX-Home-v-Away)
                if ref_info.id not in global_refs:
                    global_refs[ref_info.id] = asdict(ref_info)
                    new_refs_count += 1
            
            if new_refs_count > 0:
                with open(global_ref_path, "w", encoding="utf-8") as f:
                    json.dump(global_refs, f, cls=DataEncoder, ensure_ascii=False, indent=2)
                print(f"Added {new_refs_count} new matches to global referee DB.")
                
            all_data["global_referee_matches_added"] = new_refs_count
        else:
            all_data["scorers_from_actas"] = []

        # ── Step 7: Validation + Error Logging ──
        _update_job(job_id, step="Validant dades...", progress=88)
        validation = validate_all(
            standings=standings,
            matches=matches,
            actas=actas,
            scorers=scorers,
            sanctions=sanctions,
        )
        all_data["validation"] = asdict(validation)

        # ── Write acta errors to log file ──
        acta_errors = []
        for acta in actas:
            errors = acta.validate()
            for err in errors:
                acta_errors.append(err)
        
        if acta_errors:
            log_path = DATA_DIR / "acta_errors.log"
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(f"\n{'='*70}\n")
                f.write(f"  Scrape: {req.team} | {req.competition}/{req.group} | {timestamp}\n")
                f.write(f"{'='*70}\n")
                for err in acta_errors:
                    f.write(f"  [ERROR] {err}\n")
                f.write(f"  Total: {len(acta_errors)} errors in {len(actas)} actas\n")
            all_data["acta_errors"] = acta_errors
            print(f"⚠ {len(acta_errors)} acta validation errors logged to {log_path}")
        else:
            all_data["acta_errors"] = []

        # ── Step 8: Intelligence ──
        _update_job(job_id, step="Construint informe d'intel·ligència...", progress=90)
        team_intel = build_team_intelligence(req.team, actas, standings)
        team_insights = compute_conditional_insights(team_intel)
        all_data["team_intelligence"] = asdict(team_intel)
        all_data["team_insights"] = team_insights

        if req.rival:
            rival_intel = build_team_intelligence(req.rival, actas, standings)
            rival_insights = compute_conditional_insights(rival_intel)
            all_data["rival_intelligence"] = asdict(rival_intel)
            all_data["rival_insights"] = rival_insights

            # ── Step 8b: Rival Report ──
            _update_job(job_id, step="Generant informe del rival...", progress=93)
            sanction_objs = [Sanction(**s) for s in all_data.get("sanctions", [])] if all_data.get("sanctions") else []
            rival_report = build_rival_report(
                our_team=req.team,
                rival_team=req.rival,
                rival_intel=rival_intel,
                actas=actas,
                standings=standings,
                sanctions=sanction_objs,
            )
            all_data["rival_report"] = rival_report

        # ── Step 8c: Referee Intelligence ──
        _update_job(job_id, step="Analitzant àrbitres...", progress=95)
        all_referees = set()
        for acta in actas:
            for ref in acta.referees:
                if ref.strip():
                    all_referees.add(ref.strip())
        # Also include the next_match referee so it always appears in reports
        next_match_obj = all_data.get("next_match")
        if next_match_obj and isinstance(next_match_obj, dict):
            nm_ref = next_match_obj.get("referee", "")
            if nm_ref and nm_ref.strip():
                all_referees.add(nm_ref.strip())
                    
        # Load global refs to ensure we get historic data for these referees
        ref_db_path = DATA_DIR / "global_referees.json"
        all_historic_refs = []
        if ref_db_path.exists():
            try:
                with open(ref_db_path, "r", encoding="utf-8") as f:
                    all_historic_refs = list(json.load(f).values())
            except Exception:
                pass
                
        # If the file didn't exist or loading failed, fallback to just what we scraped
        if not all_historic_refs:
            all_historic_refs = [asdict(RefereeMatchInfo.from_acta(a, req.competition, req.group, req.season)) for a in actas]

        referee_reports = {}
        for ref_name in all_referees:
            referee_reports[ref_name] = build_referee_intelligence(
                referee_name=ref_name,
                global_refs=all_historic_refs,
                competition=req.competition,
                our_team=req.team,
            )
        all_data["referee_reports"] = referee_reports

        # Provide list of all teams in group for rival selector
        all_data["group_teams"] = [s.name for s in standings] if standings else []

        # ── Metadata ──
        # Look up competition_name from discover module
        comp_name_map = {c["slug"]: c["name"] for c in COMPETITIONS}
        all_data["meta"] = {
            "team": req.team,
            "rival": req.rival or None,
            "season": req.season,
            "competition": req.competition,
            "competition_name": comp_name_map.get(req.competition, req.competition),
            "group": req.group,
            "tier": next((c["tier"] for c in COMPETITIONS if c["slug"] == req.competition), 0),
            "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "elapsed_seconds": round(time.time() - job["start_time"], 1),
        }

        # ── Save to file ──
        _update_job(job_id, step="Guardant dades...", progress=97)
        team_id = req.team_id or req.team.lower().replace(" ", "-")[:30]
        out_path = DATA_DIR / "teams" / f"{team_id}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(all_data, f, cls=DataEncoder, ensure_ascii=False, indent=2)

        # Also save main file
        main_path = DATA_DIR / "fcf_data.json"
        with open(main_path, "w", encoding="utf-8") as f:
            json.dump(all_data, f, cls=DataEncoder, ensure_ascii=False, indent=2)

        _update_job(job_id,
            status="done",
            progress=100,
            step="Fet!",
            data=all_data,
            team_id=team_id,
            elapsed=round(time.time() - job["start_time"], 1))

    except Exception as e:
        import traceback
        _update_job(job_id,
            status="error",
            step=f"Error: {e}",
            error=str(e),
            traceback=traceback.format_exc())


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/competitions")
def list_competitions():
    return {"competitions": COMPETITIONS}


@app.post("/api/search")
def search_team(req: SearchRequest):
    """Search for a team across all FCF Futbol 11 competitions."""
    client = FCFClient(rate_limit_seconds=0.8, max_retries=2, use_cache=True, cache_ttl_seconds=3600)
    result = _search_team(
        team_keyword=req.team,
        season=req.season,
        client=client,
        verbose=False,
        quick=req.quick,
    )
    if result:
        return {"found": True, **asdict(result)}
    return {"found": False, "team_keyword": req.team, "season": req.season}


@app.post("/api/scrape")
def start_scrape(req: ScrapeRequest):
    """Start a scraping job in the background. Returns job_id for polling."""
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "running",
        "step": "Inicialitzant...",
        "progress": 0,
        "data": None,
        "error": None,
        "actas_done": 0,
        "actas_total": 0,
    }
    t = threading.Thread(target=_run_scrape, args=(job_id, req), daemon=True)
    t.start()
    return {"job_id": job_id}


@app.get("/api/job/{job_id}")
def get_job(job_id: str):
    """Poll scraping job status."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = dict(jobs[job_id])
    # Don't send full data in poll — only send when done
    if job.get("status") == "done":
        return {k: v for k, v in job.items() if k != "data"}
    return {k: v for k, v in job.items() if k != "data"}


@app.get("/api/job/{job_id}/data")
def get_job_data(job_id: str):
    """Get full data once job is done."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = jobs[job_id]
    if job.get("status") != "done":
        raise HTTPException(status_code=202, detail="Job not finished yet")
    return job.get("data", {})


@app.get("/api/team/{team_id}")
def get_team(team_id: str):
    """Get saved team data from file."""
    path = DATA_DIR / "teams" / f"{team_id}.json"
    if not path.exists():
        # Try main data file
        main = DATA_DIR / "fcf_data.json"
        if main.exists():
            return json.loads(main.read_text(encoding="utf-8"))
        raise HTTPException(status_code=404, detail="Team data not found")
    return json.loads(path.read_text(encoding="utf-8"))


@app.get("/api/teams")
def list_teams():
    """List all registered teams."""
    if REGISTRY_FILE.exists():
        registry = json.loads(REGISTRY_FILE.read_text(encoding="utf-8"))
        teams = registry.get("teams", [])
    else:
        teams = []

    # Also check data/teams/ directory
    team_files = list((DATA_DIR / "teams").glob("*.json"))
    file_ids = {f.stem for f in team_files}
    reg_ids = {t["id"] for t in teams}
    for fid in file_ids - reg_ids:
        if fid and fid != "placeholder":
            teams.append({"id": fid, "team_keyword": fid.replace("-", " ").title()})

    return {"teams": teams}


@app.get("/api/saved")
def get_saved():
    """Check if there is saved team data from a previous scrape."""
    main = DATA_DIR / "fcf_data.json"
    if not main.exists():
        return {"found": False}
    try:
        data = json.loads(main.read_text(encoding="utf-8"))
        meta = data.get("meta", {})
        if not meta.get("team"):
            return {"found": False}
        return {
            "found": True,
            "team_name": meta.get("team", ""),
            "competition": meta.get("competition", ""),
            "competition_name": meta.get("competition_name", meta.get("competition", "")),
            "group": meta.get("group", ""),
            "season": meta.get("season", "2526"),
            "tier": meta.get("tier", 0),
            "scraped_at": meta.get("scraped_at", ""),
        }
    except Exception:
        return {"found": False}


@app.get("/api/health")
def health():
    return {"status": "ok", "jobs": len(jobs)}
