"""
Build Fields Database for all Segona Catalana groups.

Iterates all 8 groups, extracts teams + venue names from standings
and actas, and produces a comprehensive fields_database.json.

Usage:
    python -m scraper.build_fields_db
    python -m scraper.build_fields_db --verbose
    python -m scraper.build_fields_db --groups 3      # only grup-3
    python -m scraper.build_fields_db --groups 1,2,3   # specific groups
"""
import argparse
import io
import json
import logging
import re
import sys
import time
import unicodedata
from pathlib import Path
from typing import Optional

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from .http_client import FCFClient
from .standings import scrape_standings
from .actas import scrape_acta

logger = logging.getLogger("fcf_scraper")

BASE = "https://www.fcf.cat"
SPORT = "futbol-11"
COMPETITION = "segona-catalana"
SEASON = "2526"
ALL_GROUPS = [f"grup-{i}" for i in range(1, 9)]

OUTPUT_DIR = Path(__file__).parent.parent / "data"


def _normalize(text: str) -> str:
    """Remove accents and lowercase for matching."""
    return "".join(
        c for c in unicodedata.normalize("NFD", text.lower())
        if unicodedata.category(c) != "Mn"
    ).strip()


def _extract_venue_from_acta_page(client: FCFClient, acta_url: str) -> str:
    """Quickly extract just the venue from an acta page without full parsing."""
    try:
        soup = client.fetch_soup(acta_url)
        for table in soup.find_all(class_=["acta-table", "acta-table2"]):
            rows = table.find_all("tr")
            if not rows:
                continue
            header = rows[0].get_text(strip=True)
            if "Estadi" in header or "stadi" in header.lower():
                venue_text = table.get_text(" ", strip=True)
                venue_text = venue_text.replace("Estadi", "").replace("Com arribar", "").strip()
                return venue_text
    except Exception as e:
        logger.warning(f"Failed to extract venue from {acta_url}: {e}")
    return ""


def _parse_calendar_actas(client: FCFClient, group: str):
    """Parse the calendar page once and return all acta links with their home/away slugs."""
    calendar_url = f"{BASE}/calendari/{SEASON}/{SPORT}/{COMPETITION}/{group}"
    try:
        soup = client.fetch_soup(calendar_url)
    except Exception as e:
        logger.warning(f"Failed to fetch calendar for {group}: {e}")
        return {}

    acta_links = soup.find_all("a", href=re.compile(r"/acta/"))

    # Build mapping: team_slug -> [home_acta_urls]
    home_actas = {}

    for link in acta_links:
        href = link.get("href", "")
        if not href:
            continue
        full_url = href if href.startswith("http") else f"{BASE}{href}"

        # URL pattern: /acta/.../2cat/HOME-SLUG/2cat/AWAY-SLUG
        parts = full_url.rstrip("/").split("/")
        region_indices = [i for i, p in enumerate(parts)
                          if re.match(r"^[0-9]cat$", p.lower())]

        if len(region_indices) >= 2:
            home_idx = region_indices[0]
            if home_idx + 1 < len(parts):
                home_slug = parts[home_idx + 1].lower()
                if home_slug not in home_actas:
                    home_actas[home_slug] = []
                home_actas[home_slug].append(full_url)

    return home_actas


def build_fields_database(
    groups: Optional[list] = None,
    verbose: bool = False,
    use_cache: bool = False,
) -> dict:
    """Build the complete fields database."""
    if groups is None:
        groups = ALL_GROUPS

    client = FCFClient(
        rate_limit_seconds=1.0,
        max_retries=2,
        use_cache=use_cache,
        cache_ttl_seconds=7200,  # 2h cache
    )

    database = {
        "competition": "Segona Catalana",
        "season": SEASON,
        "groups": {},
        "last_updated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    total_teams = 0
    total_venues_found = 0

    print("\n╔══════════════════════════════════════════════════╗")
    print("║   FIELDS DATABASE BUILDER — Segona Catalana     ║")
    print("╠══════════════════════════════════════════════════╣")
    print(f"║  Groups: {', '.join(groups):<40}║")
    print("╚══════════════════════════════════════════════════╝\n")

    for group in groups:
        print(f"\n{'─' * 50}")
        print(f"📋 Processing {group.upper()}...")
        print(f"{'─' * 50}")

        # Step 1: Get all teams from standings
        standings_url = f"{BASE}/classificacio/{SEASON}/{SPORT}/{COMPETITION}/{group}"
        try:
            standings = scrape_standings(client, standings_url)
        except Exception as e:
            print(f"   ✗ Failed to scrape standings for {group}: {e}")
            continue

        teams_data = []
        print(f"   ✓ {len(standings)} teams found")

        # Step 2: Parse calendar once for this group
        home_actas_map = _parse_calendar_actas(client, group)
        print(f"   ✓ Calendar parsed: {sum(len(v) for v in home_actas_map.values())} home acta URLs")

        # Step 3: For each team, find their home venue from actas
        for i, team in enumerate(standings):
            team_entry = {
                "name": team.name,
                "slug": team.team_slug,
                "group": group,
                "position": team.position,
                "fcf_venue": None,
                "city": None,
                "length_m": None,
                "width_m": None,
                "surface": None,
                "confirmed": False,
            }

            # Look up home acta URLs from pre-parsed calendar
            if team.team_slug:
                home_urls = home_actas_map.get(team.team_slug.lower(), [])
                if home_urls:
                    venue = _extract_venue_from_acta_page(client, home_urls[0])
                    if venue:
                        team_entry["fcf_venue"] = venue
                        total_venues_found += 1
                        if verbose:
                            print(f"   ✓ {team.name} → {venue}")
                    else:
                        if verbose:
                            print(f"   ⚠ {team.name} — venue not found in acta")
                else:
                    if verbose:
                        print(f"   ⚠ {team.name} — no home acta URL found")
            else:
                if verbose:
                    print(f"   ⚠ {team.name} — no team slug")

            teams_data.append(team_entry)
            total_teams += 1

            # Progress
            pct = ((i + 1) / len(standings)) * 100
            print(f"\r   [{i+1}/{len(standings)}] {pct:.0f}%  ", end="", flush=True)

        print(f"\n   ✓ {group}: {len(teams_data)} teams, "
              f"{sum(1 for t in teams_data if t['fcf_venue'])} venues found")

        database["groups"][group] = {
            "teams": teams_data,
        }

    # Summary
    print(f"\n{'=' * 50}")
    print(f"  Total teams: {total_teams}")
    print(f"  Venues found: {total_venues_found}")
    print(f"  Missing venues: {total_teams - total_venues_found}")
    print(f"{'=' * 50}\n")

    return database


def main():
    parser = argparse.ArgumentParser(
        description="Build fields database for Segona Catalana",
    )
    parser.add_argument(
        "--groups", default=None,
        help="Comma-separated group numbers (e.g. '1,2,3'). Default: all 8.",
    )
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument(
        "--output", default=None,
        help="Output file path (default: data/fields_database.json)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    groups = None
    if args.groups:
        groups = [f"grup-{g.strip()}" for g in args.groups.split(",")]

    database = build_fields_database(groups=groups, verbose=args.verbose)

    # Save
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = Path(args.output) if args.output else OUTPUT_DIR / "fields_database.json"

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(database, f, ensure_ascii=False, indent=2)

    print(f"  📁 Saved to: {out_path}")

    # Also copy to procoach/src/data for the frontend
    frontend_path = Path(__file__).parent.parent / "procoach" / "src" / "data" / "fields_database.json"
    frontend_path.parent.mkdir(parents=True, exist_ok=True)
    with open(frontend_path, "w", encoding="utf-8") as f:
        json.dump(database, f, ensure_ascii=False, indent=2)
    print(f"  📁 Copied to: {frontend_path}")


if __name__ == "__main__":
    main()
