#!/usr/bin/env python3
"""
scrape_all_groups.py
====================
Scrapes ALL competition/group combinations present in global_referees.json.
For each group, picks one representative team and runs a FULL scrape (all actas).
The output JSON is saved to data/teams/{slug}.json so the Next.js frontend
can serve complete stats for all 144 teams.

Usage:
    python scrape_all_groups.py                    # scrape all groups
    python scrape_all_groups.py --missing-only     # skip groups already fully scraped
    python scrape_all_groups.py --group seg-2/g3   # scrape specific group
    python scrape_all_groups.py --dry-run          # print commands without running

Requirements:
    pip install requests beautifulsoup4 lxml
    Run from the project root (where scraper/ directory is).
"""
import argparse
import json
import os
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).parent
DATA_DIR = ROOT / "data"
TEAMS_DIR = DATA_DIR / "teams"
GLOBAL_REFS = DATA_DIR / "global_referees.json"

# ─── Helpers ──────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    """Mirror of the JS slugify used in Next.js."""
    text = text.lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = text.strip()
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text


def count_actas_for_group(competition: str, group: str) -> int:
    """Count actas already available for a competition/group from JSON files."""
    best = 0
    for f in TEAMS_DIR.glob("*.json"):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            if data.get("meta", {}).get("competition") == competition and \
               data.get("meta", {}).get("group") == group:
                best = max(best, len(data.get("actas", [])))
        except Exception:
            pass
    return best


def get_groups_from_global_refs() -> dict:
    """Return {(competition, group): [team_names...]} from global_referees."""
    if not GLOBAL_REFS.exists():
        print(f"ERROR: {GLOBAL_REFS} not found")
        sys.exit(1)

    data = json.loads(GLOBAL_REFS.read_text(encoding="utf-8"))
    groups: dict = {}
    for m in data.values():
        key = (m.get("competition", ""), m.get("group", ""))
        if not key[0]:
            continue
        if key not in groups:
            groups[key] = []
        for team in [m.get("home_team"), m.get("away_team")]:
            if team and team not in groups[key]:
                groups[key].append(team)
    return groups


def pick_representative_team(teams: list[str]) -> str:
    """Pick the first alphabetically-sorted team as representative."""
    return sorted(teams)[0]


# ─── Groups to scrape ─────────────────────────────────────────────────────────

# Which groups to target and approximate jornadas per group
# (160 actas = full 20 rounds for 16-team group with 8 matches/round × 20 = 160)
FULL_ACTAS_THRESHOLD = 150  # consider "complete" if we have 150+ actas


def build_scrape_plan(missing_only: bool = False) -> list[dict]:
    """Return list of scrape tasks."""
    groups = get_groups_from_global_refs()
    tasks = []

    for (competition, group), teams in sorted(groups.items()):
        current_actas = count_actas_for_group(competition, group)
        is_complete = current_actas >= FULL_ACTAS_THRESHOLD

        if missing_only and is_complete:
            print(f"  SKIP {competition}/{group} - already complete ({current_actas} actas)")
            continue

        representative = pick_representative_team(teams)
        slug = slugify(representative)
        output_path = TEAMS_DIR / f"{slug}.json"

        tasks.append({
            "competition": competition,
            "group": group,
            "team": representative,
            "slug": slug,
            "output": str(output_path),
            "current_actas": current_actas,
            "is_complete": is_complete,
        })

    return tasks


def run_scrape(task: dict, dry_run: bool = False, no_cache: bool = False) -> bool:
    """Run the scraper for a single group. Returns True on success."""
    cmd = [
        sys.executable, "-m", "scraper.main",
        "--team", task["team"],
        "--competition", task["competition"],
        "--group", task["group"],
        "--full",
        "--output", task["output"],
        "--season", "2526",
    ]
    if no_cache:
        cmd.append("--no-cache")

    print(f"\n{'=' * 60}")
    print(f"  GROUP:  {task['competition']}/{task['group']}")
    print(f"  TEAM:   {task['team']}")
    print(f"  OUTPUT: {task['output']}")
    print(f"  CMD:    {' '.join(cmd)}")
    print(f"{'=' * 60}")

    if dry_run:
        return True

    result = subprocess.run(cmd, cwd=str(ROOT))
    success = result.returncode == 0

    if success:
        print(f"  [OK] SUCCESS: {task['competition']}/{task['group']}")
        # Rename output to a cleaner filename if needed
        _ensure_output_in_teams_dir(task)
    else:
        print(f"  [X] FAILED (exit code {result.returncode}): {task['competition']}/{task['group']}")

    return success


def _ensure_output_in_teams_dir(task: dict):
    """If scraper saved to fcf_data.json, copy to teams/ dir with correct name."""
    output_path = Path(task["output"])
    if not output_path.exists():
        # Maybe scraper saved to default location
        default_out = DATA_DIR / "fcf_data.json"
        if default_out.exists():
            TEAMS_DIR.mkdir(parents=True, exist_ok=True)
            import shutil
            shutil.copy2(default_out, output_path)
            print(f"  Copied fcf_data.json -> {output_path.name}")


def also_update_global_refs():
    """Optionally trigger global_referees rebuild for updated data."""
    print("\n" + "=" * 60)
    print("  Updating global_referees.json...")
    print("  Run: python -m scraper.build_referee_db --all-referee-comps")
    print("  (Not running automatically to avoid long wait)")
    print("=" * 60)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Batch scrape all competition/group combinations for FutLab",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Scrape ALL groups (full rebuild):
  python scrape_all_groups.py

  # Only scrape groups with missing/incomplete data:
  python scrape_all_groups.py --missing-only

  # Preview what would run without executing:
  python scrape_all_groups.py --dry-run

  # Force fresh HTTP requests (no cache):
  python scrape_all_groups.py --missing-only --no-cache

After running, restart the Next.js dev server to pick up new team data.
        """,
    )
    parser.add_argument("--missing-only", action="store_true",
                        help="Skip groups that already have 150+ actas")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print commands without executing them")
    parser.add_argument("--no-cache", action="store_true",
                        help="Disable HTTP cache (force fresh requests)")
    parser.add_argument("--competition", default=None,
                        help="Limit to specific competition (e.g. 'segunda-catalana')")
    parser.add_argument("--group", default=None,
                        help="Limit to specific group (e.g. 'grup-3')")
    args = parser.parse_args()

    TEAMS_DIR.mkdir(parents=True, exist_ok=True)

    # Show current state
    print("\nFutLab Batch Scraper")
    print("=" * 60)
    groups = get_groups_from_global_refs()
    print(f"Found {len(groups)} groups in global_referees.json:\n")
    for (comp, grp), teams in sorted(groups.items()):
        actas = count_actas_for_group(comp, grp)
        status = "[OK] COMPLETE" if actas >= FULL_ACTAS_THRESHOLD else (f"[~] PARTIAL ({actas})" if actas > 0 else "[X] MISSING")
        print(f"  {comp}/{grp:<10} {status}  ({len(teams)} teams)")

    print()

    # Build plan
    plan = build_scrape_plan(missing_only=args.missing_only)

    # Filter by competition/group if specified
    if args.competition:
        plan = [t for t in plan if args.competition in t["competition"]]
    if args.group:
        plan = [t for t in plan if args.group == t["group"]]

    if not plan:
        print("Nothing to scrape. All groups complete!")
        return

    print(f"\nScraping {len(plan)} group(s):\n")
    for t in plan:
        status = "UPDATE" if t["current_actas"] > 0 else "NEW"
        print(f"  [{status}] {t['competition']}/{t['group']} -> {t['team']}")

    if args.dry_run:
        print("\n[DRY RUN] Commands that would be executed:\n")

    # Run scrapes
    results = {"success": 0, "failed": 0}
    for i, task in enumerate(plan, 1):
        print(f"\n[{i}/{len(plan)}] Scraping {task['competition']}/{task['group']}...")
        ok = run_scrape(task, dry_run=args.dry_run, no_cache=args.no_cache)
        if ok:
            results["success"] += 1
        else:
            results["failed"] += 1

    # Summary
    print(f"\n{'=' * 60}")
    print(f"  DONE: {results['success']} succeeded, {results['failed']} failed")
    print(f"  Team JSON files in: {TEAMS_DIR}")
    if not args.dry_run:
        also_update_global_refs()
        print("\n  -> Restart the Next.js dev server to see the new data.")
    print("=" * 60)


if __name__ == "__main__":
    main()
