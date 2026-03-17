#!/usr/bin/env python3
"""
scrape_all_beta_teams.py
========================
Updates ONE representative JSON per group for Segona + Tercera Catalana.

Thanks to cross-group lookup in buildTeamReport(), a single up-to-date JSON
per group is enough for ALL teams in that group to get:
  - Goal timing by minute (goals_by_period)
  - Player stats, match actas, standings

This means only 18 scrapes (8 Seconda + 10 Tercera) instead of 160+.

Usage:
    python scrape_all_beta_teams.py            # update stale groups
    python scrape_all_beta_teams.py --force    # re-scrape all groups
    python scrape_all_beta_teams.py --dry-run  # preview only
    python scrape_all_beta_teams.py --push-stats  # also push player stats to Supabase
"""
import argparse
import json
import re
import subprocess
import sys
import unicodedata
from datetime import date
from pathlib import Path
from typing import Optional

import io as _io
if sys.platform == "win32":
    sys.stdout = _io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = _io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT      = Path(__file__).parent
TEAMS_DIR = ROOT / "data" / "teams"
SEASON    = "2526"
BASE      = "https://www.fcf.cat"
SPORT     = "futbol-11"

# One JSON per group covers ALL teams in that group via cross-group lookup.
BETA_GROUPS = {
    "segona-catalana":  ["grup-1","grup-2","grup-3","grup-4","grup-5","grup-6","grup-7","grup-8"],
    "tercera-catalana": ["grup-1","grup-2","grup-3","grup-4","grup-5","grup-6","grup-7","grup-8","grup-9","grup-10"],
}


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9\s\-]", "", text).strip()
    return re.sub(r"[\s-]+", "-", text)


def find_group_json(competition: str, group: str) -> Optional[Path]:
    """Find the existing JSON for this competition/group with most actas."""
    best: Optional[Path] = None
    best_actas = -1
    for f in TEAMS_DIR.glob("*.json"):
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
            meta = d.get("meta", {})
            if meta.get("competition") == competition and meta.get("group") == group:
                n = len(d.get("actas", []))
                if n > best_actas:
                    best_actas = n
                    best = f
        except Exception:
            pass
    return best


def is_stale(json_path: Path) -> bool:
    """True if next_match has passed or is missing."""
    try:
        d = json.loads(json_path.read_text(encoding="utf-8"))
        nm = d.get("next_match") or {}
        nm_date = nm.get("date", "")
        if nm_date:
            dd, mm, yy = map(int, nm_date.split("-"))
            return date(yy, mm, dd) < date.today()
        return True
    except Exception:
        return True


def fetch_first_team(competition: str, group: str) -> Optional[str]:
    try:
        from scraper.http_client import FCFClient
        from scraper.standings import scrape_standings
        url = f"{BASE}/classificacio/{SEASON}/{SPORT}/{competition}/{group}"
        client = FCFClient(rate_limit_seconds=0.5, max_retries=2, use_cache=True)
        rows = scrape_standings(client, url)
        return rows[0].name if rows else None
    except Exception as e:
        print(f"    [!] standings error {competition}/{group}: {e}")
        return None


def run_scrape(team: str, competition: str, group: str, output: str, dry_run: bool) -> bool:
    cmd = [sys.executable, "-m", "scraper.main",
           "--team", team, "--competition", competition,
           "--group", group, "--update", "--output", output, "--season", SEASON]
    if dry_run:
        print(f"    DRY: {' '.join(cmd)}")
        return True
    return subprocess.run(cmd, cwd=str(ROOT)).returncode == 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--push-stats", action="store_true")
    parser.add_argument("--competition", choices=list(BETA_GROUPS.keys()))
    args = parser.parse_args()

    comps = {args.competition: BETA_GROUPS[args.competition]} if args.competition else BETA_GROUPS

    print(f"\nNeoScout Beta — Group Coverage Updater")
    print("=" * 55)
    print(f"Target: {sum(len(v) for v in comps.values())} groups | Force: {args.force}\n")

    plan = []
    skip = []

    for comp, groups in comps.items():
        for grp in groups:
            existing = find_group_json(comp, grp)
            if existing and not args.force and not is_stale(existing):
                d = json.loads(existing.read_text(encoding="utf-8"))
                nm_date = (d.get("next_match") or {}).get("date", "")
                skip.append(f"{comp}/{grp} → {existing.name} (next: {nm_date})")
                continue
            # Need scrape
            team = None
            output = None
            if existing:
                meta = json.loads(existing.read_text(encoding="utf-8")).get("meta", {})
                team = meta.get("team", "")
                output = str(existing)
            if not team:
                print(f"  Fetching standings {comp}/{grp}...", end=" ", flush=True)
                team = fetch_first_team(comp, grp)
                print(team or "NOT FOUND")
            if not team:
                continue
            if not output:
                output = str(TEAMS_DIR / f"{slugify(team)}.json")
            plan.append({"comp": comp, "grp": grp, "team": team, "output": output})

    print(f"  Skip ({len(skip)} up-to-date):")
    for s in skip:
        print(f"    OK  {s}")

    print(f"\n  Scrape ({len(plan)} stale/new groups):")
    for t in plan:
        print(f"    [{t['comp']}/{t['grp']}] {t['team']}")

    if not plan:
        print("\n  All groups up to date!")
        return

    print(f"\n  Estimated: ~{len(plan)*3} min\n")

    ok = fail = 0
    for i, t in enumerate(plan, 1):
        print(f"\n[{i}/{len(plan)}] {t['comp']}/{t['grp']} — {t['team']}")
        if run_scrape(t["team"], t["comp"], t["grp"], t["output"], args.dry_run):
            ok += 1; print("  [OK]")
        else:
            fail += 1; print("  [FAILED]")

    print(f"\n{'='*55}")
    print(f"  DONE  {ok} ok | {fail} failed | {len(skip)} skipped")

    if args.push_stats and not args.dry_run and ok > 0:
        print("\nPushing player stats to Supabase...")
        subprocess.run([sys.executable, "push_player_stats.py"], cwd=str(ROOT))

    if not args.dry_run and ok > 0:
        print("\nNext: git add data/teams/ && git commit -m 'data: update beta competition groups' && git push\n")


if __name__ == "__main__":
    main()
