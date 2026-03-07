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
from __future__ import annotations
import logging
import re
from typing import Optional

from bs4 import BeautifulSoup, Tag

from .http_client import FCFClient
from .models import (
    MatchReport, PlayerEntry, GoalEvent, CardEvent,
    SubstitutionEvent, TechnicalStaffMember,
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

    # ── Header ──
    # Primary layout: acta-table-header
    header_table = soup.find("table", class_="acta-table-header")
    if header_table:
        header_text = header_table.get_text(separator="|", strip=True)
        parts = [p.strip() for p in header_text.split("|") if p.strip()]
        if len(parts) >= 3:
            report.home_team = parts[0]
            score_text = parts[1]
            report.away_team = parts[2]
            
            # Use regex to find score from "3 - 0" or "(3 - 0)"
            m = re.search(r"(\d+)\s*-\s*(\d+)", score_text)
            if m:
                report.home_score = int(m.group(1))
                report.away_score = int(m.group(2))
    else:
        # Alternate layout: div class="acta-equip" and "acta-resultat"
        equips = soup.find_all(class_="acta-equip")
        if len(equips) >= 2:
            report.home_team = equips[0].get_text(strip=True)
            report.away_team = equips[1].get_text(strip=True)
        
        resultat = soup.find(class_="acta-resultat")
        if resultat:
            score_text = resultat.get_text(strip=True)
            m = re.search(r"(\d+)\s*[-–]\s*(\d+)", score_text)
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

    # Staff name sets are built when Equip Tècnic tables are parsed (which appear
    # BEFORE the matching Targetes table in the FCF acta layout), so a single pass suffices.
    home_staff_names: set[str] = set()
    away_staff_names: set[str] = set()

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
            # Pass the pre-built staff name set so tech staff cards are flagged correctly
            staff_names = home_staff_names if current_team == "home" else away_staff_names
            cards = _parse_cards(data_rows, table, staff_names)
            team_label = current_team
            for card in cards:
                card.team = team_label
                if card.card_type == "yellow":
                    report.yellow_cards.append(card)
                else:
                    report.red_cards.append(card)

        elif "Gols" in header:
            found_goals = True
            # FCF wraps goals in one or multiple tbody elements
            goal_rows = []
            tbodies = table.find_all("tbody")
            if tbodies:
                for tbody in tbodies:
                    goal_rows.extend(tbody.find_all("tr"))
            else:
                goal_rows = data_rows # fallback

            goals = _parse_goals(goal_rows, report.home_team, report.away_team, soup)
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
            # Parse full technical staff (replaces the old coach-only _parse_coach).
            # Staff table MUST be parsed BEFORE Targetes so staff_names are available.
            staff = _parse_technical_staff(data_rows)
            if current_team == "home" and not report.home_staff:
                report.home_staff = staff
                home_staff_names = {m.name.strip().lower() for m in staff}
                if not report.home_coach:
                    report.home_coach = next(
                        (m.name for m in staff if m.role == "E"), ""
                    )
            elif current_team == "away" and not report.away_staff:
                report.away_staff = staff
                away_staff_names = {m.name.strip().lower() for m in staff}
                if not report.away_coach:
                    report.away_coach = next(
                        (m.name for m in staff if m.role == "E"), ""
                    )

    staff_yc = sum(1 for c in report.yellow_cards if c.recipient_type == "technical_staff")
    staff_rc = sum(1 for c in report.red_cards if c.recipient_type == "technical_staff")
    logger.info(
        f"Acta J{report.jornada}: {report.home_team} {report.home_score}-{report.away_score} {report.away_team} | "
        f"Home XI:{len(report.home_lineup)} Away XI:{len(report.away_lineup)} | "
        f"Goals:{len(report.goals)} YC:{len(report.yellow_cards)} RC:{len(report.red_cards)} "
        f"(staff YC:{staff_yc} RC:{staff_rc})"
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
    """Parse goals from the Gols table.
    
    Warning: FCF HTML for goals is often malformed (missing </a> tags)
    and split across multiple <tr> rows for a single goal.
    Instead of relying on BeautifulSoup's DOM tree which gets corrupted,
    we extract the raw HTML of all rows and parse it with regex.
    """
    goals = []
    prev_home_score = 0
    prev_away_score = 0
    
    # Concatenate all row HTML into one string so we can find goals
    # even if they are split across multiple rows (scorer in next tr, etc)
    tbl_html = "".join(str(row) for row in rows)
    
    # We look for the marker "<div class="acta-marcador-gol">" to identify a goal block.
    # The block ends before the next marker or end of string.
    blocks = re.split(r'class="acta-marcador-gol"[^>]*>', tbl_html)[1:]
    
    for block in blocks:
        # Extract score: \s* 0 - 1 \s* <
        score_match = re.search(r'^\s*(\d+)\s*[-–]\s*(\d+)\s*<', block)
        if not score_match:
            continue
            
        new_home = int(score_match.group(1))
        new_away = int(score_match.group(2))
        
        # Determine team from running score change
        team = ""
        if new_home > prev_home_score:
            team = "home"
        elif new_away > prev_away_score:
            team = "away"
        prev_home_score = new_home
        prev_away_score = new_away
        
        # Extract scorer name: <a href="...jugador...">PLAYER NAME ... <
        scorer = ""
        name_match = re.search(r'<a href="[^"]*jugador[^"]*">([^<]+)', block)
        if name_match:
            scorer = name_match.group(1).strip()
            
        # Extract minute: <td>12'</td> or <td> 12' </td>
        minute = ""
        min_match = re.search(r'<td>\s*(\d+)[\'\u2032]?\s*</td>', block)
        if min_match:
            minute = min_match.group(1).strip()
            
        if scorer:
            goals.append(GoalEvent(
                player=scorer,
                minute=minute,
                team=team,
            ))

    return goals


def _parse_technical_staff(rows: list[Tag]) -> list[TechnicalStaffMember]:
    """Parse the Equip Tècnic (technical staff) table.

    Structure:
      td[0] class='tc'          → staff member name
      td[1] class='p-r w-44px'  → role code
        E = Entrenador (head coach)
        2 = 2n Entrenador (assistant coach)
        D = Delegat (team delegate)
        A = Auxiliar / Ajudant (field assistant)
        F = Fisioterapeuta / Preparador Físic (physio / fitness)
        X = Altre (other, or expelled bench occupant)
    """
    staff = []
    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 2:
            continue
        # Name may have a link or plain text
        name = ""
        link = cols[0].find("a")
        name = link.get_text(strip=True) if link else cols[0].get_text(strip=True)
        role = cols[1].get_text(strip=True)
        if name and len(name) >= 3:
            staff.append(TechnicalStaffMember(name=name, role=role))
    return staff


def _parse_cards(rows: list[Tag], table: Tag, staff_names: set[str] | None = None) -> list[CardEvent]:
    """Parse cards from the Targetes table.

    FCF uses a single "Targetes" section for ALL cards (yellow and red).
    The card type is indicated by a CSS class inside .acta-stat-box:
      - div.groga-s    → yellow card (groga = yellow in Catalan)
      - div.vermella-s → direct red card
      - div.doble-groga-s → double yellow (treated as red; rare/unseen in practice)

    The table header is ALWAYS "Targetes" regardless of card colour,
    so we must read the per-row CSS class, NOT the table header.

    Double yellow detection:
      FCF does NOT add a separate vermella-s entry when a 2nd yellow causes expulsion.
      Instead the same player appears TWICE with groga-s in the same team section.
      We detect this by tracking seen groga-s players within this call and marking
      the 2nd occurrence with is_double_yellow_dismissal=True.
      Both yellows keep card_type="yellow" (FCF Art.336: neither counts for accumulation).

    Technical staff detection (recipient_type):
      Staff members who receive a card appear in this table with an EMPTY dorsal.
      They are also listed in the preceding Equip Tècnic table.
      Strategy:
        - If staff_names is provided → match by name (most accurate).
        - If staff_names is empty/None → fall back to empty dorsal heuristic.

    Args:
        rows:        Data rows of the Targetes table (header row excluded).
        table:       The full table Tag (unused now, kept for API compat).
        staff_names: Normalised (lowercase) set of technical staff names for this team.
    """
    if staff_names is None:
        staff_names = set()

    cards: list[CardEvent] = []
    seen_yellow: set[str] = set()  # for double-yellow detection within this section

    for row in rows:
        # ── Player / staff name ──
        name_el = row.find(class_="samarreta-acta2")
        name = ""
        if name_el:
            link = name_el.find("a")
            name = link.get_text(strip=True) if link else name_el.get_text(strip=True)
        if not name:
            link = row.find("a")
            if link:
                name = link.get_text(strip=True)

        if not name or len(name) < 3:
            continue

        # ── Minute ──
        minute = ""
        min_el = row.find(class_="acta-minut-targeta")
        if min_el:
            minute = min_el.get_text(strip=True).replace("'", "").replace("\u2032", "").strip()

        # ── Card type from CSS class inside .acta-stat-box ──
        card_type = "yellow"
        is_groga = True
        stat_box = row.find(class_="acta-stat-box")
        if stat_box:
            inner_classes = " ".join(
                " ".join(d.get("class", []))
                for d in stat_box.find_all("div")
            ).lower()
            if "vermella-s" in inner_classes or "doble-groga-s" in inner_classes:
                card_type = "red"
                is_groga = False

        # ── Double-yellow detection ──
        is_double_yellow_dismissal = False
        if is_groga:
            name_key = name.strip().lower()
            if name_key in seen_yellow:
                is_double_yellow_dismissal = True
            else:
                seen_yellow.add(name_key)

        # ── Recipient type: player or technical staff ──
        name_norm = name.strip().lower()
        num_el = row.find(class_="num-samarreta-acta2")
        dorsal_val = num_el.get_text(strip=True) if num_el else ""

        if staff_names:
            # Primary signal: name appears in the team's Equip Tècnic table
            recipient_type = "technical_staff" if name_norm in staff_names else "player"
        else:
            # Fallback when Equip Tècnic couldn't be parsed:
            # empty / non-numeric dorsal strongly suggests tech staff
            recipient_type = "technical_staff" if (not dorsal_val or not dorsal_val.isdigit()) else "player"

        cards.append(CardEvent(
            player=name,
            minute=minute,
            card_type=card_type,
            is_double_yellow_dismissal=is_double_yellow_dismissal,
            recipient_type=recipient_type,
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
