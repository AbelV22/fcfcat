from __future__ import annotations
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
from datetime import datetime, date

from bs4 import BeautifulSoup

from .http_client import FCFClient
from .models import MatchResult, NextMatchInfo

logger = logging.getLogger("fcf_scraper")


def _normalize(text: str) -> str:
    """Normalize a team name for fuzzy matching.
    Strips accents, apostrophes, dots, hyphens, and other punctuation."""
    import unicodedata
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    # Strip punctuation: apostrophes, dots, commas, etc.
    text = re.sub(r"['\.\-,()\"]+", '', text)
    return text.lower().strip()


def _slugify(text: str) -> str:
    """Convert to a slug-like form for comparison (no spaces, lowercase, no accents)."""
    norm = _normalize(text)
    return re.sub(r'\s+', '', norm)


def _team_matches(team_keyword: str, team_name: str) -> bool:
    """Check if a team keyword matches a team name (fuzzy).
    Handles cases like FUNDACIÓ ACADEMIA F. L'HOSPITALET A matching
    Fundacio Academia F Lhospitalet A (slug-derived names)."""
    kw_norm = _normalize(team_keyword)
    name_norm = _normalize(team_name)
    # Direct substring match
    if kw_norm in name_norm or name_norm in kw_norm:
        return True
    # Slug match (remove ALL spaces)
    kw_slug = _slugify(team_keyword)
    name_slug = _slugify(team_name)
    if kw_slug in name_slug or name_slug in kw_slug:
        return True
    # Check individual words
    stopwords = {"fc", "cf", "ce", "ud", "sd", "ad", "ae", "cd", "at", "de",
                 "la", "el", "les", "els", "a", "fundacio", "academia"}
    kw_words = [w for w in kw_norm.split() if w not in stopwords and len(w) > 2]
    if kw_words and all(w in name_norm for w in kw_words):
        return True
    return False


def _parse_date(date_str: str) -> date | None:
    """Parse a date string in dd-MM-yyyy or dd/MM/yyyy format."""
    for fmt in ("%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _is_played(m: MatchResult, today: date | None = None) -> bool:
    """
    Determine if a match has already been played.
    Uses three signals in priority order:
      1. Scores present → definitely played
      2. Status 'ACTA TANCADA' → acta is closed, played (even without inline score)
      3. Date is strictly in the past → assume played
    """
    # Signal 1: inline scores
    if m.home_score is not None and m.away_score is not None:
        return True
    # Signal 2: FCF closes the acta when the match is over
    if m.status and "TANCADA" in m.status.upper():
        return True
    # Signal 3: date-based fallback
    if today and m.date:
        match_date = _parse_date(m.date)
        if match_date and match_date < today:
            return True
    return False


def find_next_match(
    matches: list[MatchResult],
    our_team: str,
    today: date | None = None,
) -> NextMatchInfo | None:
    """
    Find the next unplayed match for our team.

    Strategy:
    1. Collect every match involving our team.
    2. Filter out played matches using _is_played() which checks scores,
       'ACTA TANCADA' status, AND date (so past matches are never returned
       even when the calendar page omits inline scores).
    3. Sort remaining matches by jornada (then date as tiebreaker).
    4. Return the first one.

    This is intentionally simple and date-aware. The old jornada-ratio
    heuristic failed because FCF's /calendari/ page does not show scores
    inline — only 'ACTA TANCADA' — so all past matches appeared unplayed.
    """
    if today is None:
        today = date.today()

    if not matches:
        return None

    upcoming: list[tuple[MatchResult, bool]] = []
    for m in matches:
        if m.jornada <= 0:
            continue
        is_home = _team_matches(our_team, m.home_team)
        is_away = _team_matches(our_team, m.away_team)
        if not (is_home or is_away):
            continue
        if _is_played(m, today):
            logger.debug(
                f"  Skipping J{m.jornada} {m.home_team} vs {m.away_team} "
                f"(played: score={m.home_score}-{m.away_score} status={m.status!r} date={m.date})"
            )
            continue
        upcoming.append((m, is_home))

    if not upcoming:
        logger.warning(f"No upcoming match found for '{our_team}' — season may be complete")
        return None

    # Sort by jornada first, then by parsed date as tiebreaker
    def _sort_key(item: tuple[MatchResult, bool]) -> tuple:
        m, _ = item
        parsed = _parse_date(m.date) if m.date else None
        return (m.jornada, parsed or date.max)

    upcoming.sort(key=_sort_key)
    m, is_home = upcoming[0]
    rival_name = m.away_team if is_home else m.home_team

    logger.info(
        f"Next match: J{m.jornada} vs {rival_name} "
        f"({'Home' if is_home else 'Away'}) on {m.date} {m.time}"
    )
    return NextMatchInfo(
        jornada=m.jornada,
        date=m.date,
        time=m.time,
        rival_name=rival_name,
        is_home=is_home,
        venue=m.venue,
        acta_url=m.acta_url,
    )


def get_acta_url_for_team_in_jornada(
    client: FCFClient,
    resultats_base_url: str,
    jornada: int,
    our_team: str,
) -> dict:
    """
    Fetch the per-jornada resultats page and find the match info for our team.
    URL pattern: /resultats/{season}/futbol-11/{comp}/{group}/jornada-{N}

    The resultats page uses 'table_resultats' tables (one per match), each containing
    an acta link, team names, date+time, and venue.
    This is the only place FCF publishes acta links for upcoming matches.

    Returns a dict with: acta_url, date, time, venue (all str, empty if not found).
    """
    empty = {"acta_url": "", "date": "", "time": "", "venue": ""}
    base = resultats_base_url.rstrip("/")
    jornada_url = f"{base}/jornada-{jornada}"

    try:
        soup = client.fetch_soup(jornada_url)
    except Exception as e:
        logger.warning(f"Could not fetch resultats jornada page {jornada_url}: {e}")
        return empty

    tables = soup.find_all("table", class_=lambda c: c and "table_resultats" in c)
    for table in tables:
        acta_link = table.find("a", href=re.compile(r"/acta/"))
        if not acta_link:
            continue
        href = acta_link["href"]
        acta_url = href if href.startswith("http") else f"https://www.fcf.cat{href}"

        # Check if our team is in this match row
        team_links = table.find_all("a", href=re.compile(r"/equip/|/calendari-equip/"))
        team_names = [a.get_text(strip=True) for a in team_links if a.get_text(strip=True)]
        if not any(_team_matches(our_team, name) for name in team_names):
            continue

        # Extract date and time from the date cell (e.g. "07-03-202619:30" or "07-03-2026 19:30")
        tds = table.find_all("td")
        date_str = ""
        time_str = ""
        venue_str = ""
        for td in tds:
            text = td.get_text(strip=True)
            date_match = re.search(r"(\d{2}[/-]\d{2}[/-]\d{4})", text)
            time_match = re.search(r"(\d{2}:\d{2})", text)
            if date_match:
                date_str = date_match.group(1)
                if time_match:
                    time_str = time_match.group(1)
                # Venue is often in the same or next cell as a camp link
            elif text and not time_match and len(text) > 5 and not any(
                kw in text.lower() for kw in ["ruta", "equip", "acta"]
            ) and not td.find("a"):
                # Likely venue text (not a link, not short, not a keyword)
                venue_str = text.split("PEREZ")[0].strip()  # strip any appended referee info

        # Venue: use the camp link text directly (clean, no referee appended)
        camp_link = table.find("a", href=re.compile(r"/camp/"))
        if camp_link:
            # Strip any child tags (images) and just get the text
            venue_clean = camp_link.get_text(strip=True)
            if venue_clean:
                venue_str = venue_clean

        logger.info(f"Found acta for J{jornada} in resultats: {acta_url} | {date_str} {time_str} @ {venue_str}")
        return {"acta_url": acta_url, "date": date_str, "time": time_str, "venue": venue_str}

    logger.warning(f"No acta found for '{our_team}' in resultats J{jornada}")
    return empty


def extract_referee_from_upcoming_acta(
    client: FCFClient,
    acta_url: str,
) -> list[str]:
    """
    Extract referee names from an upcoming (pre-match) acta page.
    FCF often publishes the acta page before the match with the referee assigned.
    """
    if not acta_url:
        return []

    try:
        soup = client.fetch_soup(acta_url)
    except Exception as e:
        logger.warning(f"Could not fetch upcoming acta {acta_url}: {e}")
        return []

    referees = []
    acta_tables = soup.find_all(class_=["acta-table", "acta-table2"])
    for table in acta_tables:
        rows = table.find_all("tr")
        if not rows:
            continue
        header = rows[0].get_text(strip=True)
        if "rbitr" in header.lower():
            for row in rows[1:]:
                text = row.get_text(strip=True)
                name = re.sub(r"\(.*?\)", "", text).strip()
                if name and len(name) > 3:
                    referees.append(name)
            break

    if referees:
        logger.info(f"Referees from acta: {', '.join(referees)}")
    else:
        logger.info(f"No referee assigned yet in acta {acta_url}")

    return referees

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
    The FCF uses tables with class 'calendaritable' for both past and future matches.
    """
    matches: list[MatchResult] = []
    
    tables = soup.find_all("table", class_="calendaritable")
    for table in tables:
        current_jornada = 0
        date_text = ""
        
        thead = table.find("thead")
        if thead:
            th_cells = thead.find_all("th")
            if len(th_cells) >= 1:
                jmatch = re.search(r'Jornada\s+(\d+)', th_cells[0].get_text(strip=True), re.IGNORECASE)
                if jmatch: 
                    current_jornada = int(jmatch.group(1))
            if len(th_cells) >= 2:
                dmatch = re.search(r'(\d{2}[/-]\d{2}[/-]\d{4})', th_cells[1].get_text(strip=True))
                if dmatch: 
                    date_text = dmatch.group(1)

        tbody = table.find("tbody")
        if not tbody: continue
        
        for tr in tbody.find_all("tr"):
            tds = tr.find_all("td")
            if len(tds) < 3: continue
            
            acta_link = tr.find("a", href=re.compile(r"/acta/"))
            href = acta_link["href"] if acta_link else ""
            acta_url = href if href.startswith("http") or not href else f"https://www.fcf.cat{href}"
            
            team_links = tr.find_all("a", href=re.compile(r"/equip/|/calendari-equip/"))
            teams = [a.get_text(strip=True) for a in team_links if a.get_text(strip=True)]
            if len(teams) < 2: continue
            home_team, away_team = teams[0], teams[-1]
            
            tr_text = tr.get_text(" ", strip=True)
            no_dates = re.sub(r'\d{2}[/-]\d{2}[/-]\d{4}', '', tr_text)
            no_dates = re.sub(r'\d{2}:\d{2}', '', no_dates)
            
            home_score = away_score = None
            # Extract scores: look for "N - M" or "N – M". 
            # We must be careful not to match dates (21-09-2025).
            # We look for scores that are NOT preceded or followed by more digits or dashes.
            score_match = re.search(r'(?<![\d\-/])\b(\d{1,2})\s*(?:[-–])\s*(\d{1,2})\b(?![\d\-/])', no_dates)
            if score_match:
                s1, s2 = int(score_match.group(1)), int(score_match.group(2))
                # FCF matches rarely exceed 25 goals per side.
                # Dates like 21-09-2025 would match 21-09 if we didn't have the lookaround.
                if s1 <= 25 and s2 <= 25:
                    home_score, away_score = s1, s2
                    
            row_date = date_text
            row_date_match = re.search(r'(\d{2}[/-]\d{2}[/-]\d{4})', tr_text)
            if row_date_match: 
                row_date = row_date_match.group(1)
            
            time_match = re.search(r'(\d{2}:\d{2})', tr_text)
            time_str = time_match.group(1) if time_match else ""
            
            status = ""
            if "ACTA TANCADA" in tr_text or "TANCADA" in tr_text:
                status = "ACTA TANCADA"
            elif "Pendent" in tr_text or "pendent" in tr_text:
                status = "Pendent"
                
            # Extract slugs from href if present for compatibility
            home_slug = away_slug = ""
            if href:
                url_parts = href.split("/")
                region_indices = [i for i, p in enumerate(url_parts) if p in ("2cat", "1cat", "3cat", "pref")]
                if len(region_indices) >= 2:
                    home_slug = url_parts[region_indices[0] + 1] if region_indices[0] + 1 < len(url_parts) else ""
                    away_slug = url_parts[region_indices[1] + 1] if region_indices[1] + 1 < len(url_parts) else ""

            match = MatchResult(
                jornada=current_jornada,
                date=row_date,
                time=time_str,
                home_team=home_team,
                away_team=away_team,
                home_score=home_score,
                away_score=away_score,
                acta_url=acta_url,
                status=status,
                home_slug=home_slug,
                away_slug=away_slug,
            )
            matches.append(match)

    # Deduplicate matches
    seen_matches = set()
    unique_matches = []
    for m in matches:
        key = f"{m.jornada}-{m.home_team}-{m.away_team}"
        if key not in seen_matches:
            seen_matches.add(key)
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
