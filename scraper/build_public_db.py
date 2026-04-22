"""
FCF Public Database Builder
============================
Scrapes ALL FCF competitions (standings + results + scorers) and pushes
to Supabase. Does NOT download actas — fast light scraping.

Two modes:
  --full        Scrape all competitions (initial population)
  --categories  Only specific competition slugs (e.g. primera-catalana)
  --push        Push to Supabase (default: True, use --no-push for dry-run)
  --push-refs   Also push existing global_referees.json to Supabase

Usage:
  python -m scraper.build_public_db --full --push-refs
  python -m scraper.build_public_db --categories primera-catalana segona-catalana
  python -m scraper.build_public_db --full --no-push   # dry-run, no Supabase
"""
from __future__ import annotations
import argparse
import json
import logging
import sys
import time
from dataclasses import asdict
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
        sys.stderr.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
    except Exception:
        pass

from .http_client import FCFClient
from .standings import scrape_standings
from .calendar_results import scrape_calendar
from .scorers import scrape_scorers
from .discover import COMPETITIONS, KNOWN_GROUPS

logger = logging.getLogger("fcf_public_db")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)

BASE    = "https://www.fcf.cat"
SPORT   = "futbol-11"
SEASON  = "2526"
DATA_DIR = Path(__file__).parent.parent / "data"


def _build_urls(competition: str, group: str, season: str = SEASON) -> dict:
    base_path = f"{BASE}/{{endpoint}}/{season}/{SPORT}/{competition}/{group}"
    return {
        "standings": base_path.format(endpoint="classificacio"),
        "calendar":  base_path.format(endpoint="calendari"),
        "scorers":   base_path.format(endpoint="golejadors"),
    }


def scrape_group(
    client: FCFClient,
    competition: str,
    group: str,
    season: str = SEASON,
    push: bool = True,
) -> dict:
    """
    Scrape standings + calendar + scorers for one group.
    Returns { standings, matches, scorers } as lists of dicts.
    """
    urls = _build_urls(competition, group, season)
    result = {"standings": [], "matches": [], "scorers": []}

    # ── Standings ──────────────────────────────────────────
    try:
        standings = scrape_standings(client, urls["standings"])
        result["standings"] = [asdict(s) for s in standings]
        logger.info(f"  standings: {len(standings)} teams")
    except Exception as e:
        logger.warning(f"  standings FAILED: {e}")

    # ── Calendar / Results ─────────────────────────────────
    try:
        matches = scrape_calendar(client, urls["calendar"])
        result["matches"] = [asdict(m) for m in matches]
        logger.info(f"  matches:   {len(matches)} rows")
    except Exception as e:
        logger.warning(f"  calendar FAILED: {e}")

    # ── Top Scorers ────────────────────────────────────────
    try:
        scorers = scrape_scorers(client, urls["scorers"])
        result["scorers"] = [asdict(s) for s in scorers]
        logger.info(f"  scorers:   {len(scorers)} players")
    except Exception as e:
        logger.warning(f"  scorers FAILED: {e}")

    # ── Push to Supabase ───────────────────────────────────
    if push:
        try:
            from .supabase_uploader import (
                push_standings, push_matches, push_scorers
            )
            if result["standings"]:
                push_standings(result["standings"], competition, group, season)
            if result["matches"]:
                push_matches(result["matches"], competition, group, season)
            if result["scorers"]:
                push_scorers(result["scorers"], competition, group, season)
        except Exception as e:
            logger.error(f"  Supabase push FAILED: {e}")

    return result


def push_referee_db(push: bool = True) -> int:
    """Push referee matches to Supabase.

    Merges two sources:
      1. global_referees.json  (legacy standalone scraper)
      2. SQLite referees table (populated by the weekly updater for ALL competitions)
    The SQLite DB often has data for competitions (quarta-catalana, tercera-catalana…)
    that were never scraped via build_referee_db, so we merge both to get full coverage.
    """
    refs: dict = {}

    # Source 1: global_referees.json
    refs_path = DATA_DIR / "global_referees.json"
    if refs_path.exists():
        try:
            with open(refs_path, encoding="utf-8") as f:
                refs = json.load(f)
            logger.info(f"Loaded {len(refs)} referee matches from global_referees.json")
        except Exception as e:
            logger.warning(f"Could not load global_referees.json: {e}")

    # Source 2: SQLite referees table (weekly updater data — may include more competitions)
    try:
        from .database import Database
        db = Database()
        sqlite_refs = db.load_referees_as_dict()
        before = len(refs)
        for ref_id, ref_data in sqlite_refs.items():
            if ref_id not in refs:
                refs[ref_id] = ref_data
            else:
                # Prefer SQLite version if it has goals and the JSON version doesn't
                existing_goals = refs[ref_id].get("goals") or []
                new_goals = ref_data.get("goals") or []
                if not existing_goals and new_goals:
                    refs[ref_id] = ref_data
        added = len(refs) - before
        if added > 0:
            logger.info(f"Merged {added} extra referee matches from SQLite DB (total now: {len(refs)})")
    except Exception as e:
        logger.warning(f"Could not load SQLite referees: {e}")

    if not refs:
        logger.warning("No referee data found from any source, skipping")
        return 0

    logger.info(f"Total referee matches to push: {len(refs)}")

    if push:
        try:
            from .supabase_uploader import push_referee_matches
            n = push_referee_matches(refs)
            logger.info(f"  Pushed {n} referee matches to Supabase")
            return n
        except Exception as e:
            logger.error(f"  Referee push FAILED: {e}")

    return len(refs)


def build_public_db(
    competitions_filter: list[str] | None = None,
    season: str = SEASON,
    push: bool = True,
    push_refs: bool = False,
    rate_limit: float = 1.5,
) -> dict:
    """
    Main entry point. Scrapes all (or filtered) competitions and
    pushes public data to Supabase.
    """
    client = FCFClient(
        rate_limit_seconds=rate_limit,
        max_retries=3,
        use_cache=False,   # Always fresh data
        cache_ttl_seconds=3600,
    )

    comps_to_scrape = [
        c for c in COMPETITIONS
        if competitions_filter is None or c["slug"] in competitions_filter
    ]

    total_groups   = sum(len(KNOWN_GROUPS.get(c["slug"], [])) for c in comps_to_scrape)
    total_standings = 0
    total_matches   = 0
    total_scorers   = 0
    errors          = 0

    print(f"\n{'='*60}")
    print(f"  FCF Public DB Builder")
    print(f"  Season: {season} | Competitions: {len(comps_to_scrape)} | Groups: {total_groups}")
    print(f"  Push to Supabase: {push}")
    print(f"{'='*60}\n")

    for ci, comp in enumerate(comps_to_scrape, 1):
        slug   = comp["slug"]
        name   = comp["name"]
        groups = KNOWN_GROUPS.get(slug, ["grup-unic"])

        print(f"[{ci}/{len(comps_to_scrape)}] {name} ({len(groups)} groups)")

        for gi, group in enumerate(groups, 1):
            print(f"  [{gi}/{len(groups)}] {group}", end="  ", flush=True)
            try:
                result = scrape_group(client, slug, group, season, push=push)
                total_standings += len(result["standings"])
                total_matches   += len(result["matches"])
                total_scorers   += len(result["scorers"])
                print(f"✓ standings:{len(result['standings'])} matches:{len(result['matches'])}")
            except Exception as e:
                errors += 1
                print(f"✗ {e}")
                logger.error(f"Group {slug}/{group}: {e}")

    # Push referee DB if requested
    if push_refs:
        print("\nPushing referee matches...")
        push_referee_db(push=push)

    summary = {
        "competitions": len(comps_to_scrape),
        "groups":       total_groups,
        "standings":    total_standings,
        "matches":      total_matches,
        "scorers":      total_scorers,
        "errors":       errors,
    }

    print(f"\n{'='*60}")
    print(f"  DONE")
    print(f"  Standings: {total_standings}")
    print(f"  Matches:   {total_matches}")
    print(f"  Scorers:   {total_scorers}")
    print(f"  Errors:    {errors}")
    print(f"{'='*60}\n")

    return summary


def main():
    parser = argparse.ArgumentParser(
        description="Build FCF public database — scrapes all competitions and pushes to Supabase",
    )
    parser.add_argument(
        "--full", action="store_true",
        help="Scrape ALL known competitions (default if no --categories given)",
    )
    parser.add_argument(
        "--categories", "-c", nargs="+",
        help="Only scrape specific competition slugs (e.g. primera-catalana)",
    )
    parser.add_argument(
        "--season", "-s", default=SEASON,
        help=f"Season code (default: {SEASON})",
    )
    parser.add_argument(
        "--no-push", dest="push", action="store_false", default=True,
        help="Dry-run: scrape but do NOT push to Supabase",
    )
    parser.add_argument(
        "--push-refs", action="store_true",
        help="Also push global_referees.json to Supabase",
    )
    parser.add_argument(
        "--rate-limit", type=float, default=1.5,
        help="Seconds between HTTP requests (default: 1.5)",
    )
    args = parser.parse_args()

    comps = args.categories if args.categories else None

    build_public_db(
        competitions_filter=comps,
        season=args.season,
        push=args.push,
        push_refs=args.push_refs,
        rate_limit=args.rate_limit,
    )


if __name__ == "__main__":
    main()
