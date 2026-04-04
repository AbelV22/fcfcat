"""Tests for compute_scorers_from_actas — pure function, no network."""
import pytest
from scraper.scorers import compute_scorers_from_actas
from scraper.models import MatchReport, PlayerEntry, GoalEvent


def _make_acta(
    home_team="FC Home", away_team="FC Away",
    home_score=0, away_score=0,
    goals=None, home_lineup=None, away_lineup=None,
    home_bench=None, away_bench=None,
) -> MatchReport:
    return MatchReport(
        home_team=home_team, away_team=away_team,
        home_score=home_score, away_score=away_score,
        date="01-01-2026", time="18:00",
        venue="Camp Municipal",
        jornada=1,
        home_lineup=home_lineup or [],
        home_bench=home_bench or [],
        away_lineup=away_lineup or [],
        away_bench=away_bench or [],
        goals=goals or [],
    )


class TestComputeScorersFromActas:
    def test_empty_actas(self):
        result = compute_scorers_from_actas([])
        assert result == []

    def test_single_goal(self):
        acta = _make_acta(
            home_score=1, away_score=0,
            goals=[GoalEvent("Player A", "23", "home")],
            home_lineup=[PlayerEntry("Player A", 9)],
        )
        scorers = compute_scorers_from_actas([acta])
        assert len(scorers) == 1
        assert scorers[0].name == "Player A"
        assert scorers[0].goals == 1
        assert scorers[0].team == "FC Home"
        assert scorers[0].position == 1

    def test_multiple_goals_same_player(self):
        acta = _make_acta(
            home_score=3, away_score=0,
            goals=[
                GoalEvent("Player A", "10", "home"),
                GoalEvent("Player A", "45", "home"),
                GoalEvent("Player A", "78", "home"),
            ],
            home_lineup=[PlayerEntry("Player A", 9)],
        )
        scorers = compute_scorers_from_actas([acta])
        assert len(scorers) == 1
        assert scorers[0].goals == 3

    def test_sorted_by_goals_descending(self):
        acta = _make_acta(
            home_score=2, away_score=1,
            goals=[
                GoalEvent("Scorer B", "10", "home"),
                GoalEvent("Scorer A", "45", "home"),
                GoalEvent("Scorer A", "78", "away"),
                GoalEvent("Scorer A", "89", "away"),
            ],
        )
        scorers = compute_scorers_from_actas([acta])
        assert scorers[0].name == "Scorer A"
        assert scorers[0].goals == 3
        assert scorers[1].name == "Scorer B"
        assert scorers[1].goals == 1

    def test_goals_per_match_calculated(self):
        actas = [
            _make_acta(
                home_team="A", away_team="B", home_score=1,
                goals=[GoalEvent("Player X", "10", "home")],
                home_lineup=[PlayerEntry("Player X", 9)],
            ),
            _make_acta(
                home_team="A", away_team="C", home_score=2,
                goals=[
                    GoalEvent("Player X", "20", "home"),
                    GoalEvent("Player X", "40", "home"),
                ],
                home_lineup=[PlayerEntry("Player X", 9)],
            ),
        ]
        scorers = compute_scorers_from_actas(actas)
        assert scorers[0].goals == 3
        assert scorers[0].matches == 2  # appeared in 2 actas
        assert scorers[0].goals_per_match == 1.5

    def test_empty_player_name_ignored(self):
        acta = _make_acta(
            goals=[GoalEvent("", "10", "home")],
        )
        scorers = compute_scorers_from_actas([acta])
        assert len(scorers) == 0

    def test_away_team_attribution(self):
        acta = _make_acta(
            home_team="FC Home", away_team="FC Away",
            away_score=1,
            goals=[GoalEvent("Away Scorer", "55", "away")],
        )
        scorers = compute_scorers_from_actas([acta])
        assert scorers[0].team == "FC Away"

    def test_appearances_from_lineups(self):
        actas = [
            _make_acta(
                home_lineup=[PlayerEntry("Player X", 9)],
                away_lineup=[PlayerEntry("Player Y", 10)],
                goals=[GoalEvent("Player X", "10", "home")],
            ),
            _make_acta(
                home_lineup=[PlayerEntry("Player X", 9)],
                goals=[],
            ),
        ]
        scorers = compute_scorers_from_actas(actas)
        assert scorers[0].matches == 2  # Player X appeared in 2 matches
