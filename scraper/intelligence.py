"""
Team Intelligence Aggregator.

Processes all scraped acta data to build a comprehensive intelligence report
for any team in the competition. This is the analytical layer that transforms
raw data into coaching insights.
"""
import logging
from collections import defaultdict
from dataclasses import asdict

from .models import (
    MatchReport, TeamStanding, Scorer, PlayerStats,
    TeamIntelligence, MatchResult,
)

logger = logging.getLogger("fcf_scraper")

# Minute periods for goal distribution analysis
PERIODS = [
    ("0-15", 0, 15),
    ("16-30", 16, 30),
    ("31-45", 31, 45),
    ("46-60", 46, 60),
    ("61-75", 61, 75),
    ("76-90", 76, 90),
]


def _parse_minute_value(minute_str: str) -> int:
    """Convert minute string like '45+2' to an integer (47)."""
    try:
        if "+" in minute_str:
            parts = minute_str.split("+")
            return int(parts[0]) + int(parts[1])
        return int(minute_str.replace("'", "").strip())
    except (ValueError, IndexError):
        return 0


def _minute_to_period(minute: int) -> str:
    """Map a minute value to its period bucket."""
    for label, start, end in PERIODS:
        if start <= minute <= end:
            return label
    if minute > 90:
        return "76-90"
    return "0-15"


def build_team_intelligence(
    team_name: str,
    actas: list[MatchReport],
    standings: list[TeamStanding] | None = None,
) -> TeamIntelligence:
    """
    Build comprehensive intelligence for a specific team
    by analyzing all actas where they participated.
    """
    intel = TeamIntelligence(team_name=team_name)

    # Initialize goal distribution
    for label, _, _ in PERIODS:
        intel.goals_by_period[label] = {"scored": 0, "conceded": 0}

    team_keywords = _build_search_keywords(team_name)

    for acta in actas:
        is_home = _team_matches(acta.home_team, team_keywords)
        is_away = _team_matches(acta.away_team, team_keywords)

        if not is_home and not is_away:
            continue

        # ── Build match result ──
        if is_home:
            scored = acta.home_score
            conceded = acta.away_score
            lineup = acta.home_lineup
            bench = acta.home_bench
        else:
            scored = acta.away_score
            conceded = acta.home_score
            lineup = acta.away_lineup
            bench = acta.away_bench

        result = MatchResult(
            jornada=acta.jornada,
            date=acta.date,
            time=acta.time,
            home_team=acta.home_team,
            away_team=acta.away_team,
            home_score=acta.home_score,
            away_score=acta.away_score,
            venue=acta.venue,
        )
        intel.results.append(result)

        # ── Process player appearances ──
        for player in lineup:
            name = player.name
            if name not in intel.players:
                intel.players[name] = PlayerStats(name=name)
            intel.players[name].appearances += 1
            intel.players[name].starts += 1

        for player in bench:
            name = player.name
            if name not in intel.players:
                intel.players[name] = PlayerStats(name=name)
            # Only count as appearance if they actually came on (via substitutions)
            # For now count bench listing
            # We'll refine with substitution data below

        # ── Process goals ──
        for goal in acta.goals:
            minute_val = _parse_minute_value(goal.minute)
            period = _minute_to_period(minute_val)

            # Determine if this goal was scored by or against our team
            goal_player_lower = goal.player.lower()

            # Check if the scorer is in our lineup
            is_our_goal = False
            all_our_players = [p.name.lower() for p in lineup + bench]

            if goal.team == ("home" if is_home else "away"):
                is_our_goal = True
            elif goal.team == ("away" if is_home else "home"):
                is_our_goal = False
            else:
                # Fallback: check if player name matches our roster
                is_our_goal = any(goal_player_lower in p or p in goal_player_lower for p in all_our_players)

            if is_our_goal:
                intel.goals_by_period[period]["scored"] += 1
                # Track individual scorer
                for p_name in intel.players:
                    if goal_player_lower in p_name.lower() or p_name.lower() in goal_player_lower:
                        intel.players[p_name].goals += 1
                        intel.players[p_name].minutes_goals.append(goal.minute)
                        break
            else:
                intel.goals_by_period[period]["conceded"] += 1

        # ── Process cards ──
        our_players = [p.name.lower() for p in lineup + bench]

        for card in acta.yellow_cards:
            card_player_lower = card.player.lower()
            is_ours = False
            if card.team == ("home" if is_home else "away"):
                is_ours = True
            elif card.team:
                is_ours = False
            else:
                is_ours = any(card_player_lower in p or p in card_player_lower for p in our_players)

            if is_ours:
                intel.total_yellows += 1
                for p_name in intel.players:
                    if card_player_lower in p_name.lower() or p_name.lower() in card_player_lower:
                        intel.players[p_name].yellow_cards += 1
                        intel.players[p_name].minutes_yellows.append(card.minute)
                        break

        for card in acta.red_cards:
            card_player_lower = card.player.lower()
            is_ours = False
            if card.team == ("home" if is_home else "away"):
                is_ours = True
            elif card.team:
                is_ours = False
            else:
                is_ours = any(card_player_lower in p or p in card_player_lower for p in our_players)

            if is_ours:
                intel.total_reds += 1
                for p_name in intel.players:
                    if card_player_lower in p_name.lower() or p_name.lower() in card_player_lower:
                        intel.players[p_name].red_cards += 1
                        intel.players[p_name].minutes_reds.append(card.minute)
                        break

    logger.info(
        f"Intelligence for {team_name}: "
        f"{len(intel.results)} matches, "
        f"{len(intel.players)} players tracked, "
        f"{intel.total_yellows} yellows, {intel.total_reds} reds"
    )

    return intel


def compute_conditional_insights(intel: TeamIntelligence) -> list[dict]:
    """
    Compute conditional insights like:
    - "When they concede in the first 30 min, they lose X% of the time"
    - "When they score first, they win X% of the time"
    """
    insights = []

    if not intel.results:
        return insights

    total_matches = len(intel.results)

    # ── When they concede early (first 30 min) ──
    # This requires cross-referencing with goal minutes from actas
    # For now we compute from results

    # ── Score first analysis ──
    # Would need minute-level goal data from actas

    # ── Home vs Away record ──
    home_w = home_d = home_l = 0
    away_w = away_d = away_l = 0
    team_keywords = _build_search_keywords(intel.team_name)

    for r in intel.results:
        is_home_r = _team_matches(r.home_team, team_keywords)
        if is_home_r:
            scored, conceded = r.home_score, r.away_score
        else:
            scored, conceded = r.away_score, r.home_score

        if scored > conceded:
            if is_home_r:
                home_w += 1
            else:
                away_w += 1
        elif scored == conceded:
            if is_home_r:
                home_d += 1
            else:
                away_d += 1
        else:
            if is_home_r:
                home_l += 1
            else:
                away_l += 1

    home_total = home_w + home_d + home_l
    away_total = away_w + away_d + away_l

    if home_total > 0:
        insights.append({
            "type": "home_record",
            "label": f"Casa: {home_w}V {home_d}E {home_l}D",
            "detail": f"{home_total} partidos en casa",
            "win_pct": round(home_w / home_total * 100, 1),
        })

    if away_total > 0:
        insights.append({
            "type": "away_record",
            "label": f"Fuera: {away_w}V {away_d}E {away_l}D",
            "detail": f"{away_total} partidos fuera",
            "win_pct": round(away_w / away_total * 100, 1),
        })

    # ── Points per last N matches (form) ──
    recent = intel.results[-5:] if len(intel.results) >= 5 else intel.results
    form_str = ""
    recent_pts = 0
    for r in recent:
        is_home_r = _team_matches(r.home_team, team_keywords)
        scored = r.home_score if is_home_r else r.away_score
        conceded = r.away_score if is_home_r else r.home_score
        if scored > conceded:
            form_str += "V"
            recent_pts += 3
        elif scored == conceded:
            form_str += "E"
            recent_pts += 1
        else:
            form_str += "D"

    if form_str:
        insights.append({
            "type": "recent_form",
            "label": f"Racha (Últ. {len(recent)}): {'-'.join(form_str)}",
            "detail": f"{recent_pts} de {len(recent) * 3} puntos posibles",
        })

    # ── Goals per period analysis ──
    max_scored_period = max(intel.goals_by_period.items(), key=lambda x: x[1]["scored"], default=None)
    max_conceded_period = max(intel.goals_by_period.items(), key=lambda x: x[1]["conceded"], default=None)

    if max_scored_period and max_scored_period[1]["scored"] > 0:
        insights.append({
            "type": "strongest_period",
            "label": f"Más peligrosos en min {max_scored_period[0]}",
            "detail": f"{max_scored_period[1]['scored']} goles marcados en esa franja",
        })

    if max_conceded_period and max_conceded_period[1]["conceded"] > 0:
        insights.append({
            "type": "weakest_period",
            "label": f"Más vulnerables en min {max_conceded_period[0]}",
            "detail": f"{max_conceded_period[1]['conceded']} goles encajados en esa franja",
        })

    return insights


# ─── Fuzzy Team Matching Helpers ──────────────────────

def _normalize(text: str) -> str:
    """Normalize text: lowercase, remove accents, strip punctuation."""
    text = text.lower().strip()
    replacements = {
        "à": "a", "è": "e", "é": "e", "í": "i", "ò": "o", "ó": "o",
        "ú": "u", "ü": "u", "ç": "c", "ñ": "n", "'": "", ",": "", ".": "",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def _build_search_keywords(team_name: str) -> list[str]:
    """Build multiple search keywords from a team name for fuzzy matching."""
    normalized = _normalize(team_name)
    keywords = [normalized]

    # Split into words and use significant ones (>= 3 chars)
    words = normalized.split()
    significant = [w for w in words if len(w) >= 3 and w not in ("del", "de", "los", "las", "les")]
    keywords.extend(significant)

    return keywords


def _team_matches(full_name: str, keywords: list[str]) -> bool:
    """Check if a full team name matches any of the search keywords."""
    normalized = _normalize(full_name)
    return any(kw in normalized for kw in keywords)
