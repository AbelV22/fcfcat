"""
Scraper for FCF top scorers (golejadors).

NOTE: The FCF golejadors page loads data via JavaScript which we cannot
execute with a simple HTTP scraper. Instead, we provide TWO approaches:

1. scrape_scorers() - Attempts to parse the static HTML table (works if data
   is server-rendered; returns empty if JS-loaded)
2. compute_scorers_from_actas() - Computes scorer rankings from acta data
   (the authoritative source)

The cross-validator will compare both sources when available.
"""
import logging
import re
from collections import defaultdict

from .http_client import FCFClient
from .models import Scorer, MatchReport

logger = logging.getLogger("fcf_scraper")


def scrape_scorers(client: FCFClient, url: str) -> list[Scorer]:
    """
    Attempt to scrape the top scorers table.
    May return empty if data is JS-loaded.
    """
    soup = client.fetch_soup(url)
    table = soup.find("table", class_="fcftable-e")

    if not table:
        logger.warning("Scorers table not found (may be JS-loaded)")
        return []

    # Try tbody first, then all rows
    tbody = table.find("tbody")
    rows = tbody.find_all("tr") if tbody else table.find_all("tr")

    scorers: list[Scorer] = []

    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 5:
            continue

        try:
            position = int(cols[0].get_text(strip=True))

            player_link = cols[1].find("a")
            name = player_link.get_text(strip=True) if player_link else cols[1].get_text(strip=True)
            player_url = player_link.get("href", "") if player_link else ""

            team_link = cols[3].find("a")
            team_name = team_link.get_text(strip=True) if team_link else cols[3].get_text(strip=True)
            team_slug = ""
            if team_link and team_link.get("href"):
                parts = team_link["href"].rstrip("/").split("/")
                team_slug = parts[-1] if parts else ""

            goals_text = cols[4].get_text(strip=True)
            goals_match = re.match(r"(\d+)\s*(?:\((\d+)\))?", goals_text)
            goals = int(goals_match.group(1)) if goals_match else 0
            penalties = int(goals_match.group(2)) if goals_match and goals_match.group(2) else 0

            matches = int(cols[5].get_text(strip=True)) if len(cols) > 5 else 0

            gpm_text = cols[6].get_text(strip=True).replace(",", ".") if len(cols) > 6 else "0"
            try:
                goals_per_match = float(gpm_text)
            except ValueError:
                goals_per_match = goals / matches if matches > 0 else 0.0

            scorers.append(Scorer(
                position=position, name=name, team=team_name,
                goals=goals, penalties=penalties, matches=matches,
                goals_per_match=goals_per_match, player_url=player_url,
                team_slug=team_slug,
            ))

        except (ValueError, IndexError) as e:
            logger.debug(f"Skipping scorer row: {e}")
            continue

    logger.info(f"Scraped {len(scorers)} scorers from HTML table")
    return scorers


def compute_scorers_from_actas(actas: list[MatchReport]) -> list[Scorer]:
    """
    Compute scorer rankings from acta goal events.
    This is the most reliable source since it comes directly from match reports.
    """
    player_goals: dict[str, dict] = {}

    for acta in actas:
        for goal in acta.goals:
            name = goal.player.strip()
            if not name:
                continue

            if name not in player_goals:
                # Determine team from goal.team
                team = ""
                if goal.team == "home":
                    team = acta.home_team
                elif goal.team == "away":
                    team = acta.away_team
                player_goals[name] = {
                    "goals": 0,
                    "matches_with_goals": set(),
                    "team": team,
                }

            player_goals[name]["goals"] += 1
            match_key = f"{acta.home_team}_vs_{acta.away_team}"
            player_goals[name]["matches_with_goals"].add(match_key)

    # Count total appearances per player from lineups
    player_appearances: dict[str, int] = defaultdict(int)
    for acta in actas:
        for p in acta.home_lineup + acta.home_bench + acta.away_lineup + acta.away_bench:
            player_appearances[p.name] += 1

    # Build sorted scorer list
    sorted_scorers = sorted(player_goals.items(), key=lambda x: x[1]["goals"], reverse=True)

    scorers = []
    for pos, (name, data) in enumerate(sorted_scorers, 1):
        matches = player_appearances.get(name, len(data["matches_with_goals"]))
        goals = data["goals"]
        scorers.append(Scorer(
            position=pos,
            name=name,
            team=data["team"],
            goals=goals,
            penalties=0,  # Can't determine from actas
            matches=matches,
            goals_per_match=round(goals / max(matches, 1), 2),
        ))

    logger.info(f"Computed {len(scorers)} scorers from {len(actas)} actas")
    return scorers
