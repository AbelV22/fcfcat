from __future__ import annotations
"""
Data models for all FCF data types.
Every piece of scraped data is strongly typed and serializable to JSON.
"""
from dataclasses import dataclass, field, asdict
from typing import Optional
import json


# ─── Standings ────────────────────────────────────────
@dataclass
class TeamStanding:
    position: int
    name: str
    points: int
    played: int
    won: int
    drawn: int
    lost: int
    goals_for: int
    goals_against: int
    home_won: int = 0
    home_drawn: int = 0
    home_lost: int = 0
    away_won: int = 0
    away_drawn: int = 0
    away_lost: int = 0
    team_slug: str = ""

    @property
    def goal_difference(self) -> int:
        return self.goals_for - self.goals_against

    def validate(self) -> list[str]:
        errors = []
        if self.won + self.drawn + self.lost != self.played:
            errors.append(f"{self.name}: W({self.won})+D({self.drawn})+L({self.lost}) != PJ({self.played})")
        expected_pts = self.won * 3 + self.drawn
        if self.points != expected_pts:
            errors.append(f"{self.name}: Pts({self.points}) != 3*W+D ({expected_pts})")
        total_home = self.home_won + self.home_drawn + self.home_lost
        total_away = self.away_won + self.away_drawn + self.away_lost
        if total_home + total_away > 0 and total_home + total_away != self.played:
            errors.append(f"{self.name}: Home({total_home})+Away({total_away}) != PJ({self.played})")
        return errors


# ─── Match / Result ───────────────────────────────────
@dataclass
class MatchResult:
    jornada: int
    date: str
    time: str
    home_team: str
    away_team: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    venue: str = ""
    acta_url: str = ""
    status: str = ""  # "ACTA TANCADA", "Pendent", etc.
    referee: str = ""
    home_slug: str = ""
    away_slug: str = ""


# ─── Next Match Info ──────────────────────────────────
@dataclass
class NextMatchInfo:
    """Auto-detected next match for a team."""
    jornada: int
    date: str           # "dd-MM-yyyy"
    time: str           # "HH:MM"
    rival_name: str
    is_home: bool
    venue: str = ""
    acta_url: str = ""
    referee: str = ""   # Main referee (first in list)
    referees: list[str] = field(default_factory=list)


# ─── Match Report (Acta) ─────────────────────────────
@dataclass
class PlayerEntry:
    name: str
    number: int
    is_starter: bool = True
    player_url: str = ""


@dataclass
class GoalEvent:
    player: str
    minute: str  # can be "45+2", etc.
    team: str = ""  # "home" or "away"


@dataclass
class TechnicalStaffMember:
    """A member of the technical staff (Equip Tècnic) listed in the acta."""
    name: str
    role: str  # E=Entrenador, 2=2nEntrenador, D=Delegat, A=Auxiliar, F=Fisioterapeuta, X=Altre

    @property
    def role_description(self) -> str:
        return {
            "E": "Entrenador",
            "2": "2n Entrenador",
            "D": "Delegat",
            "A": "Auxiliar",
            "F": "Fisioterapeuta",
        }.get(self.role, f"Altre ({self.role})")


@dataclass
class CardEvent:
    player: str
    minute: str
    card_type: str  # "yellow" or "red"
    team: str = ""
    is_double_yellow_dismissal: bool = False  # True on the 2nd groga-s that causes expulsion
    recipient_type: str = "player"  # "player" or "technical_staff"


@dataclass
class SubstitutionEvent:
    player_out: str
    player_in: str
    minute: str
    team: str = ""


@dataclass
class MatchReport:
    """Complete data from an acta (match report)."""
    jornada: int
    date: str
    time: str
    home_team: str
    away_team: str
    home_score: int
    away_score: int
    venue: str
    home_lineup: list[PlayerEntry] = field(default_factory=list)
    away_lineup: list[PlayerEntry] = field(default_factory=list)
    home_bench: list[PlayerEntry] = field(default_factory=list)
    away_bench: list[PlayerEntry] = field(default_factory=list)
    home_staff: list[TechnicalStaffMember] = field(default_factory=list)
    away_staff: list[TechnicalStaffMember] = field(default_factory=list)
    goals: list[GoalEvent] = field(default_factory=list)
    yellow_cards: list[CardEvent] = field(default_factory=list)
    red_cards: list[CardEvent] = field(default_factory=list)
    substitutions: list[SubstitutionEvent] = field(default_factory=list)
    referees: list[str] = field(default_factory=list)
    home_coach: str = ""
    away_coach: str = ""
    acta_url: str = ""
    status: str = ""

    def validate(self) -> list[str]:
        errors = []
        # Goal count must match score
        home_goals = sum(1 for g in self.goals if g.team == "home")
        away_goals = sum(1 for g in self.goals if g.team == "away")
        if home_goals != self.home_score:
            errors.append(f"Acta {self.home_team} vs {self.away_team}: home goals events({home_goals}) != score({self.home_score})")
        if away_goals != self.away_score:
            errors.append(f"Acta {self.home_team} vs {self.away_team}: away goals events({away_goals}) != score({self.away_score})")
        # Starter count
        if len(self.home_lineup) > 0 and len(self.home_lineup) != 11:
            errors.append(f"Acta {self.home_team}: {len(self.home_lineup)} starters (expected 11)")
        if len(self.away_lineup) > 0 and len(self.away_lineup) != 11:
            errors.append(f"Acta {self.away_team}: {len(self.away_lineup)} starters (expected 11)")
        return errors


# ─── Referee Global Database ──────────────────────────
@dataclass
class RefereeMatchInfo:
    """Minimized acta data stored for referee intelligence.

    Cards are stored flat (yellow_cards / red_cards) with full CardEvent data:
      - card.recipient_type  → "player" | "technical_staff"
      - card.is_double_yellow_dismissal → True for the 2nd yellow that caused expulsion
      - card.team            → "home" | "away"
    """
    id: str  # e.g., "J1-TEAM A-v-TEAM B"
    competition: str
    group: str
    season: str
    jornada: int
    date: str
    home_team: str
    away_team: str
    home_score: int
    away_score: int
    referees: list[str] = field(default_factory=list)
    yellow_cards: list[CardEvent] = field(default_factory=list)
    red_cards: list[CardEvent] = field(default_factory=list)

    @classmethod
    def from_acta(cls, acta: MatchReport, comp: str, group: str, season: str) -> 'RefereeMatchInfo':
        match_id = f"J{acta.jornada}-{acta.home_team}-v-{acta.away_team}"
        return cls(
            id=match_id,
            competition=comp,
            group=group,
            season=season,
            jornada=acta.jornada,
            date=acta.date,
            home_team=acta.home_team,
            away_team=acta.away_team,
            home_score=acta.home_score,
            away_score=acta.away_score,
            referees=acta.referees,
            yellow_cards=acta.yellow_cards,
            red_cards=acta.red_cards,
        )


# ─── Top Scorers ──────────────────────────────────────
@dataclass
class Scorer:
    position: int
    name: str
    team: str
    goals: int
    penalties: int
    matches: int
    goals_per_match: float
    player_url: str = ""
    team_slug: str = ""


# ─── Sanctions ────────────────────────────────────────
@dataclass
class Sanction:
    player: str
    team: str
    article: str
    matches_suspended: int
    reason: str
    notes: str = ""
    player_url: str = ""


# ─── Fair Play (Joc Net) ─────────────────────────────
@dataclass
class FairPlayEntry:
    position: int
    team: str
    points: int
    yellow_cards: int = 0
    red_cards: int = 0
    team_slug: str = ""


# ─── Aggregated Team Intelligence ────────────────────
@dataclass
class PlayerStats:
    name: str
    dorsal: int = 0
    appearances: int = 0
    starts: int = 0
    goals: int = 0
    yellow_cards: int = 0
    red_cards: int = 0
    double_yellows: int = 0   # dismissals caused by 2nd yellow. Per FCF Art.336 neither yellow accumulates — NOT in yellow_cards
    minutes_played: int = 0
    minutes_goals: list[str] = field(default_factory=list)
    minutes_yellows: list[str] = field(default_factory=list)
    minutes_reds: list[str] = field(default_factory=list)
    goal_jornadas: list[int] = field(default_factory=list)          # jornada of each goal scored
    yellow_card_jornadas: list[int] = field(default_factory=list)   # jornada of each accumulable yellow
    red_card_jornadas: list[int] = field(default_factory=list)      # jornada of each direct red
    double_yellow_jornadas: list[int] = field(default_factory=list) # jornada of each double-yellow dismissal


@dataclass
class TeamIntelligence:
    """Aggregated from all actas for a specific team."""
    team_name: str
    players: dict[str, PlayerStats] = field(default_factory=dict)
    results: list[MatchResult] = field(default_factory=list)
    goals_by_period: dict[str, dict[str, int]] = field(default_factory=dict)
    # "0-15": {"scored": 2, "conceded": 7}
    total_yellows: int = 0
    total_reds: int = 0
    total_double_yellows: int = 0   # expulsions via 2nd yellow. NOT counted in total_yellows (FCF Art.336: neither yellow accumulates)
    wins: int = 0
    draws: int = 0
    losses: int = 0
    goals_scored: int = 0
    goals_conceded: int = 0
    form: list[str] = field(default_factory=list)


# ─── Validation Report ───────────────────────────────
@dataclass
class ValidationReport:
    total_checks: int = 0
    passed: int = 0
    failed: int = 0
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    cross_validation_results: list[str] = field(default_factory=list)

    @property
    def accuracy_pct(self) -> float:
        if self.total_checks == 0:
            return 0.0
        return (self.passed / self.total_checks) * 100

    def add_check(self, passed: bool, message: str):
        self.total_checks += 1
        if passed:
            self.passed += 1
        else:
            self.failed += 1
            self.errors.append(message)

    def summary(self) -> str:
        lines = [
            "=" * 60,
            "  VALIDATION REPORT",
            "=" * 60,
            f"  Total checks:  {self.total_checks}",
            f"  Passed:        {self.passed}",
            f"  Failed:        {self.failed}",
            f"  Accuracy:      {self.accuracy_pct:.1f}%",
            "-" * 60,
        ]
        if self.errors:
            lines.append("  ERRORS:")
            for e in self.errors:
                lines.append(f"    - {e}")
        if self.warnings:
            lines.append("  WARNINGS:")
            for w in self.warnings:
                lines.append(f"    - {w}")
        if self.cross_validation_results:
            lines.append("  CROSS-VALIDATION:")
            for c in self.cross_validation_results:
                lines.append(f"    - {c}")
        lines.append("=" * 60)
        return "\n".join(lines)


# ─── Serialization ────────────────────────────────────
class DataEncoder(json.JSONEncoder):
    def default(self, obj):
        if hasattr(obj, '__dataclass_fields__'):
            return asdict(obj)
        return super().default(obj)
