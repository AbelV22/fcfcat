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
from scraper.calendar_results import scrape_calendar, get_acta_urls_from_calendar
from scraper.fair_play import scrape_fair_play
from scraper.actas import scrape_all_actas
from scraper.validator import validate_all
from scraper.intelligence import build_team_intelligence, compute_conditional_insights
from scraper.models import DataEncoder

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

        # ── Step 4: Fair Play ──
        _update_job(job_id, step="Descargando joc net...", progress=24)
        try:
            fair_play = scrape_fair_play(client, URLS["fair_play"])
            all_data["fair_play"] = [asdict(f) for f in fair_play]
        except Exception as e:
            fair_play = []
            all_data["fair_play"] = []

        # ── Step 5: Calendar ──
        _update_job(job_id, step="Descargando calendari i resultats...", progress=30)
        try:
            matches = scrape_calendar(client, URLS["calendar"])
            all_data["matches"] = [asdict(m) for m in matches]
        except Exception as e:
            matches = []
            all_data["matches"] = []

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
        else:
            all_data["scorers_from_actas"] = []

        # ── Step 7: Validation ──
        _update_job(job_id, step="Validant dades...", progress=88)
        validation = validate_all(
            standings=standings,
            matches=matches,
            actas=actas,
            scorers=scorers,
            sanctions=sanctions,
            fair_play=fair_play,
        )
        all_data["validation"] = asdict(validation)

        # ── Step 8: Intelligence ──
        _update_job(job_id, step="Construint informe d'intel·ligència...", progress=93)
        team_intel = build_team_intelligence(req.team, actas, standings)
        team_insights = compute_conditional_insights(team_intel)
        all_data["team_intelligence"] = asdict(team_intel)
        all_data["team_insights"] = team_insights

        if req.rival:
            rival_intel = build_team_intelligence(req.rival, actas, standings)
            rival_insights = compute_conditional_insights(rival_intel)
            all_data["rival_intelligence"] = asdict(rival_intel)
            all_data["rival_insights"] = rival_insights

        # ── Metadata ──
        all_data["meta"] = {
            "team": req.team,
            "rival": req.rival or None,
            "season": req.season,
            "competition": req.competition,
            "group": req.group,
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


@app.get("/api/health")
def health():
    return {"status": "ok", "jobs": len(jobs)}
