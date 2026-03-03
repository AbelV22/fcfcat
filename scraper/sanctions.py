"""
Scraper for FCF sanctions (sancions).
URL pattern: /sancions/{season}/futbol-11/{competition}/{group}

Note: The sanctions page uses AJAX loading. We scrape the initial HTML
which may contain the first jornada, and also try the AJAX endpoint.
"""
import logging
import re

from .http_client import FCFClient
from .models import Sanction

logger = logging.getLogger("fcf_scraper")


def scrape_sanctions(client: FCFClient, url: str) -> list[Sanction]:
    """
    Scrape the sanctions table.
    Returns a list of Sanction objects.
    """
    soup = client.fetch_soup(url)

    # The sanctions page uses fcftable-block class
    table = soup.find("table", class_="fcftable-block")
    if not table:
        # Fallback: try any table with sanctions-like content
        for t in soup.find_all("table"):
            text = t.get_text(" ", strip=True).lower()
            if "sancion" in text or "sanció" in text or "article" in text:
                table = t
                break

    sanctions: list[Sanction] = []

    if not table:
        logger.warning(f"No sanctions table found at {url}")
        # Try to get data from the page text directly
        return _parse_sanctions_from_page(soup)

    rows = table.find_all("tr")

    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 4:
            continue

        try:
            # Column structure: shield, player_name, article, matches, reason, notes
            # Find the team from the shield image
            team = ""
            shield_img = row.find("img")
            if shield_img:
                team = shield_img.get("alt", "").strip()

            # Player name
            player_link = row.find("a")
            player = player_link.get_text(strip=True) if player_link else ""
            player_url = player_link.get("href", "") if player_link else ""

            if not player:
                # Try to find name in first text column
                for col in cols:
                    text = col.get_text(strip=True)
                    if text and not text.isdigit() and len(text) > 3:
                        player = text
                        break

            if not player:
                continue

            # Article reference
            article = ""
            matches_suspended = 0
            reason = ""
            notes = ""

            for i, col in enumerate(cols):
                text = col.get_text(strip=True)
                # Article number patterns: 334, 338.1k, etc.
                if re.match(r'^\d{3}', text):
                    article = text
                # Match suspension count
                elif text.isdigit() and int(text) <= 20:
                    matches_suspended = int(text)
                # Long text = reason
                elif len(text) > 20:
                    if not reason:
                        reason = text
                    else:
                        notes = text

            sanctions.append(Sanction(
                player=player,
                team=team,
                article=article,
                matches_suspended=matches_suspended,
                reason=reason,
                notes=notes,
                player_url=player_url,
            ))

        except (ValueError, IndexError) as e:
            logger.warning(f"Failed to parse sanction row: {e}")
            continue

    logger.info(f"Scraped {len(sanctions)} sanctions")
    return sanctions


def _parse_sanctions_from_page(soup) -> list[Sanction]:
    """Fallback parser for when the table structure is different."""
    sanctions = []
    # Look for any structured data about sanctions
    all_text = soup.get_text("\n", strip=True)
    # Try to find sanction entries in the text
    lines = all_text.split("\n")
    for line in lines:
        if re.search(r'art\.\s*\d{3}|article\s*\d{3}|sancion|sanció', line, re.IGNORECASE):
            logger.debug(f"Potential sanction line: {line}")
    return sanctions
