"""
Full-Category Referee Database Builder

Scrapes ALL actas across ALL groups in a given competition (category)
to build a comprehensive referee database. Referees typically officiate
within one category but across different groups, so we need all groups.

Usage:
    python -m scraper.build_referee_db --competition primera-catalana --season 2526
    python -m scraper.build_referee_db --competition primera-catalana --season 2526 --groups grup-1 grup-2
    python -m scraper.build_referee_db --list-competitions

The script:
  1. Iterates all known groups for the competition
  2. Gets all acta URLs from each group's calendar page
  3. Skips actas already present in global_referees.json (anti-duplicate)
  4. Scrapes only NEW actas
  5. Merges into global_referees.json
  6. Logs any acta validation errors to data/acta_errors.log
"""
import argparse
import io
import json
import sys
import time
from dataclasses import asdict
from pathlib import Path
from typing import Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
        sys.stderr.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
    except Exception:
        pass

from .http_client import FCFClient
from .calendar_results import get_acta_urls_from_calendar
from .actas import scrape_acta
from .models import RefereeMatchInfo, DataEncoder
from .discover import COMPETITIONS, KNOWN_GROUPS

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

GLOBAL_REFS_PATH = DATA_DIR / "global_referees.json"
ERROR_LOG_PATH = DATA_DIR / "acta_errors.log"
BASE = "https://www.fcf.cat"
SPORT = "futbol-11"


def _load_global_refs() -> dict:
    """Load existing global referee database."""
    if GLOBAL_REFS_PATH.exists():
        try:
            with open(GLOBAL_REFS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"  ⚠ Error loading global_referees.json: {e}")
    return {}


def _save_global_refs(refs: dict):
    """Save global referee database."""
    with open(GLOBAL_REFS_PATH, "w", encoding="utf-8") as f:
        json.dump(refs, f, cls=DataEncoder, ensure_ascii=False, indent=2)


def _log_errors(errors: list, competition: str, group: str):
    """Append acta errors to the error log file."""
    if not errors:
        return
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with open(ERROR_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"\n{'='*70}\n")
        f.write(f"  Build Referee DB | {competition}/{group} | {timestamp}\n")
        f.write(f"{'='*70}\n")
        for err in errors:
            f.write(f"  [ERROR] {err}\n")
        f.write(f"  Total: {len(errors)} errors\n")


def build_referee_db(
    competition: str,
    season: str = "2526",
    groups: Optional[list] = None,
    rate_limit: float = 1.0,
):
    """
    Scrape all actas for a competition and update the global referee DB.
    
    Args:
        competition: Competition slug (e.g., 'primera-catalana')
        season: Season code
        groups: Specific groups to scrape (None = all known groups)
        rate_limit: Seconds between requests
    """
    client = FCFClient(rate_limit_seconds=rate_limit, max_retries=3, use_cache=True, cache_ttl_seconds=3600)
    
    # Determine groups to scrape
    if groups:
        groups_to_scrape = groups
    else:
        groups_to_scrape = KNOWN_GROUPS.get(competition, ["grup-1"])
    
    comp_name = next((c["name"] for c in COMPETITIONS if c["slug"] == competition), competition)
    
    print(f"\n{'='*60}")
    print(f"  🏗 Building Referee DB: {comp_name}")
    print(f"  Season: {season} | Groups: {len(groups_to_scrape)}")
    print(f"{'='*60}\n")
    
    # Load existing DB
    global_refs = _load_global_refs()
    existing_count = len(global_refs)
    print(f"  📂 Existing DB: {existing_count} matches\n")
    
    total_new = 0
    total_skipped = 0
    total_errors = 0
    total_actas_scraped = 0
    
    for gi, group in enumerate(groups_to_scrape, 1):
        calendar_url = f"{BASE}/calendari/{season}/{SPORT}/{competition}/{group}"
        print(f"  [{gi}/{len(groups_to_scrape)}] {competition}/{group}")
        
        # Get all acta URLs from this group's calendar
        try:
            acta_urls = get_acta_urls_from_calendar(client, calendar_url)
        except Exception as e:
            print(f"      ⚠ Failed to get calendar: {e}")
            continue
        
        print(f"      Found {len(acta_urls)} acta URLs")
        
        # Filter out actas we might already have
        # We can't know the exact match ID from the URL alone,
        # so we scrape and check after parsing
        new_in_group = 0
        skipped_in_group = 0
        errors_in_group = []
        
        for ai, url in enumerate(acta_urls, 1):
            if ai % 10 == 0 or ai == len(acta_urls):
                sys.stdout.write(f"\r      Processing acta {ai}/{len(acta_urls)}... (+{new_in_group} new, ~{skipped_in_group} skip)")
                sys.stdout.flush()
            
            acta = scrape_acta(client, url)
            if not acta:
                continue
            
            total_actas_scraped += 1
            
            # Check for validation errors
            validation_errors = acta.validate()
            if validation_errors:
                errors_in_group.extend(validation_errors)
            
            # Convert to RefereeMatchInfo and check if already in DB
            ref_info = RefereeMatchInfo.from_acta(acta, competition, group, season)
            
            if ref_info.id in global_refs:
                skipped_in_group += 1
            else:
                global_refs[ref_info.id] = asdict(ref_info)
                new_in_group += 1
        
        sys.stdout.write(f"\n      ✅ +{new_in_group} new | ~{skipped_in_group} already had | {len(errors_in_group)} errors\n")
        sys.stdout.flush()
        
        # Log errors for this group
        if errors_in_group:
            _log_errors(errors_in_group, competition, group)
        
        total_new += new_in_group
        total_skipped += skipped_in_group
        total_errors += len(errors_in_group)
        
        # Save after each group (incremental saves prevent data loss)
        if new_in_group > 0:
            _save_global_refs(global_refs)
    
    # Final stats
    print(f"\n{'='*60}")
    print(f"  ✅ DONE — {comp_name}")
    print(f"{'='*60}")
    print(f"  Actas scraped:     {total_actas_scraped}")
    print(f"  New matches added: {total_new}")
    print(f"  Already existed:   {total_skipped}")
    print(f"  Validation errors: {total_errors}")
    print(f"  Total in DB now:   {len(global_refs)}")
    if total_errors > 0:
        print(f"  ⚠ Errors logged to: {ERROR_LOG_PATH}")
    print(f"{'='*60}\n")
    
    return {
        "scraped": total_actas_scraped,
        "new": total_new,
        "skipped": total_skipped,
        "errors": total_errors,
        "total_db": len(global_refs),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Build global referee database by scraping all actas in a competition",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m scraper.build_referee_db --competition primera-catalana
  python -m scraper.build_referee_db --competition segona-catalana --groups grup-1 grup-2
  python -m scraper.build_referee_db --list-competitions
        """,
    )
    parser.add_argument("--competition", "-c", help="Competition slug to scrape")
    parser.add_argument("--season", "-s", default="2526", help="Season code (default: 2526)")
    parser.add_argument("--groups", "-g", nargs="+", help="Specific groups (default: all)")
    parser.add_argument("--rate-limit", type=float, default=1.0, help="Seconds between requests (default: 1.0)")
    parser.add_argument("--list-competitions", action="store_true", help="List available competitions")
    args = parser.parse_args()

    if args.list_competitions:
        print("\n📋 FCF Futbol 11 Competitions\n")
        print(f"{'Slug':<25} {'Name':<30} {'Groups'}")
        print("-" * 70)
        for comp in COMPETITIONS:
            groups = KNOWN_GROUPS.get(comp["slug"], [])
            print(f"{comp['slug']:<25} {comp['name']:<30} {len(groups)} groups")
        print()
        return

    if not args.competition:
        parser.print_help()
        sys.exit(1)

    build_referee_db(
        competition=args.competition,
        season=args.season,
        groups=args.groups,
        rate_limit=args.rate_limit,
    )


if __name__ == "__main__":
    main()
