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
from datetime import date

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
    'primera-catalana',
    'segona-catalana',
    'tercera-catalana',
    'quarta-catalana',
    'preferent-juvenils',
    'juvenil-primera-divisio',
]

# Competition slug → short code used in FCF acta URLs
COMP_CODES = {
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


def fetch_upcoming_matches(sb, competition: str | None = None, jornada: int | None = None):
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
        d_str = r.get('match_date', '')
        try:
            parts = d_str.split('-')
            d = date(int(parts[2]), int(parts[1]), int(parts[0]))
            if d >= today:
                upcoming.append(r)
        except Exception:
            pass

    return upcoming


def main():
    parser = argparse.ArgumentParser(description='Update referee assignments for upcoming matches')
    parser.add_argument('--competition', help='Filter to one competition slug')
    parser.add_argument('--jornada', type=int, help='Filter to a specific jornada number')
    parser.add_argument('--dry-run', action='store_true', help='Print what would be updated without writing')
    args = parser.parse_args()

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    client = FCFClient()

    print("Fetching upcoming matches from Supabase...")
    matches = fetch_upcoming_matches(sb, competition=args.competition, jornada=args.jornada)
    print(f"Found {len(matches)} upcoming matches")

    # Group by competition for reporting
    from collections import Counter
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
