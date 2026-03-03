"""
FCF Scraper - Main Orchestrator

Usage:
    python -m scraper.main --team "Fundació Acadèmia" --rival "AE Prat"
    python -m scraper.main --team "Fundació Acadèmia" --full
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
from dataclasses import asdict
from pathlib import Path

# Fix Windows console encoding for Unicode output
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from .http_client import FCFClient
from .models import DataEncoder, ValidationReport
from .standings import scrape_standings
from .scorers import scrape_scorers, compute_scorers_from_actas
from .sanctions import scrape_sanctions
from .calendar_results import scrape_calendar, get_acta_urls_from_calendar
from .fair_play import scrape_fair_play
from .actas import scrape_all_actas
from .validator import validate_all
from .intelligence import build_team_intelligence, compute_conditional_insights

logger = logging.getLogger("fcf_scraper")

# ─── URL Configuration ────────────────────────────────
BASE = "https://www.fcf.cat"
SEASON = "2526"
SPORT = "futbol-11"
COMPETITION = "segona-catalana"
GROUP = "grup-3"

URLS = {
    "standings": f"{BASE}/classificacio/{SEASON}/{SPORT}/{COMPETITION}/{GROUP}",
    "calendar": f"{BASE}/calendari/{SEASON}/{SPORT}/{COMPETITION}/{GROUP}",
    "results": f"{BASE}/resultats/{SEASON}/{SPORT}/{COMPETITION}/{GROUP}",
    "scorers": f"{BASE}/golejadors/{SEASON}/{SPORT}/{COMPETITION}/{GROUP}",
    "sanctions": f"{BASE}/sancions/{SEASON}/{SPORT}/{COMPETITION}/{GROUP}",
    "fair_play": f"{BASE}/jocnet/{SEASON}/{SPORT}/{COMPETITION}/{GROUP}",
}

OUTPUT_DIR = Path(__file__).parent.parent / "data"


def setup_logging(verbose: bool = False):
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )


def progress_callback(current: int, total: int, url: str):
    pct = (current / total) * 100
    bar_len = 30
    filled = int(bar_len * current / total)
    bar = "█" * filled + "░" * (bar_len - filled)
    print(f"\r  [{bar}] {pct:5.1f}% ({current}/{total}) ", end="", flush=True)


def run_scraper(
    team: str = "Fundació Acadèmia",
    rival: str | None = None,
    full_actas: bool = False,
    use_cache: bool = True,
    max_actas: int = 0,
    verbose: bool = False,
) -> dict:
    """
    Main scraping orchestration.
    Returns a dict with all scraped and validated data.
    """
    setup_logging(verbose)
    start_time = time.time()

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
    print(f"║  Season:  {SEASON:<39}║")
    print(f"║  Group:   {COMPETITION} / {GROUP:<23}║")
    print("╚══════════════════════════════════════════════════╝\n")

    all_data = {}

    # ── Step 1: Standings ──
    print("📊 [1/7] Scraping standings (classificació)...")
    try:
        standings = scrape_standings(client, URLS["standings"])
        all_data["standings"] = [asdict(s) for s in standings]
        print(f"   ✓ {len(standings)} teams found")
    except Exception as e:
        logger.error(f"Failed to scrape standings: {e}")
        standings = []
        print(f"   ✗ Error: {e}")

    # ── Step 2: Scorers ──
    print("⚽ [2/7] Scraping top scorers (golejadors)...")
    try:
        scorers = scrape_scorers(client, URLS["scorers"])
        all_data["scorers"] = [asdict(s) for s in scorers]
        print(f"   ✓ {len(scorers)} scorers found")
    except Exception as e:
        logger.error(f"Failed to scrape scorers: {e}")
        scorers = []
        print(f"   ✗ Error: {e}")

    # ── Step 3: Sanctions ──
    print("🟨 [3/7] Scraping sanctions (sancions)...")
    try:
        sanctions = scrape_sanctions(client, URLS["sanctions"])
        all_data["sanctions"] = [asdict(s) for s in sanctions]
        print(f"   ✓ {len(sanctions)} sanctions found")
    except Exception as e:
        logger.error(f"Failed to scrape sanctions: {e}")
        sanctions = []
        print(f"   ✗ Error: {e}")

    # ── Step 4: Fair Play ──
    print("🤝 [4/7] Scraping fair play (joc net)...")
    try:
        fair_play = scrape_fair_play(client, URLS["fair_play"])
        all_data["fair_play"] = [asdict(f) for f in fair_play]
        print(f"   ✓ {len(fair_play)} entries found")
    except Exception as e:
        logger.error(f"Failed to scrape fair play: {e}")
        fair_play = []
        print(f"   ✗ Error: {e}")

    # ── Step 5: Calendar & Results ──
    print("📅 [5/7] Scraping calendar & results...")
    try:
        matches = scrape_calendar(client, URLS["calendar"])
        all_data["matches"] = [asdict(m) for m in matches]
        print(f"   ✓ {len(matches)} matches found")
    except Exception as e:
        logger.error(f"Failed to scrape calendar: {e}")
        matches = []
        print(f"   ✗ Error: {e}")

    # ── Step 6: Actas (Match Reports) ──
    print("📋 [6/7] Scraping match reports (actas)...")
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

    # ── Step 7: Cross-Validation ──
    print("\n🔍 [7/7] Running cross-validation...")
    validation = validate_all(
        standings=standings,
        matches=matches,
        actas=actas,
        scorers=scorers,
        sanctions=sanctions,
        fair_play=fair_play,
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

    # ── Export Data ──
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_file = OUTPUT_DIR / "fcf_data.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_data, f, cls=DataEncoder, ensure_ascii=False, indent=2)

    elapsed = time.time() - start_time

    print(f"\n{'=' * 50}")
    print(f"  Data exported to: {output_file}")
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
    )


if __name__ == "__main__":
    main()
