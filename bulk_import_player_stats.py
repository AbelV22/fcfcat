#!/usr/bin/env python3
"""
bulk_import_player_stats.py
============================
Reads ALL actas from local SQLite (data/fcf.db) and computes player stats
for EVERY team in seconda-catalana and tercera-catalana (and optionally others).
Then pushes all stats to Supabase fcf_player_stats.

Much faster than running the scraper per-team (no FCF network requests).

Usage:
    python bulk_import_player_stats.py                        # seconda + tercera
    python bulk_import_player_stats.py --competitions all     # all competitions
    python bulk_import_player_stats.py --team "mataronesa"    # one team only
    python bulk_import_player_stats.py --dry-run              # preview counts
"""
import argparse
import json
import logging
import re
import sqlite3
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
        sys.stderr.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
    except Exception:
        pass

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-7s  %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger("bulk_import")

ROOT = Path(__file__).parent
DB_PATH = ROOT / "data" / "fcf.db"

DEFAULT_COMPETITIONS = ["segona-catalana", "tercera-catalana"]


def slugify(text: str) -> str:
    text = (text or "").lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9\s-]", "", text).strip()
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text


def compute_stats_from_actas(actas: list[dict], target_team: str, competition: str, group: str, season: str) -> list[dict]:
    """
    Given a list of acta dicts for a specific team (already filtered to home or away),
    compute per-player stats and return rows for fcf_player_stats.
    """
    team_slug = slugify(target_team)
    # { player_slug: { name, appearances, starts, goals, yellows, reds, minutes } }
    players: dict[str, dict] = {}

    def get_or_create(name: str) -> dict:
        s = slugify(name)
        if s not in players:
            players[s] = {"player_name": name, "player_slug": s,
                          "appearances": 0, "starts": 0, "goals": 0,
                          "yellow_cards": 0, "red_cards": 0, "minutes_played": 0}
        return players[s]

    for acta in actas:
        d = acta["data"]
        is_home = slugify(d.get("home_team", "")) == team_slug or \
                  slugify(acta.get("home_team", "")) == team_slug

        lineup = d.get("home_lineup", []) if is_home else d.get("away_lineup", [])
        bench  = d.get("home_bench",  []) if is_home else d.get("away_bench",  [])
        subs   = d.get("substitutions", [])
        my_subs = [s for s in subs if s.get("team") == ("home" if is_home else "away")]

        sub_out_min = {}  # player_slug → minute subbed out
        sub_in_min  = {}  # player_slug → minute came in
        for sub in my_subs:
            out_item = sub.get("player_out", "")
            in_item  = sub.get("player_in", "")
            minute   = int(sub.get("minute", 0) or 0)
            out_name = out_item.get("name", "") if isinstance(out_item, dict) else str(out_item or "")
            in_name  = in_item.get("name", "")  if isinstance(in_item, dict)  else str(in_item  or "")
            if out_name:
                sub_out_min[slugify(out_name)] = minute
            if in_name:
                sub_in_min[slugify(in_name)] = minute

        my_side = "home" if is_home else "away"

        # Red card minutes
        red_min = {}
        for card in d.get("red_cards", []) + d.get("yellow_cards", []):
            if card.get("team") != my_side:
                continue
            if card.get("card_type") == "red" or card.get("is_double_yellow"):
                p = slugify(card.get("player", ""))
                if p:
                    red_min[p] = int(card.get("minute", 90) or 90)

        def player_name(item) -> str:
            """Accept either a plain string or a dict with 'name' key."""
            if isinstance(item, dict):
                return item.get("name", "") or ""
            return str(item) if item else ""

        # Starters
        for item in lineup:
            name = player_name(item)
            if not name or len(name) < 2:
                continue
            p = get_or_create(name)
            ps = slugify(name)
            p["appearances"] += 1
            p["starts"] += 1
            mins = 90
            if ps in sub_out_min:
                mins = sub_out_min[ps]
            if ps in red_min:
                mins = min(mins, red_min[ps])
            p["minutes_played"] += max(0, mins)

        # Bench subs (only if they came on)
        for item in bench:
            name = player_name(item)
            if not name or len(name) < 2:
                continue
            ps = slugify(name)
            if ps in sub_in_min:
                sub_min = sub_in_min[ps]
                if sub_min > 0:
                    p = get_or_create(name)
                    p["appearances"] += 1
                    mins = 90 - sub_min
                    if ps in red_min:
                        mins = min(mins, red_min[ps] - sub_min)
                    p["minutes_played"] += max(0, mins)

        # Goals
        for goal in d.get("goals", []):
            if goal.get("team") != my_side:
                continue
            gp = goal.get("player", "")
            if gp and gp.lower() not in ("", "desconegut", "unknown"):
                get_or_create(gp)["goals"] += 1

        # Yellow cards (player only)
        for card in d.get("yellow_cards", []):
            if card.get("team") != my_side:
                continue
            if card.get("recipient_type", "player") != "player":
                continue
            cp = card.get("player", "")
            if cp:
                if card.get("is_double_yellow"):
                    get_or_create(cp)["yellow_cards"] += 1
                    get_or_create(cp)["red_cards"] += 1
                else:
                    get_or_create(cp)["yellow_cards"] += 1

        # Red cards
        for card in d.get("red_cards", []):
            if card.get("team") != my_side:
                continue
            if card.get("recipient_type", "player") != "player":
                continue
            cp = card.get("player", "")
            if cp:
                get_or_create(cp)["red_cards"] += 1

    if not players:
        return []

    rows = []
    for ps, p in players.items():
        if p["appearances"] == 0:
            continue
        row_id = f"{season}-{competition}-{group}-{ps}-{team_slug}"
        rows.append({
            "id":             row_id,
            "season":         season,
            "competition":    competition,
            "group_name":     group,
            "player_name":    p["player_name"],
            "player_slug":    ps,
            "team_name":      target_team,
            "team_slug":      team_slug,
            "appearances":    p["appearances"],
            "starts":         p["starts"],
            "goals":          p["goals"],
            "yellow_cards":   p["yellow_cards"],
            "red_cards":      p["red_cards"],
            "minutes_played": p["minutes_played"],
        })
    return rows


def run(competitions, team_filter=None, dry_run=False):
    if not DB_PATH.exists():
        logger.error(f"SQLite DB not found: {DB_PATH}")
        return

    db = sqlite3.connect(str(DB_PATH))
    db.row_factory = sqlite3.Row
    cur = db.cursor()

    placeholders = ",".join("?" * len(competitions))
    cur.execute(
        f"SELECT acta_url, season, competition, grp, home_team, away_team, data_json "
        f"FROM actas WHERE competition IN ({placeholders}) ORDER BY competition, grp, jornada",
        competitions,
    )
    rows = cur.fetchall()
    db.close()

    logger.info(f"Loaded {len(rows)} actas from SQLite for {competitions}")

    # Group actas by competition/group/team
    # team_actas[(comp, grp, team_name)] = list of acta dicts
    team_actas: dict[tuple, list] = defaultdict(list)

    for row in rows:
        data_raw = row["data_json"] or "{}"
        try:
            d = json.loads(data_raw)
        except Exception:
            continue
        competition = row["competition"]
        grp = row["grp"]
        home = row["home_team"] or d.get("home_team", "")
        away = row["away_team"] or d.get("away_team", "")
        season = row["season"] or "2526"
        acta = {"home_team": home, "away_team": away, "data": d, "season": season}

        if home:
            team_actas[(competition, grp, home)].append(acta)
        if away:
            team_actas[(competition, grp, away)].append(acta)

    logger.info(f"Found {len(team_actas)} team/group combos")

    if not dry_run:
        from scraper.supabase_uploader import _batch_upsert

    total_players = 0
    total_teams = 0
    errors = 0

    for (competition, grp, team_name), actas in sorted(team_actas.items()):
        if team_filter and team_filter.lower() not in team_name.lower():
            continue

        season = actas[0]["season"] if actas else "2526"
        stat_rows = compute_stats_from_actas(actas, team_name, competition, grp, season)

        if not stat_rows:
            continue

        total_teams += 1
        total_players += len(stat_rows)

        if dry_run:
            logger.info(f"  DRY  [{competition}/{grp}] {team_name} → {len(stat_rows)} players")
        else:
            try:
                _batch_upsert("fcf_player_stats", stat_rows)
                logger.info(f"  OK   [{competition}/{grp}] {team_name} → {len(stat_rows)} players")
            except Exception as e:
                errors += 1
                logger.error(f"  FAIL [{competition}/{grp}] {team_name}: {e}")

    logger.info(f"\nDone: {total_teams} teams, {total_players} player rows, {errors} errors")


def main():
    parser = argparse.ArgumentParser(description="Bulk import player stats from local SQLite to Supabase")
    parser.add_argument("--competitions", default="priority",
                        help="'priority' (default), 'all', or comma-separated list")
    parser.add_argument("--team", default=None, help="Filter to teams matching this string")
    parser.add_argument("--dry-run", action="store_true", help="Count without pushing")
    args = parser.parse_args()

    if args.competitions == "priority":
        comps = DEFAULT_COMPETITIONS
    elif args.competitions == "all":
        db = sqlite3.connect(str(DB_PATH))
        cur = db.cursor()
        cur.execute("SELECT DISTINCT competition FROM actas")
        comps = [r[0] for r in cur.fetchall()]
        db.close()
    else:
        comps = [c.strip() for c in args.competitions.split(",")]

    run(comps, team_filter=args.team, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
