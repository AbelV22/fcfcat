"""
Scraper for FCF standings (classificació).
URL pattern: /classificacio/{season}/futbol-11/{competition}/{group}

Real table structure (23 columns):
  col[0]: position (1, 2, 3...)
  col[1]: shield image (empty text)
  col[2]: team name (text)
  col[3]: team name (link - duplicate)
  col[4]: points (e.g. "42.00")
  col[5]: empty separator
  col[6]: total played (PJ)
  col[7]: total won (PG)
  col[8]: total drawn (PE)
  col[9]: total lost (PP)
  col[10]: empty separator
  col[11]: home played
  col[12]: home won
  col[13]: home drawn
  col[14]: home lost
  col[15]: away played
  col[16]: away won
  col[17]: away drawn
  col[18]: away lost
  col[19]: goals for (GF)
  col[20]: goals against (GC)
  col[21]: recent results (combined text)
  col[22]: deductions
"""
import logging

from .http_client import FCFClient
from .models import TeamStanding

logger = logging.getLogger("fcf_scraper")


def _safe_int(text: str) -> int:
    """Parse an integer, handling formats like '42.00'."""
    text = text.strip()
    if not text:
        return 0
    try:
        return int(float(text))
    except ValueError:
        return 0


def scrape_standings(client: FCFClient, url: str) -> list[TeamStanding]:
    """Scrape the full standings table."""
    soup = client.fetch_soup(url)
    table = soup.find("table", class_="fcftable-e")

    if not table:
        raise ValueError(f"Standings table (fcftable-e) not found at {url}")

    tbody = table.find("tbody")
    if not tbody:
        raise ValueError(f"No tbody in standings table at {url}")

    rows = tbody.find_all("tr")
    if not rows:
        raise ValueError(f"No rows in standings table at {url}")

    standings: list[TeamStanding] = []

    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 20:
            logger.debug(f"Skipping row with {len(cols)} cols (need >= 20)")
            continue

        try:
            position = _safe_int(cols[0].get_text(strip=True))
            team_name = cols[2].get_text(strip=True)

            # Extract team slug from the link in col[3]
            team_slug = ""
            link = cols[3].find("a")
            if link and link.get("href"):
                parts = link["href"].rstrip("/").split("/")
                team_slug = parts[-1] if parts else ""

            points = _safe_int(cols[4].get_text(strip=True))
            played = _safe_int(cols[6].get_text(strip=True))
            won = _safe_int(cols[7].get_text(strip=True))
            drawn = _safe_int(cols[8].get_text(strip=True))
            lost = _safe_int(cols[9].get_text(strip=True))

            home_won = _safe_int(cols[12].get_text(strip=True))
            home_drawn = _safe_int(cols[13].get_text(strip=True))
            home_lost = _safe_int(cols[14].get_text(strip=True))

            away_won = _safe_int(cols[16].get_text(strip=True))
            away_drawn = _safe_int(cols[17].get_text(strip=True))
            away_lost = _safe_int(cols[18].get_text(strip=True))

            goals_for = _safe_int(cols[19].get_text(strip=True))
            goals_against = _safe_int(cols[20].get_text(strip=True))

            if not team_name or position == 0:
                continue

            standings.append(TeamStanding(
                position=position,
                name=team_name,
                points=points,
                played=played,
                won=won,
                drawn=drawn,
                lost=lost,
                goals_for=goals_for,
                goals_against=goals_against,
                home_won=home_won,
                home_drawn=home_drawn,
                home_lost=home_lost,
                away_won=away_won,
                away_drawn=away_drawn,
                away_lost=away_lost,
                team_slug=team_slug,
            ))

        except (ValueError, IndexError) as e:
            logger.warning(f"Failed to parse standings row: {e}")
            continue

    logger.info(f"Scraped {len(standings)} teams from standings")
    return standings
