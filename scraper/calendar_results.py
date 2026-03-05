"""
Scraper for FCF calendar and results.
URL patterns:
  /calendari/{season}/futbol-11/{competition}/{group}
  /resultats/{season}/futbol-11/{competition}/{group}

These pages provide:
- All match fixtures with dates
- Scores for played matches
- Links to acta pages
- Venue and referee information
"""
import logging
import re

from bs4 import BeautifulSoup

from .http_client import FCFClient
from .models import MatchResult

logger = logging.getLogger("fcf_scraper")


def scrape_calendar(client: FCFClient, url: str) -> list[MatchResult]:
    """
    Scrape the full calendar/fixture list.
    Returns a list of MatchResult objects including acta URLs.
    """
    soup = client.fetch_soup(url)
    return _parse_match_list(soup, url)


def scrape_results(client: FCFClient, url: str) -> list[MatchResult]:
    """
    Scrape the results page.
    Returns a list of MatchResult with scores filled in.
    """
    soup = client.fetch_soup(url)
    return _parse_match_list(soup, url)


def _parse_match_list(soup: BeautifulSoup, source_url: str) -> list[MatchResult]:
    """
    Parse matches from the calendar or results page.
    The FCF uses a card-based layout, not a traditional table.
    """
    matches: list[MatchResult] = []
    current_jornada = 0

    # Look for jornada headers and match entries
    # The structure uses divs with match data

    # Find all jornada markers
    jornada_elements = soup.find_all(string=re.compile(r'Jornada\s+\d+', re.IGNORECASE))

    # Also search for links to acta pages to get match data
    acta_links = soup.find_all("a", href=re.compile(r"/acta/"))

    # Parse by looking at the whole page structure
    all_text_blocks = soup.find_all(["div", "tr", "td", "span", "p", "a"])

    # Strategy: walk through the document finding jornada headers,
    # then extract match data between them

    # First pass: extract all acta links with their context
    for link in acta_links:
        href = link.get("href", "")
        if not href:
            continue

        # Navigate up to find the match container
        parent = link.find_parent(["div", "tr"])
        if not parent:
            parent = link.parent

        # Get all text in the match container
        container = parent
        # Go up a few levels to get the full match block
        for _ in range(3):
            if container and container.parent:
                container = container.parent
            else:
                break

        container_text = container.get_text(" ", strip=True) if container else ""

        # Extract jornada from context
        jornada_match = re.search(r'Jornada\s+(\d+)', container_text, re.IGNORECASE)
        jornada = int(jornada_match.group(1)) if jornada_match else 0

        # Extract teams from the acta URL
        # Pattern: /acta/2526/futbol-11/segona-catalana/grup-3/2cat/team1-slug/2cat/team2-slug
        url_parts = href.split("/")
        home_slug = ""
        away_slug = ""
        # Find the team slugs (after the region codes like "2cat")
        region_indices = [i for i, p in enumerate(url_parts) if p in ("2cat", "1cat", "3cat", "pref")]
        if len(region_indices) >= 2:
            home_slug = url_parts[region_indices[0] + 1] if region_indices[0] + 1 < len(url_parts) else ""
            away_slug = url_parts[region_indices[1] + 1] if region_indices[1] + 1 < len(url_parts) else ""

        # Extract score from context — strip dates first to avoid "21-09-2025" matching as score
        no_dates = re.sub(r'\d{2}[/-]\d{2}[/-]\d{4}', '', container_text)
        # Also strip times like "19:30" to avoid false positives in other patterns
        no_dates = re.sub(r'\d{2}:\d{2}', '', no_dates)
        # Match only small football scores (1-2 digits each side, max 20)
        score_match = re.search(r'\b(\d{1,2})\s*[-–]\s*(\d{1,2})\b', no_dates)
        if score_match:
            s1, s2 = int(score_match.group(1)), int(score_match.group(2))
            home_score = s1 if s1 <= 20 else None
            away_score = s2 if s2 <= 20 else None
            if home_score is None or away_score is None:
                home_score = away_score = None
        else:
            home_score = away_score = None

        # Extract date
        date_match = re.search(r'(\d{2}[/-]\d{2}[/-]\d{4})', container_text)
        date_str = date_match.group(1) if date_match else ""

        # Extract time
        time_match = re.search(r'(\d{2}:\d{2})', container_text)
        time_str = time_match.group(1) if time_match else ""

        # Try to find team names from links in the container
        home_team = home_slug.replace("-", " ").title() if home_slug else ""
        away_team = away_slug.replace("-", " ").title() if away_slug else ""

        # Better: find team name links in the container
        team_links = container.find_all("a", href=re.compile(r"/equip/|/calendari-equip/")) if container else []
        if len(team_links) >= 2:
            home_team = team_links[0].get_text(strip=True) or home_team
            away_team = team_links[1].get_text(strip=True) or away_team

        # Status
        status = ""
        if "ACTA TANCADA" in container_text:
            status = "ACTA TANCADA"
        elif "Pendent" in container_text or "pendent" in container_text:
            status = "Pendent"

        match = MatchResult(
            jornada=jornada,
            date=date_str,
            time=time_str,
            home_team=home_team,
            away_team=away_team,
            home_score=home_score,
            away_score=away_score,
            acta_url=href if href.startswith("http") else f"https://www.fcf.cat{href}",
            status=status,
            home_slug=home_slug,
            away_slug=away_slug,
        )
        matches.append(match)

    # Deduplicate by acta_url
    seen_urls = set()
    unique_matches = []
    for m in matches:
        if m.acta_url not in seen_urls:
            seen_urls.add(m.acta_url)
            unique_matches.append(m)

    logger.info(f"Scraped {len(unique_matches)} matches from {source_url}")
    return unique_matches


def get_acta_urls_from_calendar(client: FCFClient, calendar_url: str) -> list[str]:
    """
    Specifically extract all acta URLs from the calendar page.
    This is useful for batch-scraping all match reports.
    """
    soup = client.fetch_soup(calendar_url)
    acta_links = soup.find_all("a", href=re.compile(r"/acta/"))

    urls = []
    for link in acta_links:
        href = link.get("href", "")
        if href:
            full_url = href if href.startswith("http") else f"https://www.fcf.cat{href}"
            if full_url not in urls:
                urls.append(full_url)

    logger.info(f"Found {len(urls)} acta URLs from calendar")
    return urls
