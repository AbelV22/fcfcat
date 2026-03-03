"""
Scraper for FCF match reports (actas).

HTML structure uses these CSS classes:
  .acta-equip      -> team names
  .acta-marcador   -> score "2 - 1"
  .acta-estat      -> status "ACTA TANCADA"
  .acta-info       -> date/time, season
  .acta-info2      -> competition/group, jornada
  .acta-table      -> lineup tables (Titulars, Suplents, Targetes, Gols, Àrbitres, Estadi)
  .acta-table2     -> substitution tables
  .num-samarreta-acta2 -> jersey number
  .samarreta-acta2 -> player name (in card rows)
  .acta-minut-targeta -> card minute
  .acta-marcador-gol -> running score before each goal
  .acta-estat-gol  -> goal scorer shield (indicates which team scored)
"""
import logging
import re
from typing import Optional

from bs4 import BeautifulSoup, Tag

from .http_client import FCFClient
from .models import (
    MatchReport, PlayerEntry, GoalEvent, CardEvent,
    SubstitutionEvent,
)

logger = logging.getLogger("fcf_scraper")


def scrape_acta(client: FCFClient, acta_url: str) -> Optional[MatchReport]:
    """Scrape a single match report (acta)."""
    try:
        soup = client.fetch_soup(acta_url)
    except Exception as e:
        logger.error(f"Failed to fetch acta {acta_url}: {e}")
        return None

    report = MatchReport(
        jornada=0, date="", time="", home_team="", away_team="",
        home_score=0, away_score=0, venue="", acta_url=acta_url,
    )

    # ── Teams ──
    equip_divs = soup.find_all(class_="acta-equip")
    if len(equip_divs) >= 2:
        report.home_team = equip_divs[0].get_text(strip=True)
        report.away_team = equip_divs[1].get_text(strip=True)

    # ── Score ──
    marcador = soup.find(class_="acta-marcador")
    if marcador:
        score_text = marcador.get_text(strip=True)
        m = re.match(r"(\d+)\s*[-–]\s*(\d+)", score_text)
        if m:
            report.home_score = int(m.group(1))
            report.away_score = int(m.group(2))

    # ── Status ──
    estat = soup.find(class_="acta-estat")
    if estat:
        report.status = estat.get_text(strip=True)

    # ── Date, Time, Jornada ──
    for info in soup.find_all(class_="acta-info"):
        text = info.get_text(strip=True)
        date_m = re.search(r"(\d{2}-\d{2}-\d{4})", text)
        if date_m:
            report.date = date_m.group(1)
        time_m = re.search(r"(\d{2}:\d{2})", text)
        if time_m:
            report.time = time_m.group(1)

    for info2 in soup.find_all(class_="acta-info2"):
        text = info2.get_text(strip=True)
        jornada_m = re.search(r"Jornada\s+(\d+)", text, re.IGNORECASE)
        if jornada_m:
            report.jornada = int(jornada_m.group(1))

    # ── Parse all acta-table sections ──
    # Tables appear in order: home titulars, home suplents, home tech staff,
    # home substitutions, home cards, referees, goals, stadium,
    # comparison, away titulars, away suplents, away tech staff,
    # away substitutions, away cards

    acta_tables = soup.find_all(class_=["acta-table", "acta-table2"])

    # Track which team we're in (home first, then away after "Comparativa" or second set)
    current_team = "home"
    found_goals = False
    found_referees = False

    for table in acta_tables:
        rows = table.find_all("tr")
        if not rows:
            continue

        # Check the header (first row)
        header = rows[0].get_text(strip=True)
        data_rows = rows[1:]  # Skip header row

        if "Titulars" in header:
            players = _parse_players(data_rows)
            if current_team == "home" and not report.home_lineup:
                report.home_lineup = players
            else:
                report.away_lineup = players
                current_team = "away"

        elif "Suplents" in header:
            players = _parse_players(data_rows)
            for p in players:
                p.is_starter = False
            if current_team == "home" and not report.home_bench:
                report.home_bench = players
            else:
                report.away_bench = players

        elif "Substitucions" in header:
            subs = _parse_substitutions(data_rows)
            team_label = current_team
            for sub in subs:
                sub.team = team_label
            report.substitutions.extend(subs)

        elif "Targetes" in header:
            cards = _parse_cards(data_rows, table)
            team_label = current_team
            for card in cards:
                card.team = team_label
                if card.card_type == "yellow":
                    report.yellow_cards.append(card)
                else:
                    report.red_cards.append(card)

        elif "Gols" in header:
            found_goals = True
            goals = _parse_goals(data_rows, report.home_team, report.away_team, soup)
            report.goals = goals

        elif "rbitr" in header.lower():
            found_referees = True
            report.referees = _parse_referees(data_rows)

        elif "Estadi" in header or "stadi" in header.lower():
            venue_text = table.get_text(" ", strip=True)
            venue_text = venue_text.replace("Estadi", "").replace("Com arribar", "").strip()
            report.venue = venue_text

        elif "Comparativa" in header:
            # After comparativa, the next tables are for the away team
            current_team = "away"

        elif "Equip Tècnic" in header or "quip" in header.lower():
            coach = _parse_coach(data_rows)
            if current_team == "home" and not report.home_coach:
                report.home_coach = coach
            else:
                report.away_coach = coach

    logger.info(
        f"Acta J{report.jornada}: {report.home_team} {report.home_score}-{report.away_score} {report.away_team} | "
        f"Home XI:{len(report.home_lineup)} Away XI:{len(report.away_lineup)} | "
        f"Goals:{len(report.goals)} YC:{len(report.yellow_cards)} RC:{len(report.red_cards)}"
    )

    return report


def _parse_players(rows: list[Tag]) -> list[PlayerEntry]:
    """Parse player rows from Titulars or Suplents table."""
    players = []
    for row in rows:
        cols = row.find_all("td")
        if not cols:
            continue

        # Number is in the first col (or in .num-samarreta-acta2)
        number = 0
        num_el = row.find(class_="num-samarreta-acta2")
        if num_el:
            num_text = num_el.get_text(strip=True)
            if num_text.isdigit():
                number = int(num_text)

        # Player name is in the second col (or in a link)
        name = ""
        link = row.find("a")
        if link:
            name = link.get_text(strip=True)
            player_url = link.get("href", "")
        else:
            # Name is in second td
            if len(cols) >= 2:
                name = cols[1].get_text(strip=True)
            player_url = ""

        if not name or len(name) < 3:
            continue

        players.append(PlayerEntry(
            name=name,
            number=number,
            is_starter=True,
            player_url=player_url if link else "",
        ))

    return players


def _parse_goals(rows: list[Tag], home_team: str, away_team: str, soup: BeautifulSoup) -> list[GoalEvent]:
    """Parse goals from the Gols table."""
    goals = []
    prev_home_score = 0
    prev_away_score = 0

    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 3:
            continue

        # Structure: running_score | shield | scorer_name | minute
        running_score = ""
        scorer = ""
        minute = ""

        # Running score is in .acta-marcador-gol
        score_el = row.find(class_="acta-marcador-gol")
        if score_el:
            running_score = score_el.get_text(strip=True)

        # Scorer name
        link = row.find("a")
        if link:
            scorer = link.get_text(strip=True)
        else:
            for col in cols:
                text = col.get_text(strip=True)
                if text and not re.match(r"^\d+\s*[-–]\s*\d+$", text) and not re.match(r"^\d+['\u2032]?$", text) and len(text) > 3:
                    scorer = text
                    break

        # Minute - last col or find with apostrophe
        for col in reversed(cols):
            text = col.get_text(strip=True)
            if re.match(r"^\d+['\u2032]?$", text):
                minute = text.replace("'", "").replace("\u2032", "").strip()
                break

        if not scorer:
            continue

        # Determine team from running score change
        team = ""
        if running_score:
            m = re.match(r"(\d+)\s*[-–]\s*(\d+)", running_score)
            if m:
                new_home = int(m.group(1))
                new_away = int(m.group(2))
                if new_home > prev_home_score:
                    team = "home"
                elif new_away > prev_away_score:
                    team = "away"
                prev_home_score = new_home
                prev_away_score = new_away

        goals.append(GoalEvent(
            player=scorer,
            minute=minute,
            team=team,
        ))

    return goals


def _parse_cards(rows: list[Tag], table: Tag) -> list[CardEvent]:
    """Parse cards from the Targetes table."""
    cards = []

    for row in rows:
        # Player name is in .samarreta-acta2
        name_el = row.find(class_="samarreta-acta2")
        if not name_el:
            continue
        name = name_el.get_text(strip=True)
        if not name:
            # Try link
            link = row.find("a")
            if link:
                name = link.get_text(strip=True)

        if not name or len(name) < 3:
            continue

        # Minute is in .acta-minut-targeta
        minute = ""
        min_el = row.find(class_="acta-minut-targeta")
        if min_el:
            minute = min_el.get_text(strip=True).replace("'", "").replace("\u2032", "").strip()

        # Card type: check for red card indicators
        # Yellow cards have .acta-stat-box, red cards have a different color
        # We detect by looking at the stat box images/colors
        # In FCF, yellow cards and red cards are in the same "Targetes" section
        # But separate Targetes tables exist: "Targetes" = yellow, "Targetes vermelles" = red
        # Default to yellow unless the header says red
        header = table.find("tr")
        header_text = header.get_text(strip=True) if header else ""
        card_type = "red" if "vermell" in header_text.lower() or "roja" in header_text.lower() else "yellow"

        cards.append(CardEvent(
            player=name,
            minute=minute,
            card_type=card_type,
        ))

    return cards


def _parse_substitutions(rows: list[Tag]) -> list[SubstitutionEvent]:
    """
    Parse substitutions from the Substitucions table.
    
    FCF HTML structure uses row pairs:
      Row 0 (OUT): minute (rowspan=2, class='fs-30') | jersey# | OUT_PLAYER | icon
      Row 1 (IN):                                      jersey# | IN_PLAYER  | icon
      Row 2 (OUT): minute (rowspan=2)                 | jersey# | OUT_PLAYER | icon
      Row 3 (IN):                                      jersey# | IN_PLAYER  | icon
    
    The minute cell spans 2 rows, so even rows have 4 cols, odd rows have 3 cols.
    """
    subs = []
    i = 0
    while i < len(rows):
        row = rows[i]
        cols = row.find_all("td")
        if not cols:
            i += 1
            continue

        # Detect if this row has a minute cell (the OUT player row)
        # The minute cell has class 'fs-30' and rowspan="2"
        minute = ""
        has_minute_cell = False
        for col in cols:
            cls = col.get("class", [])
            rowspan = col.get("rowspan", "")
            if "fs-30" in cls or rowspan == "2":
                minute_text = col.get_text(strip=True)
                # Remove apostrophe: "46'" -> "46"
                minute = re.sub(r"['\u2032]", "", minute_text).strip()
                has_minute_cell = True
                break

        if not has_minute_cell:
            # This might be a standalone IN row (if we got out of sync)
            i += 1
            continue

        # Extract player OUT name from this row
        player_out = ""
        link_out = row.find("a")
        if link_out:
            player_out = link_out.get_text(strip=True)

        # Next row should be the IN player
        player_in = ""
        if i + 1 < len(rows):
            next_row = rows[i + 1]
            link_in = next_row.find("a")
            if link_in:
                player_in = link_in.get_text(strip=True)
            i += 2  # Skip both rows
        else:
            i += 1

        if player_out or player_in:
            subs.append(SubstitutionEvent(
                player_out=player_out or "?",
                player_in=player_in or "?",
                minute=minute,
            ))

    return subs


def _parse_referees(rows: list[Tag]) -> list[str]:
    """Parse referee names from the Àrbitres table."""
    referees = []
    for row in rows:
        text = row.get_text(strip=True)
        # Clean up: remove delegation info in parentheses for cleaner names
        name = re.sub(r"\(.*?\)", "", text).strip()
        if name and len(name) > 3:
            referees.append(name)
    return referees


def _parse_coach(rows: list[Tag]) -> str:
    """Parse coach name from Equip Tècnic table (role 'E' = entrenador)."""
    for row in rows:
        cols = row.find_all("td")
        if not cols:
            continue
        texts = [c.get_text(strip=True) for c in cols]
        # The coach has role "E" in the last column
        if texts and texts[-1] == "E":
            name = texts[0] if texts[0] else ""
            link = row.find("a")
            if link:
                name = link.get_text(strip=True)
            return name
    return ""


def scrape_all_actas(
    client: FCFClient,
    acta_urls: list[str],
    progress_callback=None,
) -> list[MatchReport]:
    """Scrape multiple actas."""
    reports = []
    total = len(acta_urls)

    for i, url in enumerate(acta_urls):
        if progress_callback:
            progress_callback(i + 1, total, url)

        report = scrape_acta(client, url)
        if report:
            reports.append(report)

    logger.info(f"Scraped {len(reports)}/{total} actas successfully")
    return reports
