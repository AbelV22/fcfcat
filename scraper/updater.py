"""
FCF Incremental Updater
=======================
Runs a weekly update: only scrapes actas that are NOT yet in the database,
re-downloads fast data (standings, sanctions, scorers, calendar) every time,
and re-computes intelligence from the full accumulated acta history.

Usage (CLI):
    python -m scraper.main --team "Fundació Acadèmia" --update

Usage (API):
    POST /api/update  →  same job structure as POST /api/scrape
"""
from __future__ import annotations

import logging
import time
from dataclasses import asdict
from pathlib import Path
from typing import Any, Callable, Optional

from .database import Database, DEFAULT_DB_PATH
from .http_client import FCFClient
from .models import (
    DataEncoder, MatchReport, RefereeMatchInfo, Sanction
)
from .standings import scrape_standings
from .scorers import scrape_scorers, compute_scorers_from_actas
from .sanctions import scrape_sanctions
from .calendar_results import (
    scrape_calendar, get_acta_urls_from_calendar,
    find_next_match, get_acta_url_for_team_in_jornada,
    extract_referee_from_upcoming_acta,
)
from .actas import scrape_acta, scrape_all_actas
from .validator import validate_all
from .intelligence import (
    build_team_intelligence, compute_conditional_insights,
    build_rival_report, build_referee_intelligence,
)

logger = logging.getLogger("fcf_scraper")

BASE = "https://www.fcf.cat"
SPORT = "futbol-11"


def _build_urls(season: str, competition: str, group: str) -> dict:
    b = BASE
    return {
        "standings": f"{b}/classificacio/{season}/{SPORT}/{competition}/{group}",
        "calendar":  f"{b}/calendari/{season}/{SPORT}/{competition}/{group}",
        "results":   f"{b}/resultats/{season}/{SPORT}/{competition}/{group}",
        "scorers":   f"{b}/golejadors/{season}/{SPORT}/{competition}/{group}",
        "sanctions": f"{b}/sancions/{season}/{SPORT}/{competition}/{group}",
    }


def _keywords_from(name: str) -> list[str]:
    """Generate URL-friendly keywords from a team name."""
    name_lower = name.lower()
    normalized = (
        name_lower
        .replace("à", "a").replace("è", "e").replace("é", "e")
        .replace("í", "i").replace("ò", "o").replace("ó", "o")
        .replace("ú", "u").replace("ç", "c").replace("ñ", "n")
        .replace(" ", "-")
    )
    parts = name_lower.split()
    return list({name_lower, normalized, *parts})


# ── Progress callback type ────────────────────────────────────────────────────

ProgressCallback = Callable[[str, int], None]


def _noop_progress(step: str, pct: int):
    pass


# ── Main entry point ──────────────────────────────────────────────────────────

def run_weekly_update(
    team: str,
    season: str,
    competition: str,
    group: str,
    rival: str = "",
    full: bool = False,
    db_path: str | Path = DEFAULT_DB_PATH,
    progress_cb: ProgressCallback = _noop_progress,
    use_cache: bool = True,
) -> dict[str, Any]:
    """
    Incremental weekly update.

    1. Fast data (standings, sanctions, scorers, calendar) → always re-downloaded.
    2. Acta URLs from calendar → compare against DB → only NEW ones are scraped.
    3. New actas are persisted to the DB.
    4. Intelligence is rebuilt from ALL actas in the DB (accumulated history).
    5. Returns the same all_data dict that _run_scrape returns, so the API
       and frontend stay unchanged.

    Parameters
    ----------
    team        : Team name (substring match, as used in the scraper)
    season      : e.g. "2526"
    competition : e.g. "segona-catalana"
    group       : e.g. "grup-3"
    rival       : Optional rival name (auto-detected from next_match if empty)
    full        : If True, force-re-scrape ALL actas even if already in DB
    db_path     : Path to the SQLite database
    progress_cb : Callable(step: str, pct: int) for UI progress reporting
    use_cache   : Whether to use HTTP cache

    Returns
    -------
    dict with same structure as the legacy _run_scrape job data
    """
    start_time = time.time()
    db = Database(db_path)
    db.ensure_season(season, competition, group, team)

    client = FCFClient(
        rate_limit_seconds=1.2,
        max_retries=3,
        use_cache=use_cache,
        cache_ttl_seconds=3600,
    )
    URLS = _build_urls(season, competition, group)
    all_data: dict[str, Any] = {}

    # ── 1: Standings ──────────────────────────────────────────────────────────
    progress_cb("Descargando clasificación...", 5)
    try:
        standings_objs = scrape_standings(client, URLS["standings"])
        standings = [asdict(s) for s in standings_objs]
        db.save_standings(standings, season, competition, group)
        all_data["standings"] = standings
    except Exception as e:
        logger.error(f"Standings error: {e}")
        standings_objs = []
        standings = db.load_standings(season, competition, group)  # use cached
        all_data["standings"] = standings

    # ── 2: Scorers ────────────────────────────────────────────────────────────
    progress_cb("Descargando golejadors...", 12)
    try:
        scorers_objs = scrape_scorers(client, URLS["scorers"])
        scorers = [asdict(s) for s in scorers_objs]
        db.save_scorers(scorers, season, competition, group)
        all_data["scorers"] = scorers
    except Exception as e:
        logger.error(f"Scorers error: {e}")
        scorers_objs = []
        scorers = db.load_scorers(season, competition, group)
        all_data["scorers"] = scorers

    # ── 3: Sanctions ──────────────────────────────────────────────────────────
    progress_cb("Descargando sancions...", 18)
    try:
        sanctions_objs = scrape_sanctions(client, URLS["sanctions"])
        sanctions = [asdict(s) for s in sanctions_objs]
        db.save_sanctions(sanctions, season, competition, group)
        all_data["sanctions"] = sanctions
    except Exception as e:
        logger.error(f"Sanctions error: {e}")
        sanctions_objs = []
        sanctions = db.load_sanctions(season, competition, group)
        all_data["sanctions"] = sanctions

    # ── 4: Calendar ───────────────────────────────────────────────────────────
    progress_cb("Descargando calendari i resultats...", 24)
    try:
        matches_objs = scrape_calendar(client, URLS["calendar"])
        matches = [asdict(m) for m in matches_objs]
        # Upsert all matches (keeps acta_scraped flag intact)
        db.upsert_matches(matches, season, competition, group)
        all_data["matches"] = matches
    except Exception as e:
        logger.error(f"Calendar error: {e}")
        matches_objs = []
        matches = []
        all_data["matches"] = []

    # ── 4b: Detect next match ─────────────────────────────────────────────────
    diagnostics: list[str] = []
    if matches_objs and team:
        progress_cb("Detectant proper partit i rival...", 30)
        try:
            next_match = find_next_match(matches_objs, team)
            if next_match:
                if not rival:
                    rival = next_match.rival_name

                # Get acta URL, date, venue from resultats page
                if not next_match.acta_url and URLS.get("results"):
                    match_info = get_acta_url_for_team_in_jornada(
                        client, URLS["results"], next_match.jornada, team
                    )
                    if match_info["acta_url"]:
                        next_match.acta_url = match_info["acta_url"]
                        if match_info["date"]:
                            next_match.date = match_info["date"]
                        if match_info["time"]:
                            next_match.time = match_info["time"]
                        if match_info["venue"]:
                            next_match.venue = match_info["venue"]

                if next_match.acta_url:
                    refs = extract_referee_from_upcoming_acta(client, next_match.acta_url)
                    if refs:
                        next_match.referees = refs
                        next_match.referee = refs[0]
                        diagnostics.append(f"👨‍⚖️ Àrbitre: {refs[0]}")

                all_data["next_match"] = asdict(next_match)
                diagnostics.append(
                    f"✅ Proper partit: J{next_match.jornada} vs {next_match.rival_name} "
                    f"({'Casa' if next_match.is_home else 'Fora'}) | {next_match.date} {next_match.time}"
                )
            else:
                diagnostics.append("⚠️ No s'ha trobat proper partit")
        except Exception as e:
            logger.warning(f"Next match detection failed: {e}")
            diagnostics.append(f"💥 Error proper partit: {e}")

    all_data["diagnostics"] = diagnostics

    # ── 5: Detect NEW actas ───────────────────────────────────────────────────
    progress_cb("Detectant actes noves...", 35)

    # All acta URLs from the live calendar page
    all_calendar_acta_urls = get_acta_urls_from_calendar(client, URLS["calendar"])

    if not full:
        # Which ones are not yet in the DB?
        already_scraped = db.get_scraped_acta_urls(season, competition, group)
        new_acta_urls = [u for u in all_calendar_acta_urls if u not in already_scraped]

        # Optionally filter to team/rival only
        if team:
            team_kws = _keywords_from(team)
            rival_kws = _keywords_from(rival) if rival else []

            def _team_relevant(url: str) -> bool:
                u = url.lower()
                return (any(k in u for k in team_kws) or
                        (rival_kws and any(k in u for k in rival_kws)))

            # Filter new actas to relevant ones; if no relevant new ones found,
            # but some were found total, don't fall back to scraping all.
            team_new_urls = [u for u in new_acta_urls if _team_relevant(u)]
            new_acta_urls = team_new_urls
    else:
        # Force re-scrape everything
        new_acta_urls = all_calendar_acta_urls

    total_new = len(new_acta_urls)
    already_in_db = db.count_actas(season, competition, group)
    diagnostics.append(f"📦 Actes en BD: {already_in_db} | Actes noves a descarregar: {total_new}")
    logger.info(f"Weekly update: {already_in_db} actas in DB, {total_new} new to scrape")

    # ── 6: Scrape new actas ───────────────────────────────────────────────────
    newly_scraped_dicts: list[dict] = []

    if total_new > 0:
        progress_cb(f"Descarregant {total_new} actes noves...", 38)

        def _acta_progress(current: int, total: int, _url: str):
            pct = 38 + int((current / max(total, 1)) * 40)
            progress_cb(f"Acta {current}/{total}...", pct)

        new_acta_objs: list[MatchReport] = scrape_all_actas(
            client, new_acta_urls, progress_callback=_acta_progress
        )

        # Persist each new acta to the DB
        for acta_obj in new_acta_objs:
            acta_dict = asdict(acta_obj)
            url = acta_dict.get("acta_url", "")
            if url:
                db.save_acta(url, acta_dict, season, competition, group)
                newly_scraped_dicts.append(acta_dict)

        diagnostics.append(f"✅ {len(newly_scraped_dicts)}/{total_new} actes noves desades")
    else:
        progress_cb("Cap acta nova — usant dades de la BD...", 78)
        diagnostics.append("ℹ️ Cap acta nova — tot ja és a la BD")

    # ── 7: Load ALL actas from DB (history + new) ─────────────────────────────
    progress_cb("Carregant actes de la BD...", 79)
    all_actas_dicts = db.load_all_actas(season, competition, group)
    all_data["actas"] = all_actas_dicts

    # Reconstruct MatchReport objects for intelligence functions
    from .actas import scrape_acta as _  # noqa – ensure module loaded
    from dataclasses import fields as dc_fields
    from .models import (
        MatchReport, PlayerEntry, GoalEvent, CardEvent,
        SubstitutionEvent, TechnicalStaffMember,
    )

    def _dict_to_match_report(d: dict) -> MatchReport:
        """Reconstruct a MatchReport from its serialised dict."""
        def _pe(x): return PlayerEntry(**{k: v for k, v in x.items() if k in {f.name for f in dc_fields(PlayerEntry)}})
        def _ge(x): return GoalEvent(**{k: v for k, v in x.items() if k in {f.name for f in dc_fields(GoalEvent)}})
        def _ce(x): return CardEvent(**{k: v for k, v in x.items() if k in {f.name for f in dc_fields(CardEvent)}})
        def _se(x): return SubstitutionEvent(**{k: v for k, v in x.items() if k in {f.name for f in dc_fields(SubstitutionEvent)}})
        def _ts(x): return TechnicalStaffMember(**{k: v for k, v in x.items() if k in {f.name for f in dc_fields(TechnicalStaffMember)}})

        return MatchReport(
            jornada=d.get("jornada", 0),
            date=d.get("date", ""),
            time=d.get("time", ""),
            home_team=d.get("home_team", ""),
            away_team=d.get("away_team", ""),
            home_score=d.get("home_score", 0),
            away_score=d.get("away_score", 0),
            venue=d.get("venue", ""),
            acta_url=d.get("acta_url", ""),
            status=d.get("status", ""),
            home_lineup=[_pe(p) for p in d.get("home_lineup", [])],
            away_lineup=[_pe(p) for p in d.get("away_lineup", [])],
            home_bench=[_pe(p) for p in d.get("home_bench", [])],
            away_bench=[_pe(p) for p in d.get("away_bench", [])],
            home_staff=[_ts(s) for s in d.get("home_staff", [])],
            away_staff=[_ts(s) for s in d.get("away_staff", [])],
            goals=[_ge(g) for g in d.get("goals", [])],
            yellow_cards=[_ce(c) for c in d.get("yellow_cards", [])],
            red_cards=[_ce(c) for c in d.get("red_cards", [])],
            substitutions=[_se(s) for s in d.get("substitutions", [])],
            referees=d.get("referees", []),
            home_coach=d.get("home_coach", ""),
            away_coach=d.get("away_coach", ""),
        )

    all_actas_objs = [_dict_to_match_report(d) for d in all_actas_dicts]

    # ── 8: Scorers from actas ─────────────────────────────────────────────────
    progress_cb("Calculant golejadors des de les actes...", 82)
    if all_actas_objs:
        computed_scorers = compute_scorers_from_actas(all_actas_objs)
        all_data["scorers_from_actas"] = [asdict(s) for s in computed_scorers]
        if not scorers:
            scorers_objs = computed_scorers
    else:
        all_data["scorers_from_actas"] = []

    # ── 9: Update referee DB ──────────────────────────────────────────────────
    progress_cb("Actualitzant base de dades d'àrbitres...", 84)
    new_refs_count = 0
    existing_ref_ids = set(db.load_referees_as_dict().keys())
    for acta_obj in all_actas_objs:
        ref_info = RefereeMatchInfo.from_acta(acta_obj, competition, group, season)
        if ref_info.id not in existing_ref_ids:
            db.upsert_referee(ref_info.id, asdict(ref_info), competition, group, season)
            existing_ref_ids.add(ref_info.id)
            new_refs_count += 1
    all_data["global_referee_matches_added"] = new_refs_count

    # ── 10: Validation ────────────────────────────────────────────────────────
    progress_cb("Validant dades...", 87)
    from .models import TeamStanding, Scorer
    standings_objs_for_val = []
    for s in standings:
        try:
            standings_objs_for_val.append(TeamStanding(**{
                k: v for k, v in s.items()
                if k in {f.name for f in dc_fields(TeamStanding)}
            }))
        except Exception:
            pass
    validation = validate_all(
        standings=standings_objs_for_val,
        matches=matches_objs,
        actas=all_actas_objs,
        scorers=[],
        sanctions=[],
    )
    all_data["validation"] = asdict(validation)

    # ── 11: Team intelligence ─────────────────────────────────────────────────
    progress_cb("Construint informe d'intel·ligència...", 90)
    team_intel = build_team_intelligence(team, all_actas_objs, standings_objs_for_val)
    team_insights = compute_conditional_insights(team_intel)
    all_data["team_intelligence"] = asdict(team_intel)
    all_data["team_insights"] = team_insights

    if rival:
        rival_intel = build_team_intelligence(rival, all_actas_objs, standings_objs_for_val)
        rival_insights = compute_conditional_insights(rival_intel)
        all_data["rival_intelligence"] = asdict(rival_intel)
        all_data["rival_insights"] = rival_insights

        # Rival report
        progress_cb("Generant informe del rival...", 93)
        sanction_objs = []
        for s in sanctions:
            try:
                sanction_objs.append(Sanction(**{k: v for k, v in s.items() if k in {f.name for f in dc_fields(Sanction)}}))
            except Exception:
                pass
        rival_report = build_rival_report(
            our_team=team,
            rival_team=rival,
            rival_intel=rival_intel,
            actas=all_actas_objs,
            standings=standings_objs_for_val,
            sanctions=sanction_objs,
        )
        all_data["rival_report"] = rival_report

    # ── 12: Referee intelligence ──────────────────────────────────────────────
    progress_cb("Analitzant àrbitres...", 95)
    all_referee_names: set[str] = set()
    for acta_obj in all_actas_objs:
        for ref in acta_obj.referees:
            if ref.strip():
                all_referee_names.add(ref.strip())
    next_match_data = all_data.get("next_match", {})
    for ref in next_match_data.get("referees", []):
        if ref and ref.strip():
            all_referee_names.add(ref.strip())

    all_historic_refs = db.load_all_referees()
    referee_reports = {}
    for ref_name in all_referee_names:
        referee_reports[ref_name] = build_referee_intelligence(
            referee_name=ref_name,
            global_refs=all_historic_refs,
            competition=competition,
            our_team=team,
        )
    all_data["referee_reports"] = referee_reports

    # ── 13: Group teams list ──────────────────────────────────────────────────
    all_data["group_teams"] = [s["name"] for s in standings] if standings else []

    # ── 14: Meta ──────────────────────────────────────────────────────────────
    elapsed = round(time.time() - start_time, 1)
    all_data["meta"] = {
        "team":        team,
        "rival":       rival or None,
        "season":      season,
        "competition": competition,
        "group":       group,
        "scraped_at":  time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "elapsed_seconds": elapsed,
        # Extra update metadata
        "update_mode":       True,
        "actas_in_db":       db.count_actas(season, competition, group),
        "new_actas_scraped": len(newly_scraped_dicts),
    }
    all_data["diagnostics"] = diagnostics

    progress_cb("Fet!", 100)
    logger.info(
        f"Weekly update complete in {elapsed}s | "
        f"DB has {db.count_actas(season, competition, group)} actas | "
        f"{len(newly_scraped_dicts)} new scraped"
    )
    return all_data
