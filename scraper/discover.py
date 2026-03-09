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
# Ordered from highest to lowest tier. Slugs verified against fcf.cat/classificacio.
# Cups, promotions and recreational competitions are excluded.
COMPETITIONS = [
    # ── Adult / Amateur ──────────────────────────────────────────────────────
    {"slug": "tercera-federacio",          "name": "Tercera Federació",           "tier": 1,  "category": "adult"},
    {"slug": "lliga-elit",                 "name": "Lliga Elit",                  "tier": 2,  "category": "adult"},
    {"slug": "primera-catalana",           "name": "Primera Catalana",            "tier": 3,  "category": "adult"},
    {"slug": "segona-catalana",            "name": "Segona Catalana",             "tier": 4,  "category": "adult"},
    {"slug": "tercera-catalana",           "name": "Tercera Catalana",            "tier": 5,  "category": "adult"},
    {"slug": "quarta-catalana",            "name": "Quarta Catalana",             "tier": 6,  "category": "adult"},
    # ── Juvenil ──────────────────────────────────────────────────────────────
    {"slug": "divisio-honor-juvenil",      "name": "Divisió d'Honor Juvenil",     "tier": 10, "category": "juvenil"},
    {"slug": "lliga-nacional-juvenil",     "name": "Lliga Nacional Juvenil",      "tier": 11, "category": "juvenil"},
    {"slug": "preferent-juvenil",          "name": "Preferent Juvenil",           "tier": 12, "category": "juvenil"},
    {"slug": "primera-divisio-juvenil",    "name": "Juvenil Primera Divisió",     "tier": 13, "category": "juvenil"},
    {"slug": "segona-catalana-juvenil",    "name": "Juvenil Segona Divisió",      "tier": 14, "category": "juvenil"},
    {"slug": "tercera-catalana-juvenil",   "name": "Juvenil Tercera Divisió",     "tier": 15, "category": "juvenil"},
    # ── Cadet S16 ────────────────────────────────────────────────────────────
    {"slug": "divisio-honor-cadet-s16",    "name": "Divisió d'Honor Cadet S16",   "tier": 20, "category": "cadet-s16"},
    {"slug": "preferent-cadet-s16",        "name": "Preferent Cadet S16",         "tier": 21, "category": "cadet-s16"},
    {"slug": "cadet-primera-divisio-s16",  "name": "Cadet Primera Divisió S16",   "tier": 22, "category": "cadet-s16"},
    {"slug": "cadet-segona-divisio-s16",   "name": "Cadet Segona Divisió S16",    "tier": 23, "category": "cadet-s16"},
    # ── Cadet S15 ────────────────────────────────────────────────────────────
    {"slug": "divisio-honor-cadet-s15",    "name": "Divisió d'Honor Cadet S15",   "tier": 25, "category": "cadet-s15"},
    {"slug": "preferent-cadet-s15",        "name": "Preferent Cadet S15",         "tier": 26, "category": "cadet-s15"},
    {"slug": "cadet-primera-divisio-s15",  "name": "Cadet Primera Divisió S15",   "tier": 27, "category": "cadet-s15"},
    {"slug": "cadet-segona-divisio-s15",   "name": "Cadet Segona Divisió S15",    "tier": 28, "category": "cadet-s15"},
    # ── Infantil S14 ─────────────────────────────────────────────────────────
    {"slug": "divisio-honor-infantil-s14", "name": "Divisió d'Honor Infantil S14","tier": 30, "category": "infantil-s14"},
    {"slug": "preferent-infantil-s14",     "name": "Preferent Infantil S14",      "tier": 31, "category": "infantil-s14"},
    {"slug": "primera-divisio-infantil-s14","name": "Infantil Primera Divisió S14","tier": 32, "category": "infantil-s14"},
    # ── Infantil S13 ─────────────────────────────────────────────────────────
    {"slug": "divisio-honor-infantil-s13", "name": "Divisió d'Honor Infantil S13","tier": 35, "category": "infantil-s13"},
    {"slug": "preferent-infantil-s13",     "name": "Preferent Infantil S13",      "tier": 36, "category": "infantil-s13"},
    {"slug": "infantil-primera-divisio-s13","name": "Infantil Primera Divisió S13","tier": 37, "category": "infantil-s13"},
]

# ─── Competitions where referee data is scraped from actas ────────────────────
# Adult: Primera Catalana and above.
# Juvenil: Preferent and above.
# Cadet/Infantil: Preferent and Divisió d'Honor only.
REFEREE_COMPETITIONS = {
    "tercera-federacio",
    "lliga-elit",
    "primera-catalana",
    "segona-catalana",
    # Juvenil
    "divisio-honor-juvenil",
    "lliga-nacional-juvenil",
    "preferent-juvenil",
    # Cadet S16
    "divisio-honor-cadet-s16",
    "preferent-cadet-s16",
    # Cadet S15
    "divisio-honor-cadet-s15",
    "preferent-cadet-s15",
    # Infantil S14
    "divisio-honor-infantil-s14",
    "preferent-infantil-s14",
    # Infantil S13
    "divisio-honor-infantil-s13",
    "preferent-infantil-s13",
}

# ─── Known groups per competition ─────────────────────────────────────────────
# DH / Lliga / Nacional competitions → single group (grup-unic).
# Other competitions → multiple groups; scrapers skip gracefully if empty.
KNOWN_GROUPS = {
    # Adult
    "tercera-federacio":           ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5", "grup-6", "grup-7"],
    "lliga-elit":                  ["grup-unic"],
    "primera-catalana":            ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5", "grup-6", "grup-7", "grup-8"],
    "segona-catalana":             ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5", "grup-6", "grup-7", "grup-8"],
    "tercera-catalana":            ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5", "grup-6", "grup-7", "grup-8", "grup-9", "grup-10"],
    "quarta-catalana":             ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5", "grup-6", "grup-7", "grup-8", "grup-9", "grup-10"],
    # Juvenil
    "divisio-honor-juvenil":       ["grup-unic"],
    "lliga-nacional-juvenil":      ["grup-unic"],
    "preferent-juvenil":           ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5", "grup-6"],
    "primera-divisio-juvenil":     ["grup-1", "grup-2"],
    "segona-catalana-juvenil":     ["grup-1"],
    "tercera-catalana-juvenil":    ["grup-1"],
    # Cadet S16
    "divisio-honor-cadet-s16":     ["grup-unic"],
    "preferent-cadet-s16":         ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5", "grup-6"],
    "cadet-primera-divisio-s16":   ["grup-1"],
    "cadet-segona-divisio-s16":    ["grup-1"],
    # Cadet S15
    "divisio-honor-cadet-s15":     ["grup-unic"],
    "preferent-cadet-s15":         ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5"],
    "cadet-primera-divisio-s15":   ["grup-1"],
    "cadet-segona-divisio-s15":    ["grup-1"],
    # Infantil S14
    "divisio-honor-infantil-s14":  ["grup-unic"],
    "preferent-infantil-s14":      ["grup-1", "grup-2", "grup-3", "grup-4", "grup-5"],
    "primera-divisio-infantil-s14":["grup-1"],
    # Infantil S13
    "divisio-honor-infantil-s13":  ["grup-unic"],
    "preferent-infantil-s13":      ["grup-1", "grup-2", "grup-3"],
    "infantil-primera-divisio-s13":["grup-1"],
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
