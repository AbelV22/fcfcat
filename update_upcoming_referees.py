#!/usr/bin/env python3
"""
update_upcoming_referees.py

Fetches upcoming matches from Supabase fcf_matches, scrapes the FCF acta page
for each one to extract the pre-assigned referee, and updates fcf_matches.referee.

FCF publishes referee assignments on the acta page before the match is played.

Usage:
    python update_upcoming_referees.py
    python update_upcoming_referees.py --competition tercera-catalana
    python update_upcoming_referees.py --jornada 23
"""

import argparse
import io
import os
import sys
import time
from collections import Counter, defaultdict
from datetime import date, timedelta
from typing import Optional

# Force UTF-8 output on Windows to handle special characters (✓, accented names, etc.)
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ('utf-8', 'utf8'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from dotenv import load_dotenv

load_dotenv('.env')

from supabase import create_client
from scraper.http_client import FCFClient
from scraper.calendar_results import extract_referee_from_upcoming_acta

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_KEY']

PRIORITY_COMPETITIONS = [
    'lliga-elit',
    'primera-catalana',
    'segona-catalana',
    'tercera-catalana',
    'quarta-catalana',
    'preferent-juvenils',
    'juvenil-primera-divisio',
]

# Competition slug → short code used in FCF acta URLs
COMP_CODES = {
    'lliga-elit':              'elit',
    'primera-catalana':        '1cat',
    'segona-catalana':         '2cat',
    'tercera-catalana':        '3cat',
    'quarta-catalana':         '4cat',
    'preferent-juvenils':      'pj',
    'juvenil-primera-divisio': '1j',
}

def build_acta_url(season: str, competition: str, group: str, home_slug: str, away_slug: str) -> str:
    code = COMP_CODES.get(competition, competition[:4])
    return f"https://www.fcf.cat/acta/{season}/futbol-11/{competition}/{group}/{code}/{home_slug}/{code}/{away_slug}"


def _parse_match_date(d_str: str) -> Optional[date]:
    """Parse dd-mm-yyyy date string into a date object."""
    if not d_str:
        return None
    try:
        parts = d_str.split('-')
        return date(int(parts[2]), int(parts[1]), int(parts[0]))
    except Exception:
        return None


def fetch_upcoming_matches(sb, competition: Optional[str] = None, jornada: Optional[int] = None):
    today = date.today()
    query = (
        sb.table('fcf_matches')
        .select('id, season, competition, group_name, jornada, match_date, home_slug, away_slug, acta_url, referee')
        .is_('home_score', 'null')
    )
    if competition:
        query = query.eq('competition', competition)
    else:
        query = query.in_('competition', PRIORITY_COMPETITIONS)
    if jornada:
        query = query.eq('jornada', jornada)

    # Paginate
    all_rows = []
    offset = 0
    while True:
        res = query.range(offset, offset + 999).execute()
        if not res.data:
            break
        all_rows.extend(res.data)
        if len(res.data) < 1000:
            break
        offset += 1000

    # Filter to matches on or after today
    upcoming = []
    for r in all_rows:
        d = _parse_match_date(r.get('match_date', ''))
        if d and d >= today:
            r['_parsed_date'] = d
            upcoming.append(r)

    return upcoming


def filter_next_jornada(matches: list) -> list:
    """
    Detect the next jornada per (competition, group) and return only those matches.

    Strategy:
    1. Group matches by (competition, group_name)
    2. For each group, find the jornada whose earliest match date is closest to today
    3. Return only matches belonging to those jornadas

    This handles cases where different competitions/groups may be on different
    jornada numbers, and where a single jornada spans multiple days (Sat+Sun).
    """
    # Group by (competition, group) → list of matches
    by_comp_group = defaultdict(list)
    for m in matches:
        key = (m['competition'], m['group_name'])
        by_comp_group[key].append(m)

    result = []
    for (comp, group), group_matches in by_comp_group.items():
        # For each jornada in this group, find its earliest date
        jornada_earliest = {}
        jornada_matches = defaultdict(list)
        for m in group_matches:
            j = m.get('jornada')
            if j is None:
                continue
            jornada_matches[j].append(m)
            d = m.get('_parsed_date')
            if d:
                if j not in jornada_earliest or d < jornada_earliest[j]:
                    jornada_earliest[j] = d

        if not jornada_earliest:
            continue

        # Pick the jornada with the earliest date (the next one to be played)
        next_jornada = min(jornada_earliest, key=lambda j: jornada_earliest[j])
        result.extend(jornada_matches[next_jornada])

    return result


def _fetch_with_date_window(sb, competition: Optional[str], date_strings: list) -> list:
    """Fetch unplayed matches whose match_date is in the given list of dd-mm-yyyy strings."""
    all_rows = []
    # Supabase `in_` has a size limit, so batch if needed
    for i in range(0, len(date_strings), 50):
        batch = date_strings[i:i+50]
        query = (
            sb.table('fcf_matches')
            .select('id, season, competition, group_name, jornada, match_date, home_slug, away_slug, acta_url, referee')
            .is_('home_score', 'null')
            .in_('match_date', batch)
        )
        if competition:
            query = query.eq('competition', competition)
        else:
            query = query.in_('competition', PRIORITY_COMPETITIONS)

        offset = 0
        while True:
            res = query.range(offset, offset + 999).execute()
            if not res.data:
                break
            all_rows.extend(res.data)
            if len(res.data) < 1000:
                break
            offset += 1000

    # Attach parsed dates
    for r in all_rows:
        r['_parsed_date'] = _parse_match_date(r.get('match_date', ''))

    return all_rows


def _fetch_next_jornada_fast(sb, competition: Optional[str] = None) -> list:
    """
    Efficiently fetch only the next jornada's matches.

    1. Generate date strings for the next 14 days (covers a full jornada weekend window)
    2. Query Supabase filtering by those specific dates (much smaller result set)
    3. Detect next jornada per (competition, group) from the results
    4. If some groups have no matches in 14 days, extend to 28 days for those
    """
    today = date.today()

    # Generate dd-mm-yyyy strings for next 14 days
    date_strings_14 = []
    for i in range(14):
        d = today + timedelta(days=i)
        date_strings_14.append(d.strftime('%d-%m-%Y'))

    print(f"  Querying matches for {date_strings_14[0]} to {date_strings_14[-1]}...")
    matches_14 = _fetch_with_date_window(sb, competition, date_strings_14)
    print(f"  Found {len(matches_14)} matches in next 14 days")

    # Detect next jornada per group from 14-day window
    result = filter_next_jornada(matches_14)

    # Check which comp/groups we found — if any priority comp has 0 matches, extend window
    found_comps = set(m['competition'] for m in result)
    comps_to_check = [c for c in PRIORITY_COMPETITIONS if c not in found_comps]
    if competition:
        comps_to_check = [competition] if competition not in found_comps else []

    if comps_to_check:
        # Extend to 28 days for missing competitions
        date_strings_28 = []
        for i in range(14, 28):
            d = today + timedelta(days=i)
            date_strings_28.append(d.strftime('%d-%m-%Y'))

        print(f"  Extending search to 28 days for: {', '.join(comps_to_check)}")
        for comp in comps_to_check:
            extra = _fetch_with_date_window(sb, comp, date_strings_28)
            if extra:
                result.extend(filter_next_jornada(extra))

    return result


def main():
    parser = argparse.ArgumentParser(description='Update referee assignments for upcoming matches')
    parser.add_argument('--competition', help='Filter to one competition slug')
    parser.add_argument('--jornada', type=int, help='Filter to a specific jornada number')
    parser.add_argument('--next', action='store_true', help='Only process the next jornada per competition/group (auto-detected)')
    parser.add_argument('--dry-run', action='store_true', help='Print what would be updated without writing')
    args = parser.parse_args()

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    client = FCFClient()

    print("Fetching upcoming matches from Supabase...")
    if args.next and not args.jornada:
        # Two-pass approach for --next:
        # 1) Fetch only matches in the next 2 weeks (small payload)
        # 2) Detect next jornada per group from that window
        # 3) If a group has no matches in 2 weeks, widen to 4 weeks
        matches = _fetch_next_jornada_fast(sb, competition=args.competition)
        dates = sorted(set(m.get('match_date', '') for m in matches))
        print(f"--next: {len(matches)} matches (next jornada per group)")
        print(f"  Dates: {', '.join(dates)}")
    else:
        matches = fetch_upcoming_matches(sb, competition=args.competition, jornada=args.jornada)
        print(f"Found {len(matches)} total upcoming matches")

    comp_counts = Counter(r['competition'] for r in matches)
    for comp, cnt in sorted(comp_counts.items()):
        print(f"  {comp}: {cnt} matches")

    updated = 0
    skipped_no_ref = 0
    skipped_already = 0
    errors = 0

    for i, m in enumerate(matches):
        # Build acta URL — use stored one if available, else construct it
        acta_url = m.get('acta_url') or ''
        if not acta_url:
            if m.get('home_slug') and m.get('away_slug'):
                acta_url = build_acta_url(
                    m['season'], m['competition'], m['group_name'],
                    m['home_slug'], m['away_slug']
                )

        if not acta_url:
            errors += 1
            continue

        # Skip if already has referee
        if m.get('referee'):
            skipped_already += 1
            continue

        # Throttle
        if i > 0 and i % 10 == 0:
            time.sleep(0.5)

        try:
            refs = extract_referee_from_upcoming_acta(client, acta_url)
        except Exception as e:
            print(f"  ERROR scraping {acta_url}: {e}")
            errors += 1
            continue

        if not refs:
            skipped_no_ref += 1
            continue

        main_referee = refs[0]

        if args.dry_run:
            print(f"  DRY-RUN [{m['competition']} {m['group_name']} J{m['jornada']}] "
                  f"{m.get('home_slug','')} vs {m.get('away_slug','')} → {main_referee}")
            updated += 1
            continue

        # Update Supabase
        try:
            sb.table('fcf_matches').update({'referee': main_referee}).eq('id', m['id']).execute()
            updated += 1
        except Exception as e:
            print(f"  ERROR updating {m['id']}: {e}")
            errors += 1
            continue
        print(f"  OK [{m['competition']} {m['group_name']} J{m['jornada']}] "
              f"{m.get('home_slug','')} vs {m.get('away_slug','')} => {main_referee}")

        time.sleep(0.3)

    print(f"\nDone! Updated: {updated}, No ref yet: {skipped_no_ref}, Already had ref: {skipped_already}, Errors: {errors}")


if __name__ == '__main__':
    main()
