"""
Team Intelligence Aggregator.

Processes all scraped acta data to build a comprehensive intelligence report
for any team in the competition. This is the analytical layer that transforms
raw data into coaching insights.
"""
import logging
from collections import defaultdict
from dataclasses import asdict
from typing import Optional

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
    standings: Optional[list[TeamStanding]] = None,
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

    # Sort by jornada so form list is always chronological
    sorted_actas = sorted(actas, key=lambda a: (a.jornada, a.date))

    for acta in sorted_actas:
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
        
        intel.goals_scored += scored
        intel.goals_conceded += conceded
        if scored > conceded:
            intel.wins += 1
            intel.form.append("W")
        elif scored == conceded:
            intel.draws += 1
            intel.form.append("D")
        else:
            intel.losses += 1
            intel.form.append("L")

        # Keep track of minutes played in this match
        match_players_names = [p.name for p in lineup + bench]
        match_minutes = {p.name: 90 if p.is_starter else 0 for p in lineup + bench}
        team_side = "home" if is_home else "away"

        # ── Process substitutions for minutes ──
        for sub in acta.substitutions:
            if sub.team == team_side:
                minute_val = _parse_minute_value(sub.minute)
                
                out_name = _find_best_player_match(sub.player_out, match_players_names)
                if out_name:
                    match_minutes[out_name] = min(minute_val, match_minutes[out_name])
                    
                in_name = _find_best_player_match(sub.player_in, match_players_names)
                if in_name:
                    match_minutes[in_name] += max(0, 90 - minute_val)

        # ── Adjust minutes for all dismissals (direct reds + double-yellow reds) ──
        # Collect direct reds first, then add double-yellow dismissals from yellow_cards.
        dismissal_cards = list(acta.red_cards)
        for yc in acta.yellow_cards:
            if yc.is_double_yellow_dismissal and yc.team == team_side:
                dismissal_cards.append(yc)

        for card in dismissal_cards:
            if card.team == team_side:
                minute_val = _parse_minute_value(card.minute)
                card_name = _find_best_player_match(card.player, match_players_names)
                if card_name and match_minutes.get(card_name, 0) > 0:
                    # Player didn't finish the game — reduce minutes from this point
                    match_minutes[card_name] -= max(0, 90 - minute_val)
                    match_minutes[card_name] = max(0, match_minutes[card_name])

        # ── Process player appearances ──
        for player in lineup:
            name = player.name
            if name not in intel.players:
                intel.players[name] = PlayerStats(name=name, dorsal=player.number)
            elif intel.players[name].dorsal == 0 and player.number > 0:
                intel.players[name].dorsal = player.number
            
            intel.players[name].appearances += 1
            intel.players[name].starts += 1
            intel.players[name].minutes_played += match_minutes.get(name, 90)

        for player in bench:
            name = player.name
            if name not in intel.players:
                intel.players[name] = PlayerStats(name=name, dorsal=player.number)
            elif intel.players[name].dorsal == 0 and player.number > 0:
                intel.players[name].dorsal = player.number
                
            # Only count as appearance if they actually played > 0 mins
            mins = match_minutes.get(name, 0)
            if mins > 0:
                intel.players[name].appearances += 1
                intel.players[name].minutes_played += mins

        # ── Process goals ──
        for goal in acta.goals:
            minute_val = _parse_minute_value(goal.minute)
            period = _minute_to_period(minute_val)

            is_our_goal = False
            if goal.team == team_side:
                is_our_goal = True
            elif goal.team:
                is_our_goal = False
            else:
                is_our_goal = _find_best_player_match(goal.player, match_players_names) is not None

            if is_our_goal:
                intel.goals_by_period[period]["scored"] += 1
                scorer_name = _find_best_player_match(goal.player, list(intel.players.keys()))
                if scorer_name:
                    intel.players[scorer_name].goals += 1
                    intel.players[scorer_name].minutes_goals.append(goal.minute)
            else:
                intel.goals_by_period[period]["conceded"] += 1

        # ── Process cards ──
        #
        # FCF / RFEF accumulation rule (Art. 336):
        #   • Doble amarilla (2× groga-s same match):  1 match auto-suspension, but
        #     NEITHER yellow counts toward the 5-yellow accumulation cycle.
        #   • Amarilla + roja directa (different infractions): the yellow DOES accumulate;
        #     the red card generates its own sanction independently.
        #
        # Implementation:
        #   1. Pre-scan yellow_cards for players dismissed via double yellow.
        #   2. For those players, skip accumulation for both their yellows.
        #   3. For all other yellows (single or yellow-before-direct-red) → accumulate normally.

        # Build set of player keys that received a double-yellow dismissal in this match
        double_yellow_dismissed: set[str] = set()
        for card in acta.yellow_cards:
            if not card.is_double_yellow_dismissal:
                continue
            is_ours = (
                card.team == team_side if card.team
                else _find_best_player_match(card.player, match_players_names) is not None
            )
            if is_ours:
                double_yellow_dismissed.add(card.player.strip().lower())

        for card in acta.yellow_cards:
            is_ours = False
            if card.team == team_side:
                is_ours = True
            elif card.team:
                is_ours = False
            else:
                is_ours = _find_best_player_match(card.player, match_players_names) is not None

            if not is_ours:
                continue

            player_key = card.player.strip().lower()
            is_double_yellow_player = player_key in double_yellow_dismissed

            if is_double_yellow_player:
                # Neither yellow from a double-yellow dismissal accumulates.
                # We only count the dismissal itself (once, on the 2nd yellow).
                if card.is_double_yellow_dismissal:
                    intel.total_double_yellows += 1
                    card_name = _find_best_player_match(card.player, list(intel.players.keys()))
                    if card_name:
                        intel.players[card_name].double_yellows += 1
                # Skip accumulation for BOTH yellows (don't touch yellow_cards counter)
            else:
                # Regular yellow (or 1st yellow before a direct red) → accumulates normally.
                intel.total_yellows += 1
                card_name = _find_best_player_match(card.player, list(intel.players.keys()))
                if card_name:
                    intel.players[card_name].yellow_cards += 1
                    intel.players[card_name].minutes_yellows.append(card.minute)

        for card in acta.red_cards:
            is_ours = False
            if card.team == team_side:
                is_ours = True
            elif card.team:
                is_ours = False
            else:
                is_ours = _find_best_player_match(card.player, match_players_names) is not None

            if is_ours:
                intel.total_reds += 1
                card_name = _find_best_player_match(card.player, list(intel.players.keys()))
                if card_name:
                    intel.players[card_name].red_cards += 1
                    intel.players[card_name].minutes_reds.append(card.minute)

    logger.info(
        f"Intelligence for {team_name}: "
        f"{len(intel.results)} matches, "
        f"{len(intel.players)} players tracked, "
        f"{intel.total_yellows} yellows ({intel.total_double_yellows} dobles), {intel.total_reds} direct reds"
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


# ─── Rival Report ─────────────────────────────────────

def build_rival_report(
    our_team: str,
    rival_team: str,
    rival_intel: TeamIntelligence,
    actas: list[MatchReport],
    standings: Optional[list[TeamStanding]] = None,
    sanctions: Optional[list] = None,
) -> dict:
    """
    Build a comprehensive rival scouting report.
    Only uses data we CAN realistically extract from FCF actas.
    """
    report: dict = {}
    our_kw = _build_search_keywords(our_team)
    rival_kw = _build_search_keywords(rival_team)

    # ── Rival standing ──
    rival_standing = None
    our_standing = None
    if standings:
        for s in standings:
            if _team_matches(s.name, rival_kw):
                rival_standing = s
            if _team_matches(s.name, our_kw):
                our_standing = s

    if rival_standing:
        report["standing"] = {
            "position": rival_standing.position,
            "points": rival_standing.points,
            "played": rival_standing.played,
            "won": rival_standing.won,
            "drawn": rival_standing.drawn,
            "lost": rival_standing.lost,
            "goals_for": rival_standing.goals_for,
            "goals_against": rival_standing.goals_against,
            "goal_difference": rival_standing.goal_difference,
            "home_record": f"{rival_standing.home_won}V {rival_standing.home_drawn}E {rival_standing.home_lost}D",
            "away_record": f"{rival_standing.away_won}V {rival_standing.away_drawn}E {rival_standing.away_lost}D",
        }

    # ── Probable XI (most starts) ──
    players = list(rival_intel.players.values())
    total_matches = len(rival_intel.results)
    starters = sorted(
        [p for p in players if p.starts > 0],
        key=lambda p: p.starts,
        reverse=True
    )
    report["probable_xi"] = [
        {
            "name": p.name,
            "dorsal": p.dorsal,
            "starts": p.starts,
            "appearances": p.appearances,
            "pct": round(p.starts / max(total_matches, 1) * 100) if total_matches else 0,
        }
        for p in starters[:11]
    ]

    # ── Top scorers ──
    scorers = sorted(
        [p for p in players if p.goals > 0],
        key=lambda p: p.goals,
        reverse=True
    )
    total_goals = rival_intel.goals_scored
    report["top_scorers"] = [
        {
            "name": p.name,
            "dorsal": p.dorsal,
            "goals": p.goals,
            "appearances": p.appearances,
            "pct_of_total": round(p.goals / max(total_goals, 1) * 100),
            "goal_minutes": p.minutes_goals[:5],  # latest 5
        }
        for p in scorers[:8]
    ]

    # ── Cards & warnings (apercibidos) ──
    # FCF accumulation rule (Art. 336):
    #   • yellow_cards  = only accumulation yellows (single cards, or yellow before direct red).
    #   • double_yellows = dismissals via 2nd yellow — DO NOT count toward yellow_cards.
    #   • Threshold: 5 yellows in same cycle → 1-match auto-suspension → counter resets to 0.
    #   • apercibido: player is at 4 in their current cycle (one away from suspension).
    carded = sorted(
        [p for p in players if p.yellow_cards > 0 or p.red_cards > 0],
        key=lambda p: (p.yellow_cards + p.red_cards * 3 + p.double_yellows * 2),
        reverse=True
    )
    report["cards"] = [
        {
            "name": p.name,
            "dorsal": p.dorsal,
            "yellows": p.yellow_cards,
            "reds": p.red_cards,
            "double_yellows": p.double_yellows,  # dismissals via 2nd yellow
            # apercibido: at risk of next suspension.
            # yellow_cards % 5 gives position in current accumulation cycle.
            "apercibido": (p.yellow_cards % 5) == 4,
            "yellows_in_cycle": p.yellow_cards % 5,  # how far into current cycle (0-4)
        }
        for p in carded[:10]
    ]
    report["total_yellows"] = rival_intel.total_yellows
    report["total_reds"] = rival_intel.total_reds
    report["total_double_yellows"] = rival_intel.total_double_yellows

    # ── Sanctioned rival players ──
    if sanctions:
        rival_sanctions = [
            {"player": s.player, "matches": s.matches_suspended, "reason": s.reason}
            for s in sanctions
            if _team_matches(s.team, rival_kw)
        ]
        report["sanctions"] = rival_sanctions
    else:
        report["sanctions"] = []

    # ── Goals by period ──
    report["goals_by_period"] = rival_intel.goals_by_period

    # ── Form (last 5) ──
    report["form"] = rival_intel.form[-5:] if rival_intel.form else []
    report["record"] = {
        "wins": rival_intel.wins,
        "draws": rival_intel.draws,
        "losses": rival_intel.losses,
        "goals_scored": rival_intel.goals_scored,
        "goals_conceded": rival_intel.goals_conceded,
    }

    # ── Last 5 results ──
    last_results = rival_intel.results[-5:] if rival_intel.results else []
    report["recent_results"] = []
    for r in reversed(last_results):
        is_home = _team_matches(r.home_team, rival_kw)
        scored = r.home_score if is_home else r.away_score
        conceded = r.away_score if is_home else r.home_score
        res = "V" if scored > conceded else ("E" if scored == conceded else "D")
        report["recent_results"].append({
            "jornada": r.jornada,
            "date": r.date,
            "home_team": r.home_team,
            "away_team": r.away_team,
            "home_score": r.home_score,
            "away_score": r.away_score,
            "rival_side": "home" if is_home else "away",
            "result": res,
        })

    # ── Head-to-head ──
    h2h_matches = []
    for acta in actas:
        home_is_us = _team_matches(acta.home_team, our_kw)
        away_is_us = _team_matches(acta.away_team, our_kw)
        home_is_rival = _team_matches(acta.home_team, rival_kw)
        away_is_rival = _team_matches(acta.away_team, rival_kw)

        if (home_is_us and away_is_rival) or (away_is_us and home_is_rival):
            h2h_matches.append(acta)

    report["h2h"] = {"matches": [], "our_wins": 0, "draws": 0, "rival_wins": 0}
    for acta in h2h_matches:
        home_is_us = _team_matches(acta.home_team, our_kw)
        our_score = acta.home_score if home_is_us else acta.away_score
        rival_score = acta.away_score if home_is_us else acta.home_score
        if our_score > rival_score:
            report["h2h"]["our_wins"] += 1
        elif our_score == rival_score:
            report["h2h"]["draws"] += 1
        else:
            report["h2h"]["rival_wins"] += 1

        report["h2h"]["matches"].append({
            "jornada": acta.jornada,
            "date": acta.date,
            "home_team": acta.home_team,
            "away_team": acta.away_team,
            "home_score": acta.home_score,
            "away_score": acta.away_score,
        })

    # ── Comparativa directa (nuestro equipo vs rival) ──
    if our_standing and rival_standing:
        report["comparison"] = {
            "our_position": our_standing.position,
            "rival_position": rival_standing.position,
            "our_points": our_standing.points,
            "rival_points": rival_standing.points,
            "our_gf": our_standing.goals_for,
            "rival_gf": rival_standing.goals_for,
            "our_gc": our_standing.goals_against,
            "rival_gc": rival_standing.goals_against,
            "our_diff": our_standing.goal_difference,
            "rival_diff": rival_standing.goal_difference,
        }

    logger.info(
        f"Rival report for {rival_team}: "
        f"{len(report.get('probable_xi', []))} probable starters, "
        f"{len(report.get('top_scorers', []))} scorers, "
        f"{len(h2h_matches)} H2H matches"
    )

    return report


# ─── Referee Intelligence ─────────────────────────────

def build_referee_intelligence(
    referee_name: str,
    global_refs: list[dict],
    competition: str,
    our_team: Optional[str] = None,
) -> dict:
    """
    Build intelligence about a specific referee from the global database.
    Only considers matches from the same competition.
    """
    ref_kw = _normalize(referee_name)
    our_kw = _build_search_keywords(our_team) if our_team else []

    # 15-minute period buckets for card distribution analysis
    CARD_PERIODS = ["0-15", "16-30", "31-45", "46-60", "61-75", "76-90"]

    ref_matches = []
    for acta in global_refs:
        if acta.get("competition") != competition:
            continue

        for ref in acta.get("referees", []):
            if ref_kw in _normalize(ref):
                ref_matches.append(acta)
                break

    if not ref_matches:
        return {"name": referee_name, "matches": 0}

    total = len(ref_matches)

    # ── Running totals ──
    total_yellows = 0           # player yellows (accumulation type)
    total_reds = 0              # direct red cards (players)
    total_double_yellows = 0    # double-yellow dismissals (players)
    total_staff_yellows = 0     # technical staff yellow cards
    total_staff_reds = 0        # technical staff red cards

    home_yellows = 0
    away_yellows = 0
    home_reds = 0
    away_reds = 0
    home_staff_yellows = 0
    away_staff_yellows = 0
    home_staff_reds = 0
    away_staff_reds = 0

    matches_with_expulsion = 0      # at least 1 red or double-yellow dismissal
    matches_with_staff_card = 0     # at least 1 tech staff card

    first_half_cards = 0
    second_half_cards = 0
    period_dist: dict[str, int] = {p: 0 for p in CARD_PERIODS}

    home_wins = 0
    away_wins = 0
    draws = 0
    our_history = []
    match_history = []

    for acta in ref_matches:
        home_team = acta.get("home_team", "")
        away_team = acta.get("away_team", "")
        home_score = acta.get("home_score", 0)
        away_score = acta.get("away_score", 0)
        yellow_cards = acta.get("yellow_cards", [])
        red_cards = acta.get("red_cards", [])

        # ── Classify every card by team / recipient ──
        def _is_staff(c: dict) -> bool:
            return c.get("recipient_type", "player") == "technical_staff"

        def _is_double_yellow(c: dict) -> bool:
            return c.get("is_double_yellow_dismissal", False)

        match_yc_home = sum(1 for c in yellow_cards if c.get("team") == "home" and not _is_staff(c))
        match_yc_away = sum(1 for c in yellow_cards if c.get("team") == "away" and not _is_staff(c))
        match_rc_home = sum(1 for c in red_cards if c.get("team") == "home" and not _is_staff(c))
        match_rc_away = sum(1 for c in red_cards if c.get("team") == "away" and not _is_staff(c))
        match_dy = sum(1 for c in yellow_cards if _is_double_yellow(c) and not _is_staff(c))
        match_sy_home = sum(1 for c in yellow_cards if c.get("team") == "home" and _is_staff(c))
        match_sy_away = sum(1 for c in yellow_cards if c.get("team") == "away" and _is_staff(c))
        match_sr_home = sum(1 for c in red_cards if c.get("team") == "home" and _is_staff(c))
        match_sr_away = sum(1 for c in red_cards if c.get("team") == "away" and _is_staff(c))

        total_yellows += match_yc_home + match_yc_away
        total_reds += match_rc_home + match_rc_away
        total_double_yellows += match_dy
        total_staff_yellows += match_sy_home + match_sy_away
        total_staff_reds += match_sr_home + match_sr_away

        home_yellows += match_yc_home
        away_yellows += match_yc_away
        home_reds += match_rc_home
        away_reds += match_rc_away
        home_staff_yellows += match_sy_home
        away_staff_yellows += match_sy_away
        home_staff_reds += match_sr_home
        away_staff_reds += match_sr_away

        # Expulsion = any direct red or double-yellow dismissal (player only)
        if match_rc_home + match_rc_away + match_dy > 0:
            matches_with_expulsion += 1

        # Staff card match
        if match_sy_home + match_sy_away + match_sr_home + match_sr_away > 0:
            matches_with_staff_card += 1

        # ── Card timing (all cards including staff) ──
        for card in yellow_cards + red_cards:
            m = _parse_minute_value(card.get("minute", "0"))
            if m <= 45:
                first_half_cards += 1
            else:
                second_half_cards += 1
            # 15-min bucket
            for label, start, end in PERIODS:
                if start <= m <= end:
                    period_dist[label] = period_dist.get(label, 0) + 1
                    break

        # ── Match result ──
        if home_score > away_score:
            home_wins += 1
        elif home_score < away_score:
            away_wins += 1
        else:
            draws += 1

        match_info = {
            "jornada": acta.get("jornada", 0),
            "date": acta.get("date", ""),
            "home_team": home_team,
            "away_team": away_team,
            "home_score": home_score,
            "away_score": away_score,
            # Player cards
            "yellows_home": match_yc_home,
            "yellows_away": match_yc_away,
            "reds_home": match_rc_home,
            "reds_away": match_rc_away,
            "double_yellows": match_dy,
            # Staff cards
            "staff_yellows_home": match_sy_home,
            "staff_yellows_away": match_sy_away,
            "staff_reds_home": match_sr_home,
            "staff_reds_away": match_sr_away,
            # Convenience totals
            "yellows": match_yc_home + match_yc_away,
            "reds": match_rc_home + match_rc_away,
            "staff_cards": match_sy_home + match_sy_away + match_sr_home + match_sr_away,
        }
        match_history.append(match_info)

        # ── Our history with this referee ──
        if our_kw:
            we_play = _team_matches(home_team, our_kw) or _team_matches(away_team, our_kw)
            if we_play:
                our_is_home = _team_matches(home_team, our_kw)
                our_score = home_score if our_is_home else away_score
                their_score = away_score if our_is_home else home_score
                res = "V" if our_score > their_score else ("E" if our_score == their_score else "D")
                our_cards_yc = match_yc_home if our_is_home else match_yc_away
                our_cards_rc = match_rc_home if our_is_home else match_rc_away
                our_staff_yc = match_sy_home if our_is_home else match_sy_away
                our_staff_rc = match_sr_home if our_is_home else match_sr_away
                our_history.append({
                    **match_info,
                    "our_result": res,
                    "our_yellows": our_cards_yc,
                    "our_reds": our_cards_rc,
                    "our_staff_yellows": our_staff_yc,
                    "our_staff_reds": our_staff_rc,
                })

    total_player_cards = total_yellows + total_reds
    total_all_cards = total_player_cards + total_staff_yellows + total_staff_reds

    # ── Home/away bias — do away teams get more cards? ──
    home_card_total = home_yellows + home_reds
    away_card_total = away_yellows + away_reds

    report = {
        "name": referee_name,
        "matches": total,

        # ── Player cards ──
        "total_yellows": total_yellows,
        "total_reds": total_reds,
        "total_double_yellows": total_double_yellows,
        "yellows_per_match": round(total_yellows / total, 2),
        "reds_per_match": round(total_reds / total, 2),

        # ── Technical staff cards ──
        "total_staff_yellows": total_staff_yellows,
        "total_staff_reds": total_staff_reds,
        "staff_cards_per_match": round((total_staff_yellows + total_staff_reds) / total, 2),
        "matches_with_staff_card": matches_with_staff_card,
        "staff_card_match_pct": round(matches_with_staff_card / total * 100, 1),

        # ── Home / away breakdown ──
        "home_yellows": home_yellows,
        "away_yellows": away_yellows,
        "home_reds": home_reds,
        "away_reds": away_reds,
        "home_staff_yellows": home_staff_yellows,
        "away_staff_yellows": away_staff_yellows,
        "home_staff_reds": home_staff_reds,
        "away_staff_reds": away_staff_reds,
        # Away bias: pct of all player cards given to away team
        "away_player_card_pct": round(
            away_card_total / max(home_card_total + away_card_total, 1) * 100, 1
        ),

        # ── Expulsions ──
        "matches_with_expulsion": matches_with_expulsion,
        "expulsion_pct": round(matches_with_expulsion / total * 100, 1),

        # ── Card timing ──
        "first_half_cards": first_half_cards,
        "second_half_cards": second_half_cards,
        "second_half_card_pct": round(
            second_half_cards / max(total_all_cards, 1) * 100, 1
        ),
        "cards_by_period": period_dist,  # {"0-15": n, "16-30": n, ...}

        # ── Results ──
        "home_wins": home_wins,
        "away_wins": away_wins,
        "draws": draws,
        "home_win_pct": round(home_wins / total * 100, 1),
        "away_win_pct": round(away_wins / total * 100, 1),

        # ── Match history ──
        "match_history": sorted(match_history, key=lambda x: x["jornada"])[-5:],
        "our_history": our_history,
    }

    logger.info(
        f"Referee intel for {referee_name}: "
        f"{total} matches | "
        f"player YC:{total_yellows} RC:{total_reds} DY:{total_double_yellows} | "
        f"staff YC:{total_staff_yellows} RC:{total_staff_reds}"
    )

    return report


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


def _find_best_player_match(search_name: str, roster_names: list[str]) -> Optional[str]:
    """Find the best matching player name from the roster."""
    if not search_name or not roster_names:
        return None
        
    s_norm = _normalize(search_name)
    
    # 1. Exact or simple substring
    for r in roster_names:
        r_norm = _normalize(r)
        if s_norm == r_norm or s_norm in r_norm or r_norm in s_norm:
            return r
            
    # 2. Word overlap (at least 1 significant word)
    s_words = set(w for w in s_norm.split() if len(w) >= 3 and w not in ("del", "de", "los", "las", "les"))
    if not s_words:
        return None
        
    best_match = None
    best_score = 0
    for r in roster_names:
        r_words = set(w for w in _normalize(r).split() if len(w) >= 3)
        score = len(s_words.intersection(r_words))
        if score > best_score:
            best_score = score
            best_match = r
            
    if best_score > 0:
        return best_match
        
    return None

