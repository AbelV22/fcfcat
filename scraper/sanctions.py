"""
Scraper for FCF sanctions (sancions).
URL pattern: /sancions/{season}/futbol-11/{competition}/{group}

FCF renders this page with JavaScript in some browsers, but the initial
server-rendered HTML contains the full table. We try multiple strategies
to extract sanctions data.
"""
import logging
import re

from .http_client import FCFClient
from .models import Sanction

logger = logging.getLogger("fcf_scraper")

# Known FCF table class names (may vary by page/version)
_TABLE_CLASSES = ["fcftable-block", "fcftable-e", "fcf-table", "sancions-table"]
# Column header patterns that indicate a sanctions table
_HEADER_KEYWORDS = ["sancionat", "sancion", "jugador", "club", "article", "jornades", "suspens"]


def scrape_sanctions(client: FCFClient, url: str) -> list[Sanction]:
    """
    Scrape the sanctions table.
    Returns a list of Sanction objects.

    Strategies (in order):
    1. Known table CSS classes
    2. Any table whose header row matches sanction keywords
    3. Row-level heuristic on ALL table rows
    4. Text-pattern fallback
    """
    try:
        soup = client.fetch_soup(url)
    except Exception as e:
        logger.error(f"Failed to fetch sanctions page {url}: {e}")
        return []

    # ── Strategy 1: known CSS class ──────────────────────────────────────────
    table = None
    for cls in _TABLE_CLASSES:
        table = soup.find("table", class_=cls)
        if table:
            logger.debug(f"Found sanctions table with class '{cls}'")
            break

    # ── Strategy 2: table whose first row looks like a sanctions header ───────
    if not table:
        for t in soup.find_all("table"):
            first_row_text = ""
            thead = t.find("thead")
            if thead:
                first_row_text = thead.get_text(" ", strip=True).lower()
            else:
                first_tr = t.find("tr")
                if first_tr:
                    first_row_text = first_tr.get_text(" ", strip=True).lower()
            if any(kw in first_row_text for kw in _HEADER_KEYWORDS):
                table = t
                logger.debug("Found sanctions table by header keyword match")
                break

    # ── Strategy 3: any table with enough rows that look like sanctions ───────
    if not table:
        for t in soup.find_all("table"):
            rows = t.find_all("tr")
            # Look for rows that have an article number pattern (e.g. 334, 338.1)
            matched = sum(
                1 for r in rows
                if re.search(r'\b3\d{2}[\w\.]*\b', r.get_text())
            )
            if matched >= 2:
                table = t
                logger.debug("Found sanctions table by article-number heuristic")
                break

    if table:
        result = _parse_sanctions_table(table)
        if result:
            logger.info(f"Scraped {len(result)} sanctions from {url}")
            return result

    # ── Strategy 4: text-level fallback (page may be JS-rendered) ────────────
    return _parse_sanctions_from_text(soup, url)


def _parse_sanctions_table(table) -> list[Sanction]:
    """Parse a BeautifulSoup table tag that contains sanctions rows."""
    sanctions: list[Sanction] = []

    # Skip the header row(s)
    rows = table.find_all("tr")

    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 3:
            continue  # Skip header rows and too-short rows

        try:
            # ── Team (from shield image alt or first link) ─────────────────
            team = ""
            shield_img = row.find("img")
            if shield_img:
                team = shield_img.get("alt", "").strip()
            if not team:
                # Try team link with /equip/ href
                team_link = row.find("a", href=re.compile(r"/equip/"))
                if team_link:
                    team = team_link.get_text(strip=True)

            # ── Player name ────────────────────────────────────────────────
            player = ""
            player_url = ""
            player_link = row.find("a", href=re.compile(r"/jugador/|/fitxa/"))
            if player_link:
                player = player_link.get_text(strip=True)
                player_url = player_link.get("href", "")
            if not player:
                # First non-empty text td that is not a number
                for col in cols:
                    text = col.get_text(strip=True)
                    if text and not text.isdigit() and len(text) > 3 and not text.startswith("http"):
                        player = text
                        break

            if not player:
                continue

            # ── Parse remaining columns for article / matches / reason ─────
            article = ""
            matches_suspended = 0
            reason = ""
            notes = ""

            col_texts = [c.get_text(strip=True) for c in cols]
            for text in col_texts:
                if not text:
                    continue
                # Article number: 3-digit number possibly followed by alphanumeric
                if re.match(r'^3\d{2}[\w\.]*$', text):
                    article = text
                # Suspension match count: 1-2 digit integer <= 20
                elif re.match(r'^\d{1,2}$', text) and int(text) <= 20 and not matches_suspended:
                    matches_suspended = int(text)
                # Long descriptive text → reason or notes
                elif len(text) > 20 and text != player and text != team:
                    if not reason:
                        reason = text
                    elif not notes:
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

        except Exception as e:
            logger.debug(f"Skipping sanction row: {e}")
            continue

    return sanctions


def _parse_sanctions_from_text(soup, url: str) -> list[Sanction]:
    """
    Last-resort fallback when the table is not found (likely JS-rendered).
    Tries to detect any structured sanction data in the raw page text.
    Returns empty list on failure — caller should note this is expected for
    some FCF pages that use client-side rendering.
    """
    # Check if the page body has ANY sanction-related content at all
    body_text = soup.get_text(" ", strip=True).lower()
    has_content = any(kw in body_text for kw in ["sancionat", "article", "jornades", "suspensió"])
    if not has_content:
        logger.info(f"Sanctions page appears empty or JS-only: {url}")
    else:
        logger.warning(
            f"Sanctions page has content but table not parseable "
            f"(may require JavaScript rendering): {url}"
        )
    return []
