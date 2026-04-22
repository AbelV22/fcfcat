#!/usr/bin/env python3
"""
sync_goals_to_supabase.py — Push goal timing from SQLite to Supabase
Uses PATCH by competition+jornada+home_team+away_team to match existing rows.
"""
import io, sys, os, json, sqlite3, time
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from pathlib import Path
try:
    import requests
except ImportError:
    os.system(f"{sys.executable} -m pip install requests -q")
    import requests

ROOT = Path(__file__).parent
DB_PATH = ROOT / "data" / "fcf.db"

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://nxgyduqprxbhtpqsepgj.supabase.co")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Z3lkdXFwcnhiaHRwcXNlcGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTc5NjcsImV4cCI6MjA4ODU3Mzk2N30.qb-T1ja19sGFyDIOLU6C8SM1OBOa9RnmzEakc9g2Y2U")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

def fp(*args, **kwargs):
    print(*args, **kwargs)
    sys.stdout.flush()

def load_actas(competition=None, group=None):
    db = sqlite3.connect(str(DB_PATH))
    db.row_factory = sqlite3.Row
    sql = "SELECT competition, grp, jornada, home_team, away_team, data_json FROM actas"
    where, params = [], []
    if competition:
        where.append("competition = ?"); params.append(competition)
    if group:
        where.append("grp = ?"); params.append(group)
    if where:
        sql += " WHERE " + " AND ".join(where)
    rows = db.execute(sql, params).fetchall()
    db.close()
    return rows

def patch_row(competition, jornada, home_team, away_team, goals, subs, home_lineup, away_lineup, home_bench, away_bench):
    """PATCH a single row by matching on competition + jornada + home_team + away_team."""
    encoded_home = requests.utils.quote(home_team)
    encoded_away = requests.utils.quote(away_team)
    url = (
        f"{SUPABASE_URL}/rest/v1/fcf_referee_matches"
        f"?competition=eq.{requests.utils.quote(competition)}"
        f"&jornada=eq.{jornada}"
        f"&home_team=eq.{encoded_home}"
        f"&away_team=eq.{encoded_away}"
    )
    body = {
        "goals": goals,
        "substitutions": subs,
        "home_lineup": home_lineup,
        "away_lineup": away_lineup,
        "home_bench": home_bench,
        "away_bench": away_bench,
    }
    resp = requests.patch(url, headers=HEADERS, json=body, timeout=15)
    return resp.status_code in (200, 204)

def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--competition", default=None)
    ap.add_argument("--group", default=None)
    args = ap.parse_args()

    fp("=" * 60)
    fp("  Sync Goals & Lineups: SQLite -> Supabase (PATCH mode)")
    if args.competition or args.group:
        fp(f"  Filter: {args.competition or '*'}/{args.group or '*'}")
    fp("=" * 60)

    fp(f"\n  Loading actas from {DB_PATH}...")
    actas = load_actas(competition=args.competition, group=args.group)
    fp(f"  Found {len(actas)} actas")

    ok = 0
    errors = 0
    skipped = 0
    total = len(actas)

    fp(f"\n  Patching {total} rows...")

    for i, a in enumerate(actas):
        try:
            data = json.loads(a["data_json"])
        except (json.JSONDecodeError, TypeError):
            skipped += 1
            continue

        goals = data.get("goals", [])
        subs = data.get("substitutions", [])
        home_lineup = data.get("home_lineup", [])
        away_lineup = data.get("away_lineup", [])
        home_bench = data.get("home_bench", [])
        away_bench = data.get("away_bench", [])

        # Normalize lineups to name strings
        if home_lineup and isinstance(home_lineup[0], dict):
            home_lineup = [p.get("name", p.get("player", "")) for p in home_lineup]
        if away_lineup and isinstance(away_lineup[0], dict):
            away_lineup = [p.get("name", p.get("player", "")) for p in away_lineup]
        if home_bench and isinstance(home_bench[0], dict):
            home_bench = [p.get("name", p.get("player", "")) for p in home_bench]
        if away_bench and isinstance(away_bench[0], dict):
            away_bench = [p.get("name", p.get("player", "")) for p in away_bench]

        # Skip if no meaningful data to push
        if not goals and not home_lineup:
            skipped += 1
            continue

        for attempt in range(3):
            try:
                success = patch_row(
                    a["competition"], a["jornada"], a["home_team"], a["away_team"],
                    goals, subs, home_lineup, away_lineup, home_bench, away_bench
                )
                if success:
                    ok += 1
                else:
                    errors += 1
                break
            except (requests.exceptions.ConnectionError, ConnectionResetError):
                wait = 10 * (attempt + 1)
                fp(f"\n  Connection error at row {i}, retry in {wait}s...")
                time.sleep(wait)
        else:
            errors += 1

        if (i + 1) % 50 == 0 or i == total - 1:
            pct = round(100 * (i + 1) / total)
            fp(f"  [{pct:3d}%] {ok} ok, {errors} err, {skipped} skip ({i+1}/{total})")

        # Rate limit: ~2 requests/sec
        time.sleep(0.5)

    fp(f"\n{'=' * 60}")
    fp(f"  DONE: {ok} updated, {errors} errors, {skipped} skipped")
    fp(f"{'=' * 60}")

if __name__ == "__main__":
    main()
