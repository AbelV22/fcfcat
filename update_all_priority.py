#!/usr/bin/env python3
import io as _io, sys as _sys
if _sys.platform == "win32":
    _sys.stdout = _io.TextIOWrapper(_sys.stdout.buffer, encoding="utf-8", errors="replace")
    _sys.stderr = _io.TextIOWrapper(_sys.stderr.buffer, encoding="utf-8", errors="replace")
"""
update_all_priority.py
======================
Ensures ALL groups for the priority competitions have up-to-date team JSON files
with next_match pointing to the upcoming jornada.

Priority competitions:
  - segona-catalana        (grup-1 .. grup-6)
  - tercera-catalana       (grup-1 .. grup-10)
  - preferent-juvenils     (grup-1 .. grup-4)
  - juvenil-primera-divisio (grup-1 .. grup-15)

Usage:
    python update_all_priority.py            # update all stale priority groups
    python update_all_priority.py --dry-run  # preview without executing
    python update_all_priority.py --force    # re-run all even if up to date
"""
import argparse
import json
import re
import subprocess
import sys
import unicodedata
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

ROOT      = Path(__file__).parent
DATA_DIR  = ROOT / "data"
TEAMS_DIR = DATA_DIR / "teams"
SEASON    = "2526"

# ── Priority competitions & known groups ─────────────────────────────────────
PRIORITY = {
    # Confirmed groups for 2025/26 season
    "segona-catalana":          ["grup-1","grup-2","grup-3","grup-4","grup-5","grup-6"],
    "tercera-catalana":         ["grup-1","grup-2","grup-3","grup-4","grup-5","grup-6","grup-7","grup-8","grup-9","grup-10"],
    "preferent-juvenils":       ["grup-1","grup-2","grup-3","grup-4"],
    "juvenil-primera-divisio":  ["grup-1","grup-2","grup-3","grup-4","grup-5","grup-6","grup-7","grup-8","grup-9","grup-10","grup-11","grup-12","grup-13","grup-14","grup-15"],
}

SPORT = "futbol-11"
BASE  = "https://www.fcf.cat"

# ── Helpers ──────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    text = text.lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9\s\-\']", "", text)
    text = text.strip()
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text


def is_past_or_missing(date_str: Optional[str]) -> bool:
    if not date_str:
        return True
    try:
        d, m, y = map(int, date_str.split("-"))
        return date(y, m, d) < date.today()
    except Exception:
        return True


def find_existing_json_for_group(competition: str, group: str) -> Optional[Path]:
    """Return path of an existing JSON file for this competition/group, or None."""
    for f in TEAMS_DIR.glob("*.json"):
        try:
            raw = json.loads(f.read_text(encoding="utf-8"))
            meta = raw.get("meta", {})
            if meta.get("competition") == competition and meta.get("group") == group:
                return f
        except Exception:
            pass
    return None


def get_next_match_date(json_path: Path) -> Optional[str]:
    try:
        raw = json.loads(json_path.read_text(encoding="utf-8"))
        nm = raw.get("next_match") or {}
        return nm.get("date")
    except Exception:
        return None


def fetch_first_team(competition: str, group: str) -> Optional[str]:
    """Fetch standings page and return the first team name using the project's scraper stack."""
    try:
        from scraper.http_client import FCFClient
        from scraper.standings import scrape_standings
        url = f"{BASE}/classificacio/{SEASON}/{SPORT}/{competition}/{group}"
        client = FCFClient(rate_limit_seconds=0.5, max_retries=2, use_cache=True)
        rows = scrape_standings(client, url)
        if rows:
            return rows[0].name
    except Exception as e:
        print(f"    [!] Could not fetch standings {competition}/{group}: {e}")
    return None


def run_update(team: str, competition: str, group: str, output: str, dry_run: bool) -> bool:
    cmd = [
        sys.executable, "-m", "scraper.main",
        "--team",        team,
        "--competition", competition,
        "--group",       group,
        "--update",
        "--output",      output,
        "--season",      SEASON,
    ]
    print(f"    CMD: {' '.join(cmd)}")
    if dry_run:
        return True
    result = subprocess.run(cmd, cwd=str(ROOT))
    return result.returncode == 0


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Update all priority competition groups")
    parser.add_argument("--dry-run", action="store_true", help="Print commands without executing")
    parser.add_argument("--force",   action="store_true", help="Re-run even if already up to date")
    args = parser.parse_args()

    TEAMS_DIR.mkdir(parents=True, exist_ok=True)

    today_str = date.today().strftime("%d-%m-%Y")
    print(f"\nNeoScout Priority Groups Updater")
    print("=" * 65)
    print(f"  Today: {today_str}  |  Season: {SEASON}")
    print()

    plan = []   # list of {competition, group, team, output, reason}
    skip = []

    for competition, groups in PRIORITY.items():
        for group in groups:
            existing = find_existing_json_for_group(competition, group)
            if existing:
                next_date = get_next_match_date(existing)
                if not args.force and not is_past_or_missing(next_date):
                    skip.append((competition, group, str(existing.name), next_date))
                    continue
                # Stale — re-use same file but update it
                meta = {}
                try:
                    meta = json.loads(existing.read_text(encoding="utf-8")).get("meta", {})
                except Exception:
                    pass
                team = meta.get("team", "")
                if not team:
                    team = fetch_first_team(competition, group)
                plan.append({
                    "competition": competition,
                    "group":       group,
                    "team":        team or "",
                    "output":      str(existing),
                    "reason":      f"stale ({next_date or 'N/A'})",
                })
            else:
                # No JSON yet — fetch team from standings
                print(f"  [{competition}/{group}] No JSON → fetching standings...")
                team = fetch_first_team(competition, group)
                if not team:
                    print(f"    [!] Skipping {competition}/{group} — could not find a team")
                    continue
                slug = slugify(team)
                output = str(TEAMS_DIR / f"{slug}.json")
                plan.append({
                    "competition": competition,
                    "group":       group,
                    "team":        team,
                    "output":      output,
                    "reason":      "new group",
                })

    # Print summary
    print(f"\n  SKIP ({len(skip)} already up to date):")
    for comp, grp, fname, nd in skip:
        print(f"    OK  {comp}/{grp:<10} → {fname} | next: {nd}")

    print(f"\n  UPDATE ({len(plan)} groups to process):")
    for t in plan:
        print(f"    [{t['reason']}]  {t['competition']}/{t['group']:<10} → {t['team']}")

    if not plan:
        print("\n  Nothing to update — all priority groups are up to date!")
        return

    print()
    ok = fail = 0
    for i, task in enumerate(plan, 1):
        print(f"\n[{i}/{len(plan)}] {task['competition']}/{task['group']} — {task['team']}")
        if not task["team"]:
            print("    [!] No team name — skipping")
            fail += 1
            continue
        success = run_update(task["team"], task["competition"], task["group"], task["output"], args.dry_run)
        if success:
            ok += 1
            print(f"    [OK]")
        else:
            fail += 1
            print(f"    [FAILED]")

    print()
    print("=" * 65)
    print(f"  DONE  |  {ok} ok  |  {fail} failed")
    print("=" * 65)


if __name__ == "__main__":
    main()
