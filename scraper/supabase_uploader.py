"""
Supabase uploader — pushes scraped FCF data to Supabase PostgreSQL.

Uses the service_role key (bypasses RLS) for writes.
Requires env vars:
  SUPABASE_URL           — Project URL (https://xxxx.supabase.co)
  SUPABASE_SERVICE_KEY   — service_role key (NOT the anon key)

Install: pip install supabase
"""
import os
import re
import unicodedata
import logging
from dataclasses import asdict
from typing import Any

from supabase import create_client, Client

logger = logging.getLogger("fcf_uploader")

# ── Supabase client (lazy init) ───────────────────────────────────────────────

_client: Client | None = None

def get_client() -> Client:
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            raise EnvironmentError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set"
            )
        _client = create_client(url, key)
    return _client


# ── Helpers ───────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9\s-]", "", text).strip()
    return re.sub(r"[\s-]+", "-", text)


def _batch_upsert(table: str, rows: list[dict], chunk: int = 500) -> int:
    """Upsert rows in chunks. Returns total upserted."""
    if not rows:
        return 0
    client = get_client()
    total = 0
    for i in range(0, len(rows), chunk):
        batch = rows[i : i + chunk]
        client.table(table).upsert(batch, on_conflict="id").execute()
        total += len(batch)
    return total


# ── Public API ────────────────────────────────────────────────────────────────

def push_standings(
    standings: list[Any],
    competition: str,
    group: str,
    season: str,
) -> int:
    """
    Upsert standings rows to fcf_standings.
    Accepts list of TeamStanding dataclass instances or dicts.
    """
    rows = []
    for s in standings:
        d = asdict(s) if hasattr(s, "__dataclass_fields__") else dict(s)
        team_slug = slugify(d.get("name", ""))
        row_id = f"{season}-{competition}-{group}-{team_slug}"
        rows.append({
            "id":            row_id,
            "season":        season,
            "competition":   competition,
            "group_name":    group,
            "position":      d.get("position", 0),
            "team_name":     d.get("name", ""),
            "team_slug":     team_slug,
            "played":        d.get("played", 0),
            "won":           d.get("won", 0),
            "drawn":         d.get("drawn", 0),
            "lost":          d.get("lost", 0),
            "goals_for":     d.get("goals_for", 0),
            "goals_against": d.get("goals_against", 0),
            "goal_diff":     d.get("goal_diff", d.get("goals_for", 0) - d.get("goals_against", 0)),
            "points":        d.get("points", 0),
            "home_won":      d.get("home_won", 0),
            "home_drawn":    d.get("home_drawn", 0),
            "home_lost":     d.get("home_lost", 0),
            "away_won":      d.get("away_won", 0),
            "away_drawn":    d.get("away_drawn", 0),
            "away_lost":     d.get("away_lost", 0),
            "form":          d.get("form", ""),
        })
    n = _batch_upsert("fcf_standings", rows)
    logger.info(f"standings  → {n} rows  [{competition}/{group}]")
    return n


def push_matches(
    matches: list[Any],
    competition: str,
    group: str,
    season: str,
) -> int:
    """
    Upsert match calendar rows to fcf_matches.
    Accepts list of MatchResult dataclass instances or dicts.
    """
    rows = []
    for m in matches:
        d = asdict(m) if hasattr(m, "__dataclass_fields__") else dict(m)
        home_slug = slugify(d.get("home_team", ""))
        away_slug = slugify(d.get("away_team", ""))
        jornada   = d.get("jornada", 0)
        row_id    = f"{season}-{competition}-{group}-J{jornada}-{home_slug}-v-{away_slug}"
        rows.append({
            "id":         row_id,
            "season":     season,
            "competition": competition,
            "group_name": group,
            "jornada":    jornada,
            "match_date": d.get("date", ""),
            "match_time": d.get("time", ""),
            "home_team":  d.get("home_team", ""),
            "away_team":  d.get("away_team", ""),
            "home_slug":  home_slug,
            "away_slug":  away_slug,
            "home_score": d.get("home_score"),
            "away_score": d.get("away_score"),
            "status":     d.get("status", ""),
            "acta_url":   d.get("acta_url", ""),
        })
    n = _batch_upsert("fcf_matches", rows)
    logger.info(f"matches    → {n} rows  [{competition}/{group}]")
    return n


def push_referee_matches(refs: dict) -> int:
    """
    Upsert global_referees.json dict to fcf_referee_matches.
    Keys are match IDs, values are RefereeMatchInfo-shaped dicts.
    """
    rows = []
    for match_id, m in refs.items():
        referees    = m.get("referees", [])
        main_ref    = referees[0] if referees else None
        rows.append({
            "id":           match_id,
            "competition":  m.get("competition", ""),
            "group_name":   m.get("group", ""),
            "season":       m.get("season", ""),
            "jornada":      m.get("jornada"),
            "match_date":   m.get("date", ""),
            "home_team":    m.get("home_team", ""),
            "away_team":    m.get("away_team", ""),
            "home_score":   m.get("home_score"),
            "away_score":   m.get("away_score"),
            "main_referee": main_ref,
            "referees":     referees,
            "yellow_cards": m.get("yellow_cards", []),
            "red_cards":    m.get("red_cards", []),
        })
    n = _batch_upsert("fcf_referee_matches", rows)
    logger.info(f"referee_matches → {n} rows")
    return n


def push_scorers(
    scorers: list[Any],
    competition: str,
    group: str,
    season: str,
) -> int:
    """
    Upsert top scorers to fcf_scorers.
    Accepts list of Scorer dataclass instances or dicts.
    """
    rows = []
    for s in scorers:
        d = asdict(s) if hasattr(s, "__dataclass_fields__") else dict(s)
        player_slug = slugify(d.get("name", ""))
        row_id      = f"{season}-{competition}-{group}-{player_slug}"
        rows.append({
            "id":              row_id,
            "season":          season,
            "competition":     competition,
            "group_name":      group,
            "position":        d.get("position", 0),
            "player_name":     d.get("name", ""),
            "player_slug":     player_slug,
            "team_name":       d.get("team", ""),
            "team_slug":       slugify(d.get("team", "")),
            "goals":           d.get("goals", 0),
            "penalties":       d.get("penalties", 0),
            "matches":         d.get("matches", 0),
            "goals_per_match": d.get("goals_per_match", 0.0),
        })
    n = _batch_upsert("fcf_scorers", rows)
    logger.info(f"scorers    → {n} rows  [{competition}/{group}]")
    return n


def push_player_stats(
    team_intelligence: dict,
    competition: str,
    group: str,
    season: str,
) -> int:
    """
    Upsert player stats from team_intelligence dict to fcf_player_stats.
    team_intelligence is the output of intelligence.py:
      { team_name, players: { name: PlayerStats } }
    """
    players = team_intelligence.get("players", {})
    team_name = team_intelligence.get("team_name", "")
    team_slug = slugify(team_name)
    rows = []
    for player_name, stats in players.items():
        d = asdict(stats) if hasattr(stats, "__dataclass_fields__") else dict(stats)
        player_slug = slugify(player_name)
        row_id = f"{season}-{competition}-{group}-{player_slug}-{team_slug}"
        rows.append({
            "id":             row_id,
            "season":         season,
            "competition":    competition,
            "group_name":     group,
            "player_name":    player_name,
            "player_slug":    player_slug,
            "team_name":      team_name,
            "team_slug":      team_slug,
            "appearances":    d.get("appearances", 0),
            "starts":         d.get("starts", 0),
            "goals":          d.get("goals", 0),
            "yellow_cards":   d.get("yellow_cards", 0),
            "red_cards":      d.get("red_cards", 0),
            "minutes_played": d.get("minutes_played", 0),
        })
    n = _batch_upsert("fcf_player_stats", rows)
    logger.info(f"player_stats → {n} rows  [{team_name}]")
    return n
