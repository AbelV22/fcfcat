#!/usr/bin/env python3
"""
rebuild_player_stats_from_team_json.py
=======================================
Rebuild fcf_player_stats for every team in the group, using the full
actas payload stored in data/teams/{slug}.json.

Why: a per-team scrape (e.g. --team BALAGUER) only builds intelligence
for that one team, so opponents in the same group keep stale or partial
stats from earlier imports. But the JSON produced by the scrape has the
FULL set of actas for the whole group (lineups, subs, goals, cards), so
we can recompute stats for every team from one source of truth.

Usage:
    python rebuild_player_stats_from_team_json.py data/teams/balaguer-cf-a.json
    python rebuild_player_stats_from_team_json.py data/teams/balaguer-cf-a.json --dry-run
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from collections import defaultdict
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-7s  %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger("rebuild_stats")

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

# Reuse the existing stats computation (handles substitutions, red cards, etc.)
from bulk_import_player_stats import compute_stats_from_actas  # noqa: E402
from scraper.team_slug import compose_team_slug  # noqa: E402


def rebuild(json_path: Path, dry_run: bool) -> None:
    data = json.loads(json_path.read_text(encoding="utf-8"))
    meta = data.get("meta", {})
    competition = meta.get("competition", "")
    group = meta.get("group", "")
    season = meta.get("season", "2526")

    if not competition or not group:
        logger.error("JSON has no meta.competition/group — cannot rebuild")
        return

    actas = data.get("actas", [])
    logger.info(f"Source: {json_path.name} — {competition}/{group} — {len(actas)} actas")

    # Gather every team present in the actas
    teams: set[str] = set()
    for a in actas:
        if a.get("home_team"):
            teams.add(a["home_team"])
        if a.get("away_team"):
            teams.add(a["away_team"])

    logger.info(f"Teams in group: {len(teams)}")

    if not dry_run:
        from scraper.supabase_uploader import _batch_upsert
    total_players = 0

    for team_name in sorted(teams):
        # bulk_import_player_stats expects `{"home_team", "away_team", "data": {...}}`
        team_actas = []
        for a in actas:
            if a.get("home_team") == team_name or a.get("away_team") == team_name:
                team_actas.append({
                    "home_team": a.get("home_team", ""),
                    "away_team": a.get("away_team", ""),
                    "data":      a,
                })

        if not team_actas:
            continue

        rows = compute_stats_from_actas(team_actas, team_name, competition, group, season)
        if not rows:
            continue

        # Rewrite team_slug to the new disambiguated format and recompute the
        # composite row id so we overwrite the pre-migration rows.
        team_slug = compose_team_slug(team_name, competition, group)
        for r in rows:
            r["team_slug"] = team_slug
            r["id"] = f"{season}-{competition}-{group}-{r['player_slug']}-{team_slug}"

        max_apps = max(r["appearances"] for r in rows)
        total_starts = sum(r["starts"] for r in rows)
        logger.info(f"  {team_name}: {len(rows)} players  max_apps={max_apps}  total_starts={total_starts}")

        if not dry_run:
            _batch_upsert("fcf_player_stats", rows)
            total_players += len(rows)

    if dry_run:
        logger.info("DRY RUN — nothing pushed")
    else:
        logger.info(f"Done: {total_players} rows upserted")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("json_path", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    rebuild(args.json_path, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
