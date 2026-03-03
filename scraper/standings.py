"""
Scraper for FCF standings (classificació).
URL pattern: /classificacio/{season}/futbol-11/{competition}/{group}

Actual table structure (24 columns, verified 2026-03-03):
  col[0]:  position (1, 2, 3...)
  col[1]:  shield image (empty text)
  col[2]:  team name (text)
  col[3]:  team name (link - duplicate)
  col[4]:  points with average, e.g. "42 (2.1)"
  col[5]:  points average raw, e.g. "2.1000"
  col[6]:  empty separator
  col[7]:  total played (PJ)
  col[8]:  total won (PG)
  col[9]:  total drawn (PE)
  col[10]: total lost (PP)
  col[11]: empty separator
  col[12]: home played
  col[13]: home won
  col[14]: home drawn
  col[15]: home lost
  col[16]: away played
  col[17]: away won
  col[18]: away drawn
  col[19]: away lost
  col[20]: goals for (GF)
  col[21]: goals against (GC)
  col[22]: recent results (combined text)
  col[23]: deductions
"""
import logging
import re

from .http_client import FCFClient
from .models import TeamStanding

logger = logging.getLogger("fcf_scraper")


def _safe_int(text: str) -> int:
    """Parse an integer, handling formats like '42.00' or '42 (2.1)'."""
    text = text.strip()
    if not text:
        return 0
    # Strip anything in parentheses first: "42 (2.1)" -> "42"
    text = re.sub(r'\(.*?\)', '', text).strip()
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

    # Auto-detect column layout from first data row
    sample_cols = rows[0].find_all("td")
    num_cols = len(sample_cols)
    logger.info(f"Standings table has {num_cols} columns")

    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 21:
            logger.debug(f"Skipping row with {len(cols)} cols (need >= 21)")
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

            # Points: col[4] may be "42 (2.1)" — _safe_int handles it
            points = _safe_int(cols[4].get_text(strip=True))

            # Detect offset: if col[6] is empty, there's an extra avg column
            col6_text = cols[6].get_text(strip=True)
            if col6_text == "" or col6_text == "-":
                # 24-col layout: col[5]=avg, col[6]=separator
                off = 7
            else:
                # 23-col layout (legacy): col[5]=separator, col[6]=PJ
                off = 6

            played = _safe_int(cols[off].get_text(strip=True))
            won = _safe_int(cols[off + 1].get_text(strip=True))
            drawn = _safe_int(cols[off + 2].get_text(strip=True))
            lost = _safe_int(cols[off + 3].get_text(strip=True))

            # Home/away: separator at off+4, then home(PJ,PG,PE,PP), away(PJ,PG,PE,PP)
            home_off = off + 5  # skip separator
            # home_off = home_played, home_off+1 = home_won, +2 = home_drawn, +3 = home_lost
            home_won = _safe_int(cols[home_off + 1].get_text(strip=True))
            home_drawn = _safe_int(cols[home_off + 2].get_text(strip=True))
            home_lost = _safe_int(cols[home_off + 3].get_text(strip=True))

            away_off = home_off + 4  # away_played, away_won, away_drawn, away_lost
            away_won = _safe_int(cols[away_off + 1].get_text(strip=True))
            away_drawn = _safe_int(cols[away_off + 2].get_text(strip=True))
            away_lost = _safe_int(cols[away_off + 3].get_text(strip=True))

            gf_idx = away_off + 4
            goals_for = _safe_int(cols[gf_idx].get_text(strip=True))
            goals_against = _safe_int(cols[gf_idx + 1].get_text(strip=True))

            if not team_name or position == 0:
                continue

            logger.debug(
                f"  #{position} {team_name}: PJ={played} PG={won} PE={drawn} PP={lost} "
                f"GF={goals_for} GC={goals_against} Pts={points}"
            )

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
