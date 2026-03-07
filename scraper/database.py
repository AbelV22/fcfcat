"""
FCF Persistent Database — SQLite layer
=======================================
Provides a single SQLite file (data/fcf.db) that stores all scraped data
so that weekly updates only need to download new actas, not re-scrape
everything from scratch.

Tables
------
seasons           — known competition/season/group combos
matches           — one row per match (acta_url is the natural key)
actas             — full MatchReport JSON keyed by acta_url
standings         — latest standing snapshot per season/competition/group
sanctions         — current sanctions (replaced on each update)
scorers           — current top scorers (replaced on each update)
referees          — global referee database (merged over time)

Usage
-----
    from scraper.database import Database

    db = Database("data/fcf.db")
    db.upsert_match(match_dict)
    new_urls = db.get_unscraped_acta_urls(season, competition, group)
    db.save_acta(acta_url, acta_dict)
    actas = db.load_all_actas(season, competition, group)
"""
from __future__ import annotations

import json
import logging
import sqlite3
import time
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger("fcf_scraper")

# Default DB path relative to the project root
DEFAULT_DB_PATH = Path(__file__).parent.parent / "data" / "fcf.db"

_SCHEMA = """
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS seasons (
    id          TEXT PRIMARY KEY,   -- "{season}/{competition}/{group}"
    season      TEXT NOT NULL,
    competition TEXT NOT NULL,
    grp         TEXT NOT NULL,
    team        TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
    acta_url    TEXT PRIMARY KEY,
    season      TEXT NOT NULL,
    competition TEXT NOT NULL,
    grp         TEXT NOT NULL,
    jornada     INTEGER NOT NULL,
    date        TEXT NOT NULL,
    home_team   TEXT NOT NULL,
    away_team   TEXT NOT NULL,
    home_score  INTEGER,
    away_score  INTEGER,
    status      TEXT NOT NULL DEFAULT '',
    acta_scraped INTEGER NOT NULL DEFAULT 0,   -- 0 = not yet, 1 = scraped
    scraped_at  TEXT
);

CREATE TABLE IF NOT EXISTS actas (
    acta_url    TEXT PRIMARY KEY,
    season      TEXT NOT NULL,
    competition TEXT NOT NULL,
    grp         TEXT NOT NULL,
    jornada     INTEGER NOT NULL,
    home_team   TEXT NOT NULL,
    away_team   TEXT NOT NULL,
    data_json   TEXT NOT NULL,   -- full MatchReport as JSON
    scraped_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS standings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    season      TEXT NOT NULL,
    competition TEXT NOT NULL,
    grp         TEXT NOT NULL,
    data_json   TEXT NOT NULL,   -- list[TeamStanding] as JSON
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sanctions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    season      TEXT NOT NULL,
    competition TEXT NOT NULL,
    grp         TEXT NOT NULL,
    data_json   TEXT NOT NULL,   -- list[Sanction] as JSON
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scorers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    season      TEXT NOT NULL,
    competition TEXT NOT NULL,
    grp         TEXT NOT NULL,
    data_json   TEXT NOT NULL,   -- list[Scorer] as JSON
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS referees (
    ref_id      TEXT PRIMARY KEY,   -- "J{n}-{home}-v-{away}"
    competition TEXT NOT NULL,
    grp         TEXT NOT NULL,
    season      TEXT NOT NULL,
    data_json   TEXT NOT NULL,       -- RefereeMatchInfo as JSON
    updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_matches_season ON matches (season, competition, grp);
CREATE INDEX IF NOT EXISTS idx_actas_season   ON actas   (season, competition, grp);
CREATE INDEX IF NOT EXISTS idx_refs_season    ON referees (competition, grp, season);
"""


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


class Database:
    """Thread-safe (WAL mode) SQLite wrapper for FCF scraper data."""

    def __init__(self, db_path: str | Path = DEFAULT_DB_PATH):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _connect(self) -> sqlite3.Connection:
        con = sqlite3.connect(self.db_path, check_same_thread=False)
        con.row_factory = sqlite3.Row
        return con

    def _init_schema(self):
        with self._connect() as con:
            con.executescript(_SCHEMA)
        logger.debug(f"Database initialised at {self.db_path}")

    def _season_key(self, season: str, competition: str, group: str) -> str:
        return f"{season}/{competition}/{group}"

    # ── Seasons ───────────────────────────────────────────────────────────────

    def ensure_season(self, season: str, competition: str, group: str, team: str = ""):
        """Register a season/competition/group combo (idempotent)."""
        key = self._season_key(season, competition, group)
        now = _now()
        with self._connect() as con:
            con.execute(
                """
                INSERT INTO seasons (id, season, competition, grp, team, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at,
                    team=CASE WHEN excluded.team != '' THEN excluded.team ELSE team END
                """,
                (key, season, competition, group, team, now, now),
            )

    def list_seasons(self) -> list[dict]:
        with self._connect() as con:
            rows = con.execute("SELECT * FROM seasons ORDER BY updated_at DESC").fetchall()
        return [dict(r) for r in rows]

    # ── Matches (calendar) ────────────────────────────────────────────────────

    def upsert_match(self, match: dict, season: str, competition: str, group: str):
        """Insert or update a match record. Does NOT overwrite acta_scraped=1."""
        now = _now()
        with self._connect() as con:
            con.execute(
                """
                INSERT INTO matches
                    (acta_url, season, competition, grp, jornada, date,
                     home_team, away_team, home_score, away_score, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(acta_url) DO UPDATE SET
                    home_score = excluded.home_score,
                    away_score = excluded.away_score,
                    status     = excluded.status
                """,
                (
                    match.get("acta_url", ""),
                    season, competition, group,
                    match.get("jornada", 0),
                    match.get("date", ""),
                    match.get("home_team", ""),
                    match.get("away_team", ""),
                    match.get("home_score"),
                    match.get("away_score"),
                    match.get("status", ""),
                ),
            )

    def upsert_matches(self, matches: list[dict], season: str, competition: str, group: str):
        for m in matches:
            self.upsert_match(m, season, competition, group)

    def get_unscraped_acta_urls(self, season: str, competition: str, group: str) -> list[str]:
        """Return acta URLs in this season/competition/group that have NOT been scraped yet."""
        with self._connect() as con:
            rows = con.execute(
                """
                SELECT acta_url FROM matches
                WHERE season=? AND competition=? AND grp=?
                  AND acta_url != ''
                  AND acta_scraped = 0
                ORDER BY jornada, acta_url
                """,
                (season, competition, group),
            ).fetchall()
        return [r["acta_url"] for r in rows]

    def get_all_acta_urls(self, season: str, competition: str, group: str) -> list[str]:
        """Return all known acta URLs for this season/competition/group."""
        with self._connect() as con:
            rows = con.execute(
                """
                SELECT acta_url FROM matches
                WHERE season=? AND competition=? AND grp=?
                  AND acta_url != ''
                ORDER BY jornada, acta_url
                """,
                (season, competition, group),
            ).fetchall()
        return [r["acta_url"] for r in rows]

    def get_scraped_acta_urls(self, season: str, competition: str, group: str) -> set[str]:
        """Return set of acta URLs that have already been scraped."""
        with self._connect() as con:
            rows = con.execute(
                """
                SELECT acta_url FROM matches
                WHERE season=? AND competition=? AND grp=?
                  AND acta_scraped = 1
                """,
                (season, competition, group),
            ).fetchall()
        return {r["acta_url"] for r in rows}

    # ── Actas (match reports) ─────────────────────────────────────────────────

    def save_acta(self, acta_url: str, acta_dict: dict, season: str, competition: str, group: str):
        """Persist a full MatchReport dict and mark the match as scraped."""
        now = _now()
        with self._connect() as con:
            con.execute(
                """
                INSERT INTO actas
                    (acta_url, season, competition, grp, jornada,
                     home_team, away_team, data_json, scraped_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(acta_url) DO UPDATE SET
                    data_json  = excluded.data_json,
                    scraped_at = excluded.scraped_at
                """,
                (
                    acta_url, season, competition, group,
                    acta_dict.get("jornada", 0),
                    acta_dict.get("home_team", ""),
                    acta_dict.get("away_team", ""),
                    json.dumps(acta_dict, ensure_ascii=False),
                    now,
                ),
            )
            # Mark the match as scraped
            con.execute(
                """
                UPDATE matches SET acta_scraped=1, scraped_at=?
                WHERE acta_url=?
                """,
                (now, acta_url),
            )

    def save_actas(self, acta_list: list[dict], season: str, competition: str, group: str):
        for a in acta_list:
            url = a.get("acta_url", "")
            if url:
                self.save_acta(url, a, season, competition, group)

    def load_all_actas(self, season: str, competition: str, group: str) -> list[dict]:
        """Load all scraped MatchReport dicts for a season/competition/group."""
        with self._connect() as con:
            rows = con.execute(
                """
                SELECT data_json FROM actas
                WHERE season=? AND competition=? AND grp=?
                ORDER BY jornada
                """,
                (season, competition, group),
            ).fetchall()
        return [json.loads(r["data_json"]) for r in rows]

    def count_actas(self, season: str, competition: str, group: str) -> int:
        with self._connect() as con:
            row = con.execute(
                "SELECT COUNT(*) as n FROM actas WHERE season=? AND competition=? AND grp=?",
                (season, competition, group),
            ).fetchone()
        return row["n"] if row else 0

    # ── Standings ──────────────────────────────────────────────────────────────

    def save_standings(self, standings: list[dict], season: str, competition: str, group: str):
        """Replace the latest standings snapshot."""
        now = _now()
        with self._connect() as con:
            # Delete old snapshot for this combo
            con.execute(
                "DELETE FROM standings WHERE season=? AND competition=? AND grp=?",
                (season, competition, group),
            )
            con.execute(
                "INSERT INTO standings (season, competition, grp, data_json, updated_at) VALUES (?,?,?,?,?)",
                (season, competition, group, json.dumps(standings, ensure_ascii=False), now),
            )

    def load_standings(self, season: str, competition: str, group: str) -> list[dict]:
        with self._connect() as con:
            row = con.execute(
                "SELECT data_json FROM standings WHERE season=? AND competition=? AND grp=? ORDER BY id DESC LIMIT 1",
                (season, competition, group),
            ).fetchone()
        return json.loads(row["data_json"]) if row else []

    # ── Sanctions ──────────────────────────────────────────────────────────────

    def save_sanctions(self, sanctions: list[dict], season: str, competition: str, group: str):
        now = _now()
        with self._connect() as con:
            con.execute(
                "DELETE FROM sanctions WHERE season=? AND competition=? AND grp=?",
                (season, competition, group),
            )
            con.execute(
                "INSERT INTO sanctions (season, competition, grp, data_json, updated_at) VALUES (?,?,?,?,?)",
                (season, competition, group, json.dumps(sanctions, ensure_ascii=False), now),
            )

    def load_sanctions(self, season: str, competition: str, group: str) -> list[dict]:
        with self._connect() as con:
            row = con.execute(
                "SELECT data_json FROM sanctions WHERE season=? AND competition=? AND grp=? ORDER BY id DESC LIMIT 1",
                (season, competition, group),
            ).fetchone()
        return json.loads(row["data_json"]) if row else []

    # ── Scorers ────────────────────────────────────────────────────────────────

    def save_scorers(self, scorers: list[dict], season: str, competition: str, group: str):
        now = _now()
        with self._connect() as con:
            con.execute(
                "DELETE FROM scorers WHERE season=? AND competition=? AND grp=?",
                (season, competition, group),
            )
            con.execute(
                "INSERT INTO scorers (season, competition, grp, data_json, updated_at) VALUES (?,?,?,?,?)",
                (season, competition, group, json.dumps(scorers, ensure_ascii=False), now),
            )

    def load_scorers(self, season: str, competition: str, group: str) -> list[dict]:
        with self._connect() as con:
            row = con.execute(
                "SELECT data_json FROM scorers WHERE season=? AND competition=? AND grp=? ORDER BY id DESC LIMIT 1",
                (season, competition, group),
            ).fetchone()
        return json.loads(row["data_json"]) if row else []

    # ── Referees ───────────────────────────────────────────────────────────────

    def upsert_referee(self, ref_id: str, ref_dict: dict, competition: str, group: str, season: str):
        now = _now()
        with self._connect() as con:
            con.execute(
                """
                INSERT INTO referees (ref_id, competition, grp, season, data_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(ref_id) DO UPDATE SET
                    data_json  = excluded.data_json,
                    updated_at = excluded.updated_at
                """,
                (ref_id, competition, group, season, json.dumps(ref_dict, ensure_ascii=False), now),
            )

    def upsert_referees(self, refs_dict: dict[str, dict], competition: str, group: str, season: str):
        """Merge a {ref_id: ref_dict} map into the DB."""
        for ref_id, ref_data in refs_dict.items():
            self.upsert_referee(ref_id, ref_data, competition, group, season)

    def load_all_referees(self) -> list[dict]:
        """Load all referee records as a flat list (regardless of season)."""
        with self._connect() as con:
            rows = con.execute("SELECT data_json FROM referees").fetchall()
        return [json.loads(r["data_json"]) for r in rows]

    def load_referees_as_dict(self) -> dict[str, dict]:
        """Load all referees as {ref_id: data_dict}."""
        with self._connect() as con:
            rows = con.execute("SELECT ref_id, data_json FROM referees").fetchall()
        return {r["ref_id"]: json.loads(r["data_json"]) for r in rows}

    def count_referees(self) -> int:
        with self._connect() as con:
            row = con.execute("SELECT COUNT(*) as n FROM referees").fetchone()
        return row["n"] if row else 0

    # ── Global stats ───────────────────────────────────────────────────────────

    def stats(self) -> dict:
        """Return a summary of what's stored in the database."""
        with self._connect() as con:
            total_actas   = con.execute("SELECT COUNT(*) as n FROM actas").fetchone()["n"]
            total_matches = con.execute("SELECT COUNT(*) as n FROM matches").fetchone()["n"]
            unscraped     = con.execute("SELECT COUNT(*) as n FROM matches WHERE acta_scraped=0 AND acta_url!=''").fetchone()["n"]
            total_refs    = con.execute("SELECT COUNT(*) as n FROM referees").fetchone()["n"]
            seasons_rows  = con.execute("SELECT * FROM seasons ORDER BY updated_at DESC").fetchall()
            latest_acta   = con.execute("SELECT MAX(scraped_at) as ts FROM actas").fetchone()["ts"]

        seasons_info = []
        for s in seasons_rows:
            acta_count = self.count_actas(s["season"], s["competition"], s["grp"])
            seasons_info.append({
                "id":          s["id"],
                "season":      s["season"],
                "competition": s["competition"],
                "group":       s["grp"],
                "team":        s["team"],
                "updated_at":  s["updated_at"],
                "actas_stored": acta_count,
            })

        return {
            "db_path":         str(self.db_path),
            "total_actas":     total_actas,
            "total_matches":   total_matches,
            "unscraped_actas": unscraped,
            "total_referees":  total_refs,
            "last_scraped_at": latest_acta,
            "seasons":         seasons_info,
        }

    def actas_list(self, season: str, competition: str, group: str) -> list[dict]:
        """Return a lightweight list of all actas for a season (no full JSON)."""
        with self._connect() as con:
            rows = con.execute(
                """
                SELECT a.acta_url, a.jornada, a.home_team, a.away_team, a.scraped_at,
                       m.home_score, m.away_score, m.status
                FROM actas a
                LEFT JOIN matches m ON m.acta_url = a.acta_url
                WHERE a.season=? AND a.competition=? AND a.grp=?
                ORDER BY a.jornada, a.home_team
                """,
                (season, competition, group),
            ).fetchall()
        return [dict(r) for r in rows]
