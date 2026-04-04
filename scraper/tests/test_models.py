"""Tests for scraper data models — validation and serialization."""
import pytest
from scraper.models import (
    TeamStanding,
    MatchResult,
    MatchReport,
    PlayerEntry,
    GoalEvent,
    CardEvent,
    SubstitutionEvent,
    TechnicalStaffMember,
    Scorer,
    DataEncoder,
)
import json


class TestTeamStanding:
    def test_goal_difference(self):
        ts = TeamStanding(
            position=1, name="FC Test", points=30,
            played=10, won=10, drawn=0, lost=0,
            goals_for=25, goals_against=5,
        )
        assert ts.goal_difference == 20

    def test_validate_passes_for_correct_data(self):
        ts = TeamStanding(
            position=1, name="FC Test", points=31,
            played=12, won=10, drawn=1, lost=1,
            goals_for=25, goals_against=5,
        )
        assert ts.validate() == []

    def test_validate_catches_wrong_wdl_sum(self):
        ts = TeamStanding(
            position=1, name="FC Test", points=30,
            played=12, won=10, drawn=0, lost=0,  # 10 != 12
            goals_for=25, goals_against=5,
        )
        errors = ts.validate()
        assert len(errors) == 1
        assert "W(10)+D(0)+L(0) != PJ(12)" in errors[0]

    def test_validate_catches_wrong_points(self):
        ts = TeamStanding(
            position=1, name="FC Test", points=99,  # should be 31
            played=12, won=10, drawn=1, lost=1,
            goals_for=25, goals_against=5,
        )
        errors = ts.validate()
        assert len(errors) == 1
        assert "Pts(99) != 3*W+D (31)" in errors[0]

    def test_validate_catches_home_away_mismatch(self):
        ts = TeamStanding(
            position=1, name="FC Test", points=31,
            played=12, won=10, drawn=1, lost=1,
            goals_for=25, goals_against=5,
            home_won=5, home_drawn=1, home_lost=0,  # 6
            away_won=4, away_drawn=0, away_lost=0,  # 4, total 10 != 12
        )
        errors = ts.validate()
        assert len(errors) == 1
        assert "Home(6)+Away(4) != PJ(12)" in errors[0]


class TestGoalEvent:
    def test_basic_goal(self):
        g = GoalEvent(player="Test Player", minute="45", team="home")
        assert g.player == "Test Player"
        assert g.minute == "45"
        assert g.goal_type == "normal"

    def test_penalty_goal(self):
        g = GoalEvent(player="Test", minute="78", team="away", goal_type="penalty")
        assert g.goal_type == "penalty"

    def test_own_goal(self):
        g = GoalEvent(player="Test", minute="12", team="home", goal_type="own_goal")
        assert g.goal_type == "own_goal"


class TestCardEvent:
    def test_yellow_card(self):
        c = CardEvent(
            player="Test", minute="30", team="home",
            card_type="yellow", recipient_type="player",
        )
        assert c.card_type == "yellow"
        assert c.is_double_yellow_dismissal is False

    def test_double_yellow(self):
        c = CardEvent(
            player="Test", minute="60", team="away",
            card_type="yellow", recipient_type="player",
            is_double_yellow_dismissal=True,
        )
        assert c.is_double_yellow_dismissal is True


class TestPlayerEntry:
    def test_starter(self):
        p = PlayerEntry(name="FONT FARRE, JOSEP", number=9, is_starter=True)
        assert p.is_starter is True
        assert p.number == 9

    def test_substitute(self):
        p = PlayerEntry(name="PUIG, ALEX", number=14, is_starter=False)
        assert p.is_starter is False


class TestMatchReport:
    def _make_report(self, **kwargs):
        defaults = dict(
            home_team="FC Home", away_team="FC Away",
            home_score=2, away_score=1,
            date="01-01-2026", time="18:00",
            venue="Camp Municipal",
            jornada=1,
        )
        defaults.update(kwargs)
        return MatchReport(**defaults)

    def test_basic_report(self):
        r = self._make_report()
        assert r.home_team == "FC Home"
        assert r.home_score == 2

    def test_report_with_events(self):
        r = self._make_report(
            goals=[GoalEvent("Player A", "23", "home")],
            yellow_cards=[CardEvent("Player B", "45", "away", "yellow", "player")],
        )
        assert len(r.goals) == 1
        assert len(r.yellow_cards) == 1


class TestScorer:
    def test_basic_scorer(self):
        s = Scorer(
            position=1, name="Top Scorer", team="FC Test",
            goals=15, penalties=3, matches=20,
            goals_per_match=0.75,
        )
        assert s.goals == 15
        assert s.goals_per_match == 0.75


class TestDataEncoder:
    def test_encodes_dataclass(self):
        ts = TeamStanding(
            position=1, name="FC Test", points=30,
            played=10, won=10, drawn=0, lost=0,
            goals_for=25, goals_against=5,
        )
        result = json.dumps(ts, cls=DataEncoder)
        data = json.loads(result)
        assert data["name"] == "FC Test"
        assert data["points"] == 30

    def test_encodes_nested_dataclass(self):
        g = GoalEvent(player="Test", minute="10", team="home")
        result = json.dumps(g, cls=DataEncoder)
        data = json.loads(result)
        assert data["player"] == "Test"
        assert data["minute"] == "10"
