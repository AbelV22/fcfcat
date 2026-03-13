#!/usr/bin/env python3
"""
rebuild_goals.py
================
Retroactiu: afegeix els gols a les entrades existents de global_referees.json
llegint els fitxers de team JSON que ja tenim a data/teams/.

Quan s'ha afegit el camp `goals` a RefereeMatchInfo, les entrades antigues
de global_referees.json no en tenien. Aquest script les actualitza.

També pot regenerar totes les entrades des de zero (--full).

Usage:
    python rebuild_goals.py                  # afegeix gols on falten
    python rebuild_goals.py --full           # regenera tot des de zero
    python rebuild_goals.py --dry-run        # previsualitza sense escriure
"""
import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

ROOT = Path(__file__).parent
DATA_DIR = ROOT / "data"
TEAMS_DIR = DATA_DIR / "teams"
GLOBAL_REFS_PATH = DATA_DIR / "global_referees.json"


def load_global_refs() -> dict:
    if GLOBAL_REFS_PATH.exists():
        try:
            return json.loads(GLOBAL_REFS_PATH.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"[!] Cannot load global_referees.json: {e}")
    return {}


def save_global_refs(refs: dict):
    GLOBAL_REFS_PATH.write_text(
        json.dumps(refs, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


def _make_ref_id(jornada: int, home: str, away: str) -> str:
    return f"J{jornada}-{home}-v-{away}"


def rebuild_goals(full: bool = False, dry_run: bool = False) -> dict:
    global_refs = load_global_refs()
    existing_count = len(global_refs)

    print(f"\nRebuild Goals — global_referees.json")
    print("=" * 60)
    print(f"  Mode:       {'FULL REBUILD' if full else 'PATCH (add missing goals)'}")
    print(f"  Dry run:    {dry_run}")
    print(f"  Existing:   {existing_count} matches in global_referees.json")
    print()

    updated = 0
    skipped = 0
    total_goals_added = 0

    team_files = sorted(TEAMS_DIR.glob("*.json"))
    print(f"  Found {len(team_files)} team JSON files in data/teams/\n")

    for f in team_files:
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"  [!] Skip {f.name}: {e}")
            continue

        meta = data.get("meta") or {}
        competition = meta.get("competition", "")
        group = meta.get("group", "")
        season = meta.get("season", "2526")
        actas = data.get("actas") or []

        if not actas or not competition:
            continue

        for acta in actas:
            jornada = acta.get("jornada", 0)
            home = acta.get("home_team", "")
            away = acta.get("away_team", "")
            goals = acta.get("goals") or []
            ref_id = _make_ref_id(jornada, home, away)

            if ref_id not in global_refs:
                skipped += 1
                continue  # not in DB, nothing to patch

            entry = global_refs[ref_id]

            # If full rebuild OR goals field missing/empty
            already_has_goals = bool(entry.get("goals"))
            if not full and already_has_goals:
                skipped += 1
                continue

            if not dry_run:
                entry["goals"] = goals
                # Also backfill yellow/red cards if missing
                if not entry.get("yellow_cards") and acta.get("yellow_cards"):
                    entry["yellow_cards"] = acta["yellow_cards"]
                if not entry.get("red_cards") and acta.get("red_cards"):
                    entry["red_cards"] = acta["red_cards"]

            updated += 1
            total_goals_added += len(goals)

    if not dry_run and updated > 0:
        save_global_refs(global_refs)

    print(f"  Updated:    {updated} matches")
    print(f"  Skipped:    {skipped}")
    print(f"  Goals added:{total_goals_added}")
    if dry_run:
        print(f"  [DRY RUN] — nothing was written")
    else:
        print(f"  Saved to:   {GLOBAL_REFS_PATH}")
    print("=" * 60)
    return {"updated": updated, "skipped": skipped, "goals_added": total_goals_added}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill goals into global_referees.json from team JSON files")
    parser.add_argument("--full",    action="store_true", help="Overwrite goals even if already present")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    args = parser.parse_args()

    result = rebuild_goals(full=args.full, dry_run=args.dry_run)
    sys.exit(0 if result["updated"] >= 0 else 1)
