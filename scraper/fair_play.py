"""
Scraper for FCF fair play standings (joc net).
URL pattern: /jocnet/{season}/futbol-11/{competition}/{group}
"""
import logging
import re

from .http_client import FCFClient
from .models import FairPlayEntry

logger = logging.getLogger("fcf_scraper")


def scrape_fair_play(client: FCFClient, url: str) -> list[FairPlayEntry]:
    """
    Scrape the fair play (joc net) table.
    Returns a list of FairPlayEntry objects.
    """
    soup = client.fetch_soup(url)

    # Try fcftable-e first (same as other tables)
    table = soup.find("table", class_="fcftable-e")
    if not table:
        # Try any table
        for t in soup.find_all("table"):
            text = t.get_text(" ", strip=True).lower()
            if "punts" in text or "equip" in text:
                table = t
                break

    if not table:
        logger.warning(f"No fair play table found at {url}")
        return []

    tbody = table.find("tbody")
    rows = (tbody.find_all("tr") if tbody else table.find_all("tr"))

    entries: list[FairPlayEntry] = []

    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 3:
            continue

        try:
            position = int(cols[0].get_text(strip=True))
            # Team name - might be in col 1 or col 2 (if there's a shield)
            team_name = ""
            team_slug = ""
            for col in cols[1:4]:
                link = col.find("a")
                if link:
                    team_name = link.get_text(strip=True)
                    href = link.get("href", "")
                    if href:
                        parts = href.rstrip("/").split("/")
                        team_slug = parts[-1] if parts else ""
                    break
                text = col.get_text(strip=True)
                if text and not text.isdigit() and len(text) > 2:
                    team_name = text
                    break

            if not team_name:
                continue

            # Points - usually the prominent number
            points = 0
            yellow_cards = 0
            red_cards = 0

            for col in cols[3:]:
                text = col.get_text(strip=True)
                if text.isdigit():
                    val = int(text)
                    if points == 0:
                        points = val
                    elif yellow_cards == 0 and val > 5:
                        yellow_cards = val
                    elif red_cards == 0:
                        red_cards = val

            entries.append(FairPlayEntry(
                position=position,
                team=team_name,
                points=points,
                yellow_cards=yellow_cards,
                red_cards=red_cards,
                team_slug=team_slug,
            ))

        except (ValueError, IndexError) as e:
            logger.warning(f"Failed to parse fair play row: {e}")
            continue

    logger.info(f"Scraped {len(entries)} fair play entries")
    return entries
