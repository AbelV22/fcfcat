"""
FCF Scraper - Main Orchestrator

Usage:
    python -m scraper.main --team "Fundació Acadèmia" --rival "AE Prat"
    python -m scraper.main --team "Fundació Acadèmia" --full
    python -m scraper.main --team "Fundació Acadèmia" --season 2526 --competition segona-catalana --group grup-3
    python -m scraper.main --team "Fundació Acadèmia" --no-cache

This orchestrates all scrapers, runs cross-validation, builds team
intelligence reports, and outputs verified JSON data.
"""
import argparse
import io
import json
import logging
import sys
import time
import threading
from dataclasses import asdict
from pathlib import Path
from typing import Optional

# Fix Windows console encoding for Unicode output
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from .http_client import FCFClient
from .models import DataEncoder, ValidationReport
from .standings import scrape_standings
from .scorers import scrape_scorers, compute_scorers_from_actas
from .sanctions import scrape_sanctions
from .calendar_results import scrape_calendar, get_acta_urls_from_calendar, find_next_match, get_acta_url_for_team_in_jornada, extract_referee_from_upcoming_acta
from .actas import scrape_all_actas
from .validator import validate_all
from .intelligence import build_team_intelligence, compute_conditional_insights, build_referee_intelligence
from .models import RefereeMatchInfo

logger = logging.getLogger("fcf_scraper")

# ─── URL Configuration ────────────────────────────────
BASE = "https://www.fcf.cat"
SPORT = "futbol-11"

# Defaults (used when not provided via CLI)
DEFAULT_SEASON = "2526"
DEFAULT_COMPETITION = "segona-catalana"
DEFAULT_GROUP = "grup-3"

OUTPUT_DIR = Path(__file__).parent.parent / "data"


def build_urls(season: str, competition: str, group: str) -> dict:
    """Build all FCF URLs for a given season/competition/group."""
    base = f"{BASE}"
    return {
        "standings": f"{base}/classificacio/{season}/{SPORT}/{competition}/{group}",
        "calendar":  f"{base}/calendari/{season}/{SPORT}/{competition}/{group}",
        "results":   f"{base}/resultats/{season}/{SPORT}/{competition}/{group}",
        "scorers":   f"{base}/golejadors/{season}/{SPORT}/{competition}/{group}",
        "sanctions": f"{base}/sancions/{season}/{SPORT}/{competition}/{group}",
        "fair_play": f"{base}/jocnet/{season}/{SPORT}/{competition}/{group}",
    }


def setup_logging(verbose: bool = False):
    level = logging.DEBUG if verbose else logging.INFO
    log_dir = Path(__file__).parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)
    
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.FileHandler(log_dir / "scraper.log", encoding="utf-8"),
            logging.StreamHandler(sys.stdout)
        ]
    )


def progress_callback(current: int, total: int, url: str):
    pct = (current / total) * 100
    bar_len = 30
    filled = int(bar_len * current / total)
    bar = "█" * filled + "░" * (bar_len - filled)
    print(f"\r  [{bar}] {pct:5.1f}% ({current}/{total}) ", end="", flush=True)


def run_scraper(
    team: str = "Fundació Acadèmia",
    rival: Optional[str] = None,
    full_actas: bool = False,
    use_cache: bool = True,
    max_actas: int = 0,
    verbose: bool = False,
    season: str = DEFAULT_SEASON,
    competition: str = DEFAULT_COMPETITION,
    group: str = DEFAULT_GROUP,
    output_file: Optional[str] = None,
) -> dict:
    """
    Main scraping orchestration.
    Returns a dict with all scraped and validated data.
    """
    setup_logging(verbose)
    start_time = time.time()

    URLS = build_urls(season, competition, group)

    client = FCFClient(
        rate_limit_seconds=1.5,
        max_retries=3,
        use_cache=use_cache,
        cache_ttl_seconds=3600,
    )

    print("\n╔══════════════════════════════════════════════════╗")
    print("║       FCF SCRAPER - Data Intelligence           ║")
    print("╠══════════════════════════════════════════════════╣")
    print(f"║  Team:    {team:<39}║")
    if rival:
        print(f"║  Rival:   {rival:<39}║")
    print(f"║  Season:  {season:<39}║")
    print(f"║  Group:   {competition} / {group:<23}║")
    print("╚══════════════════════════════════════════════════╝\n")

    all_data = {}

    # ── Step 1: Standings ──
    print("📊 [1/6] Scraping standings (classificació)...")
    try:
        standings = scrape_standings(client, URLS["standings"])
        all_data["standings"] = [asdict(s) for s in standings]
        print(f"   ✓ {len(standings)} teams found")
    except Exception as e:
        logger.error(f"Failed to scrape standings: {e}")
        standings = []
        print(f"   ✗ Error: {e}")

    # ── Step 2: Scorers ──
    print("⚽ [2/6] Scraping top scorers (golejadors)...")
    try:
        scorers = scrape_scorers(client, URLS["scorers"])
        all_data["scorers"] = [asdict(s) for s in scorers]
        print(f"   ✓ {len(scorers)} scorers found")
    except Exception as e:
        logger.error(f"Failed to scrape scorers: {e}")
        scorers = []
        print(f"   ✗ Error: {e}")

    # ── Step 3: Sanctions ──
    print("🟨 [3/6] Scraping sanctions (sancions)...")
    try:
        sanctions = scrape_sanctions(client, URLS["sanctions"])
        all_data["sanctions"] = [asdict(s) for s in sanctions]
        print(f"   ✓ {len(sanctions)} sanctions found")
    except Exception as e:
        logger.error(f"Failed to scrape sanctions: {e}")
        sanctions = []
        print(f"   ✗ Error: {e}")

    # ── Step 4: Calendar & Results ──
    print("📅 [4/6] Scraping calendar & results...")
    try:
        matches = scrape_calendar(client, URLS["calendar"])
        all_data["matches"] = [asdict(m) for m in matches]
        print(f"   ✓ {len(matches)} matches found")
    except Exception as e:
        logger.error(f"Failed to scrape calendar: {e}")
        matches = []
        print(f"   ✗ Error: {e}")

    # ── Step 4b: Next Match Detection ──
    if matches and team:
        print("🔭 [4b] Detecting next match...")
        try:
            next_match = find_next_match(matches, team)
            if next_match:
                print(f"   ✓ J{next_match.jornada} vs {next_match.rival_name} ({'Home' if next_match.is_home else 'Away'}) | {next_match.date} {next_match.time}")
                # Fetch acta URL + date/time/venue from resultats page
                # (calendar has no acta links for future matches)
                match_info = get_acta_url_for_team_in_jornada(client, URLS["results"], next_match.jornada, team)
                if match_info["acta_url"]:
                    next_match.acta_url = match_info["acta_url"]
                    if match_info["date"]:
                        next_match.date = match_info["date"]
                    if match_info["time"]:
                        next_match.time = match_info["time"]
                    if match_info["venue"]:
                        next_match.venue = match_info["venue"]
                    refs = extract_referee_from_upcoming_acta(client, next_match.acta_url)
                    if refs:
                        next_match.referees = refs
                        next_match.referee = refs[0]
                        print(f"   ✓ Referee: {refs[0]}")
                    else:
                        print(f"   ⚠ No referee assigned yet")
                else:
                    print(f"   ⚠ No acta found in resultats J{next_match.jornada}")
                all_data["next_match"] = asdict(next_match)
                # Auto-set rival if not provided
                if not rival:
                    rival = next_match.rival_name
            else:
                print("   ⚠ No upcoming match found (season complete?)")
        except Exception as e:
            logger.warning(f"Next match detection failed: {e}")
            print(f"   ✗ Error: {e}")

    # ── Step 5: Actas (Match Reports) ──
    print("📋 [5/6] Scraping match reports (actas)...")
    acta_urls = get_acta_urls_from_calendar(client, URLS["calendar"])
    print(f"   Found {len(acta_urls)} acta URLs")

    if not full_actas and rival:
        # Only scrape actas involving our team or the rival
        team_lower = team.lower()
        rival_lower = rival.lower()
        filtered_urls = [
            url for url in acta_urls
            if _url_involves_team(url, team_lower) or _url_involves_team(url, rival_lower)
        ]
        print(f"   Filtering to {len(filtered_urls)} actas (team + rival)")
        acta_urls = filtered_urls
    elif not full_actas:
        # Only scrape actas involving our team
        team_lower = team.lower()
        filtered_urls = [url for url in acta_urls if _url_involves_team(url, team_lower)]
        print(f"   Filtering to {len(filtered_urls)} actas (team only)")
        acta_urls = filtered_urls

    if max_actas > 0:
        acta_urls = acta_urls[:max_actas]
        print(f"   Limited to {max_actas} actas")

    actas = scrape_all_actas(client, acta_urls, progress_callback=progress_callback)
    all_data["actas"] = [asdict(a) for a in actas]
    print(f"\n   ✓ {len(actas)} actas scraped successfully")

    # ── Step 6b: Compute scorers from actas (authoritative source) ──
    if actas:
        computed_scorers = compute_scorers_from_actas(actas)
        all_data["scorers_from_actas"] = [asdict(s) for s in computed_scorers]
        print(f"   ✓ {len(computed_scorers)} scorers computed from actas")
        # If HTML scrape returned nothing, use computed scorers for validation
        if not scorers:
            scorers = computed_scorers

    # ── Step 6: Cross-Validation ──
    print("\n🔍 [6/6] Running cross-validation...")
    validation = validate_all(
        standings=standings,
        matches=matches,
        actas=actas,
        scorers=scorers,
        sanctions=sanctions,
    )
    print(validation.summary())

    all_data["validation"] = asdict(validation)

    # ── Build Intelligence Reports ──
    print("\n🧠 Building intelligence reports...")

    # Our team intelligence
    team_intel = build_team_intelligence(team, actas, standings)
    team_insights = compute_conditional_insights(team_intel)
    all_data["team_intelligence"] = asdict(team_intel)
    all_data["team_insights"] = team_insights
    print(f"   ✓ {team}: {len(team_intel.players)} players, {len(team_intel.results)} matches analyzed")

    # Rival intelligence
    if rival:
        rival_intel = build_team_intelligence(rival, actas, standings)
        rival_insights = compute_conditional_insights(rival_intel)
        all_data["rival_intelligence"] = asdict(rival_intel)
        all_data["rival_insights"] = rival_insights
        print(f"   ✓ {rival}: {len(rival_intel.players)} players, {len(rival_intel.results)} matches analyzed")

    # ── Referee Database & Reports ──
    if actas:
        print("👨‍⚖️ Building referee reports...")
        # Load existing global referee DB
        global_ref_path = OUTPUT_DIR / "global_referees.json"
        global_refs: dict = {}
        if global_ref_path.exists():
            try:
                with open(global_ref_path, "r", encoding="utf-8") as f:
                    global_refs = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load global_referees.json: {e}")

        # Update global DB with actas from this scrape
        new_refs_count = 0
        for acta in actas:
            ref_info = RefereeMatchInfo.from_acta(acta, competition, group, season)
            if ref_info.id not in global_refs:
                global_refs[ref_info.id] = asdict(ref_info)
                new_refs_count += 1

        with open(global_ref_path, "w", encoding="utf-8") as f:
            json.dump(global_refs, f, cls=DataEncoder, ensure_ascii=False, indent=2)
        if new_refs_count > 0:
            print(f"   ✓ Added {new_refs_count} new matches to global referee DB ({len(global_refs)} total)")

        # Build referee reports for all referees seen in actas + next match's referee
        all_referee_names: set[str] = set()
        for acta in actas:
            for ref in acta.referees:
                if ref.strip():
                    all_referee_names.add(ref.strip())

        # Always include next match's assigned referee even if not yet in actas
        next_match_data = all_data.get("next_match", {})
        for ref in next_match_data.get("referees", []):
            if ref.strip():
                all_referee_names.add(ref.strip())

        all_historic_refs = list(global_refs.values())
        referee_reports = {}
        for ref_name in all_referee_names:
            referee_reports[ref_name] = build_referee_intelligence(
                referee_name=ref_name,
                global_refs=all_historic_refs,
                competition=competition,
                our_team=team,
            )
        all_data["referee_reports"] = referee_reports
        print(f"   ✓ Referee reports built for {len(referee_reports)} referees")

    # Store metadata
    all_data["meta"] = {
        "team": team,
        "rival": rival,
        "season": season,
        "competition": competition,
        "group": group,
        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    # ── Export Data ──
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if output_file:
        out_path = Path(output_file)
    else:
        out_path = OUTPUT_DIR / "fcf_data.json"

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_data, f, cls=DataEncoder, ensure_ascii=False, indent=2)

    elapsed = time.time() - start_time

    print(f"\n{'=' * 50}")
    print(f"  Data exported to: {out_path}")
    print(f"  Total time: {elapsed:.1f}s")
    print(f"  HTTP requests: {client.stats['requests_made']}")
    print(f"  Cache hits: {client.stats['cache_hits']}")
    print(f"  Validation accuracy: {validation.accuracy_pct:.1f}%")
    print(f"{'=' * 50}\n")

    return all_data


def _url_involves_team(url: str, team_keyword: str) -> bool:
    """Check if an acta URL involves a specific team."""
    # Normalize: remove accents and special chars for matching
    url_lower = url.lower()
    # Try common keyword transformations
    keywords = [team_keyword]
    # "fundació acadèmia" -> "fundacio-academia"
    normalized = (
        team_keyword
        .replace("à", "a").replace("è", "e").replace("é", "e")
        .replace("í", "i").replace("ò", "o").replace("ó", "o")
        .replace("ú", "u").replace("ç", "c").replace("ñ", "n")
        .replace(" ", "-")
    )
    keywords.append(normalized)
    # Also try parts of the name
    parts = team_keyword.split()
    if len(parts) > 1:
        keywords.extend(parts)

    return any(kw in url_lower for kw in keywords)


def main():
    parser = argparse.ArgumentParser(
        description="FCF Scraper - Robust football data intelligence",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m scraper.main --team "Fundació Acadèmia" --rival "AE Prat"
  python -m scraper.main --team "Fundació Acadèmia" --full
  python -m scraper.main --team "Fundació Acadèmia" --season 2526 --competition segona-catalana --group grup-3
  python -m scraper.main --team "Fundació Acadèmia" --no-cache --verbose
        """,
    )
    parser.add_argument(
        "--team", default="Fundació Acadèmia",
        help="Your team name (substring match)",
    )
    parser.add_argument(
        "--rival", default=None,
        help="Rival team name for focused scouting",
    )
    parser.add_argument(
        "--full", action="store_true",
        help="Scrape ALL actas (slower but complete validation)",
    )
    parser.add_argument(
        "--no-cache", action="store_true",
        help="Disable HTTP cache (fresh data)",
    )
    parser.add_argument(
        "--max-actas", type=int, default=0,
        help="Limit number of actas to scrape (0 = no limit)",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true",
        help="Enable debug logging",
    )
    parser.add_argument(
        "--clear-cache", action="store_true",
        help="Clear HTTP cache and exit",
    )
    parser.add_argument(
        "--season", default=DEFAULT_SEASON,
        help=f"Season code (default: {DEFAULT_SEASON}, e.g. 2526 for 2025-2026)",
    )
    parser.add_argument(
        "--competition", default=DEFAULT_COMPETITION,
        help=f"Competition slug (default: {DEFAULT_COMPETITION})",
    )
    parser.add_argument(
        "--group", default=DEFAULT_GROUP,
        help=f"Group slug (default: {DEFAULT_GROUP}, e.g. grup-3)",
    )
    parser.add_argument(
        "--output", default=None,
        help="Output JSON file path (default: data/fcf_data.json)",
    )

    args = parser.parse_args()

    if args.clear_cache:
        client = FCFClient()
        client.clear_cache()
        print("Cache cleared.")
        return

    run_scraper(
        team=args.team,
        rival=args.rival,
        full_actas=args.full,
        use_cache=not args.no_cache,
        max_actas=args.max_actas,
        verbose=args.verbose,
        season=args.season,
        competition=args.competition,
        group=args.group,
        output_file=args.output,
    )


if __name__ == "__main__":
    main()
