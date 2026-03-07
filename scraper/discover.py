"""
FCF Discovery Module

Searches for a team across all FCF Futbol 11 competitions/groups
to automatically determine which league they're in.

Usage:
    python -m scraper.discover --team "Fundació Acadèmia"
    python -m scraper.discover --team "Racing Vallbona" --season 2526
    python -m scraper.discover --list-competitions
"""
import argparse
import io
import json
import sys
import time
import unicodedata
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from .http_client import FCFClient

# ─── All known FCF Futbol 11 competitions ─────────────────────────────────────
# Ordered from highest to lowest tier
COMPETITIONS = [
    {"slug": "divisio-honor",       "name": "Divisió d'Honor",          "tier": 1},
    {"slug": "superior-catalana",   "name": "Superior Catalana",         "tier": 2},
    {"slug": "premier-catalana",    "name": "Premier Catalana",          "tier": 3},
    {"slug": "preferent-catalana",  "name": "Preferent Catalana",        "tier": 4},
    {"slug": "primera-catalana",    "name": "Primera Catalana",          "tier": 5},
    {"slug": "segona-catalana",     "name": "Segona Catalana",           "tier": 6},
    {"slug": "tercera-catalana",    "name": "Tercera Catalana",          "tier": 7},
    {"slug": "quarta-catalana",     "name": "Quarta Catalana",           "tier": 8},
    {"slug": "regional",            "name": "Regional",                  "tier": 9},
    {"slug": "superior-regional",   "name": "Superior Regional",         "tier": 10},
    {"slug": "primera-regional",    "name": "Primera Regional",          "tier": 11},
    {"slug": "segunda-regional",    "name": "Segona Regional",           "tier": 12},
    {"slug": "tercera-regional",    "name": "Tercera Regional",          "tier": 13},
    {"slug": "quarta-regional",     "name": "Quarta Regional",           "tier": 14},
]

# Known groups per competition (discovered dynamically if not cached)
# Most competitions have grup-1 through grup-N; some are single group.
KNOWN_GROUPS = {
    "divisio-honor":      ["grup-unic"],
    "superior-catalana":  ["grup-unic"],
    "premier-catalana":   ["grup-unic"],
    "preferent-catalana": ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5"],
    "primera-catalana":   ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5", "grup-6", "grup-7", "grup-8"],
    "segona-catalana":    ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5", "grup-6", "grup-7", "grup-8"],
    "tercera-catalana":   ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5", "grup-6", "grup-7", "grup-8", "grup-9", "grup-10"],
    "quarta-catalana":    ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5", "grup-6", "grup-7", "grup-8", "grup-9", "grup-10"],
    "regional":           ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5"],
    "superior-regional":  ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5", "grup-6", "grup-7", "grup-8"],
    "primera-regional":   ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5", "grup-6", "grup-7", "grup-8", "grup-9", "grup-10"],
    "segunda-regional":   ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5", "grup-6", "grup-7", "grup-8", "grup-9", "grup-10"],
    "tercera-regional":   ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5", "grup-6", "grup-7", "grup-8", "grup-9", "grup-10"],
    "quarta-regional":    ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5", "grup-6", "grup-7", "grup-8", "grup-9", "grup-10"],
}

BASE = "https://www.fcf.cat"
SPORT = "futbol-11"


@dataclass
class TeamLocation:
    """Result of a team search — identifies where a team plays."""
    team_name: str          # Full official name from FCF
    team_keyword: str       # Search keyword used
    competition: str        # Competition slug
    competition_name: str   # Human-readable competition name
    group: str              # Group slug
    season: str             # Season code
    tier: int               # Competition tier (1 = highest)
    standings_url: str      # URL to the standings page


def _normalize(text: str) -> str:
    """Remove accents, punctuation, and lowercase for fuzzy matching."""
    text = "".join(
        c for c in unicodedata.normalize("NFD", text.lower())
        if unicodedata.category(c) != "Mn"
    )
    # Strip punctuation: apostrophes, dots, commas, etc.
    text = re.sub(r"['\.\-,()\"]+", '', text)
    return text.strip()


def _slugify(text: str) -> str:
    """Convert to a slug-like form for comparison."""
    return re.sub(r'\s+', '', _normalize(text))


def _keywords_from(text: str) -> list[str]:
    """Extract search keywords from a team name."""
    norm = _normalize(text)
    words = norm.split()
    # Filter common noise words
    stopwords = {"fc", "cf", "ce", "ud", "sd", "ad", "ae", "cd", "at", "de", "la", "el", "les", "els", "a", "s.d.", "sd", "fundacio", "academia"}
    meaningful = [w for w in words if w not in stopwords and len(w) > 2]
    return [norm] + meaningful


def _team_in_page(page_text: str, keywords: list[str]) -> bool:
    """Check if any keyword appears in the standings page text."""
    page_norm = _normalize(page_text)
    return any(kw in page_norm for kw in keywords)


def _extract_teams_from_standings(soup) -> list[str]:
    """Extract all team names from a standings page."""
    teams = []
    table = soup.find("table", class_="fcftable-e")
    if not table:
        return teams
    rows = table.find_all("tr")[1:]  # skip header
    for row in rows:
        cols = row.find_all("td")
        if len(cols) >= 3:
            name_cell = cols[2]
            name = name_cell.get_text(strip=True)
            if name:
                teams.append(name)
    return teams


def _find_best_match(team_names: list[str], keywords: list[str]) -> Optional[str]:
    """Find the best matching team name from a list."""
    best = None
    best_score = 0
    full_search_kw = keywords[0] # The first keyword is the fully normalized search string
    search_slug = _slugify(full_search_kw)
    
    for name in team_names:
        norm = _normalize(name)
        slug = _slugify(name)
        
        # Perfect direct match or slug match
        if search_slug in slug or slug in search_slug:
            return name
            
        score = sum(1 for kw in keywords[1:] if kw in norm)
        # Require more than just one common word to match if the string is long
        if score > best_score and score >= len(keywords[1:]) * 0.5:
            best_score = score
            best = name
            
    return best if best_score > 0 else None


def search_team(
    team_keyword: str,
    season: str = "2526",
    client: Optional[FCFClient] = None,
    verbose: bool = False,
    quick: bool = False,
) -> Optional[TeamLocation]:
    """
    Search for a team across all FCF Futbol 11 competitions.

    Args:
        team_keyword: Team name or keyword to search for
        season: Season code (e.g. "2526")
        client: FCFClient instance (creates one if not provided)
        verbose: Print progress
        quick: Only check top leagues (faster but may miss lower divisions)

    Returns:
        TeamLocation if found, None otherwise
    """
    if client is None:
        client = FCFClient(rate_limit_seconds=0.8, max_retries=2, use_cache=True, cache_ttl_seconds=3600)

    keywords = _keywords_from(team_keyword)

    competitions_to_check = COMPETITIONS
    if quick:
        competitions_to_check = [c for c in COMPETITIONS if c["tier"] <= 8]

    if verbose:
        print(f"\n🔍 Searching for '{team_keyword}' in season {season}...")
        print(f"   Keywords: {keywords}")
        print(f"   Checking {len(competitions_to_check)} competitions...\n")

    for comp in competitions_to_check:
        comp_slug = comp["slug"]
        groups = KNOWN_GROUPS.get(comp_slug, ["grup-1", "grup-2", "grup-3"])

        for group_slug in groups:
            url = f"{BASE}/classificacio/{season}/{SPORT}/{comp_slug}/{group_slug}"

            try:
                soup = client.fetch_soup(url)

                # Quick check: is the team mentioned anywhere on the page?
                page_text = soup.get_text()
                if not _team_in_page(page_text, keywords):
                    if verbose:
                        print(f"   ✗ {comp_slug}/{group_slug}")
                    continue

                # Extract team names from the standings table
                team_names = _extract_teams_from_standings(soup)
                if not team_names:
                    # Page exists but no table (competition may not have started / wrong group)
                    if verbose:
                        print(f"   ✗ {comp_slug}/{group_slug} (no standings table)")
                    continue

                # Find the best match
                matched_name = _find_best_match(team_names, keywords)
                if matched_name:
                    comp_name = comp["name"]
                    if verbose:
                        print(f"   ✅ FOUND: {matched_name}")
                        print(f"      Competition: {comp_name} ({comp_slug})")
                        print(f"      Group: {group_slug}")

                    return TeamLocation(
                        team_name=matched_name,
                        team_keyword=team_keyword,
                        competition=comp_slug,
                        competition_name=comp_name,
                        group=group_slug,
                        season=season,
                        tier=comp["tier"],
                        standings_url=url,
                    )
                else:
                    if verbose:
                        print(f"   ~ {comp_slug}/{group_slug} (keyword match but not in table)")

            except Exception as e:
                if verbose:
                    print(f"   ✗ {comp_slug}/{group_slug} — Error: {e}")
                continue

    if verbose:
        print(f"\n❌ Team '{team_keyword}' not found in any Futbol 11 competition for season {season}")

    return None


def list_competitions() -> list[dict]:
    """Return all known FCF Futbol 11 competitions."""
    return COMPETITIONS


def get_all_teams_in_competition(
    competition: str,
    group: str,
    season: str = "2526",
    client: Optional[FCFClient] = None,
) -> list[str]:
    """Get all team names from a specific competition/group standings."""
    if client is None:
        client = FCFClient(rate_limit_seconds=1.0, max_retries=2, use_cache=True, cache_ttl_seconds=3600)

    url = f"{BASE}/classificacio/{season}/{SPORT}/{competition}/{group}"
    soup = client.fetch_soup(url)
    return _extract_teams_from_standings(soup)


def main():
    parser = argparse.ArgumentParser(
        description="FCF Team Discovery — find which league your team is in",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m scraper.discover --team "Fundacio Academia"
  python -m scraper.discover --team "Racing Vallbona" --season 2526
  python -m scraper.discover --team "AE Prat" --verbose
  python -m scraper.discover --list-competitions
        """,
    )
    parser.add_argument("--team", default=None, help="Team name or keyword to search for")
    parser.add_argument("--season", default="2526", help="Season code (default: 2526)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show search progress")
    parser.add_argument("--quick", action="store_true", help="Only check top 8 tiers (faster)")
    parser.add_argument("--list-competitions", action="store_true", help="List all FCF Futbol 11 competitions")
    parser.add_argument("--json", action="store_true", help="Output result as JSON")
    args = parser.parse_args()

    if args.list_competitions:
        print("\n📋 FCF Futbol 11 Competitions\n")
        print(f"{'Tier':<5} {'Slug':<25} {'Name'}")
        print("-" * 60)
        for comp in COMPETITIONS:
            print(f"{comp['tier']:<5} {comp['slug']:<25} {comp['name']}")
        print()
        return

    if not args.team:
        parser.print_help()
        sys.exit(1)

    result = search_team(
        team_keyword=args.team,
        season=args.season,
        verbose=args.verbose or not args.json,
        quick=args.quick,
    )

    if result:
        if args.json:
            print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
        else:
            print(f"\n{'=' * 55}")
            print(f"  ✅ Team Found!")
            print(f"{'=' * 55}")
            print(f"  Official name : {result.team_name}")
            print(f"  Competition   : {result.competition_name}")
            print(f"  Slug          : {result.competition}")
            print(f"  Group         : {result.group}")
            print(f"  Season        : {result.season}")
            print(f"  Tier          : {result.tier}")
            print(f"  Standings URL : {result.standings_url}")
            print(f"{'=' * 55}\n")
            print("  To scrape this team, run:")
            print(f'  python -m scraper.main --team "{result.team_name}" \\')
            print(f'    --season {result.season} \\')
            print(f'    --competition {result.competition} \\')
            print(f'    --group {result.group}')
            print()
    else:
        if not args.json:
            print(f"\n❌ Team '{args.team}' not found in season {args.season}")
            print("   Try with --verbose to see the search progress")
            print("   Or try --season with a different year")
        else:
            print(json.dumps({"found": False, "team_keyword": args.team, "season": args.season}))
        sys.exit(1)


if __name__ == "__main__":
    main()
