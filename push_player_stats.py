#!/usr/bin/env python3
"""
push_player_stats.py
====================
Reads all team JSON files from data/teams/ and pushes to Supabase:
  1. fcf_player_stats  — individual player stats per team (from actas)
  2. fcf_scorers       — group scorer rankings (from scorers_from_actas)

The FCF golejadors page uses JavaScript, so scrape_scorers() often returns
empty. This script uses the authoritative acta-based scorer data instead.

Usage:
    python push_player_stats.py
    python push_player_stats.py --dry-run   # no Supabase push
"""
import argparse
import json
import logging
import sys
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
        sys.stderr.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
    except Exception:
        pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("push_player_stats")

ROOT = Path(__file__).parent
TEAMS_DIR = ROOT / "data" / "teams"


def push_all(dry_run: bool = False) -> dict:
    """
    Read all team JSON files and push player stats + scorers to Supabase.
    Returns summary dict.
    """
    team_files = sorted(TEAMS_DIR.glob("*.json"))
    if not team_files:
        logger.warning(f"No team JSON files found in {TEAMS_DIR}")
        return {"players": 0, "scorer_groups": 0, "errors": 0}

    if not dry_run:
        from scraper.supabase_uploader import push_player_stats, push_scorers

    total_players = 0
    scorer_groups_pushed: set = set()  # track (competition/group) to avoid duplicates
    total_scorer_groups = 0
    errors = 0

    for json_file in team_files:
        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning(f"  Could not read {json_file.name}: {e}")
            continue

        meta = data.get("meta", {})
        competition = meta.get("competition", "")
        group = meta.get("group", "")
        season = meta.get("season", "2526")

        if not competition or not group:
            continue

        # ── 1. Player stats ────────────────────────────────────────────────
        ti = data.get("team_intelligence", {})
        players = ti.get("players", {})
        team_name = ti.get("team_name", meta.get("team", ""))

        if players:
            logger.info(f"  [{competition}/{group}] {team_name} — {len(players)} players")
            if not dry_run:
                try:
                    n = push_player_stats(
                        {"team_name": team_name, "players": players},
                        competition, group, season,
                    )
                    total_players += n
                except Exception as e:
                    errors += 1
                    logger.error(f"  FAILED player_stats {json_file.name}: {e}")
            else:
                total_players += len(players)

        # ── 2. Scorers from actas (push once per group) ────────────────────
        group_key = f"{competition}/{group}"
        if group_key not in scorer_groups_pushed:
            scorers = data.get("scorers_from_actas", [])
            if scorers:
                logger.info(f"  [{group_key}] scorers: {len(scorers)} players")
                if not dry_run:
                    try:
                        push_scorers(scorers, competition, group, season)
                        scorer_groups_pushed.add(group_key)
                        total_scorer_groups += 1
                    except Exception as e:
                        errors += 1
                        logger.error(f"  FAILED scorers {group_key}: {e}")
                else:
                    scorer_groups_pushed.add(group_key)
                    total_scorer_groups += 1

    summary = {
        "players": total_players,
        "scorer_groups": total_scorer_groups,
        "errors": errors,
    }
    logger.info(
        f"\nDone: {total_players} player rows, "
        f"{total_scorer_groups} scorer groups "
        f"{'would be pushed' if dry_run else 'pushed'}, "
        f"{errors} errors"
    )
    return summary


def main():
    parser = argparse.ArgumentParser(
        description="Push player stats and acta-based scorer rankings to Supabase"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Count data without pushing to Supabase",
    )
    args = parser.parse_args()
    push_all(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
