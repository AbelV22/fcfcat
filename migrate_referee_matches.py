#!/usr/bin/env python3
"""
Migrate fcf_referee_matches from SQLite (data/fcf.db) to Supabase.
Fills in priority competitions that are currently missing:
  - tercera-catalana
  - quarta-catalana
  - preferent-juvenils
  - juvenil-primera-divisio
"""

import sqlite3
import json
import os
import time
from dotenv import load_dotenv

load_dotenv('.env')
from supabase import create_client

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_KEY']
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

DB_PATH = 'data/fcf.db'

# Competitions to migrate (add all not yet in Supabase)
TARGET_COMPETITIONS = [
    'tercera-catalana',
    'quarta-catalana',
    'preferent-juvenils',
    'juvenil-primera-divisio',
]

def build_id(jornada, home_team, away_team):
    return f"J{jornada}-{home_team}-v-{away_team}"

def load_actas(competition=None):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    if competition:
        cur.execute(
            "SELECT acta_url, season, competition, grp, jornada, home_team, away_team, data_json "
            "FROM actas WHERE competition = ?",
            (competition,)
        )
    else:
        placeholders = ','.join('?' * len(TARGET_COMPETITIONS))
        cur.execute(
            f"SELECT acta_url, season, competition, grp, jornada, home_team, away_team, data_json "
            f"FROM actas WHERE competition IN ({placeholders})",
            TARGET_COMPETITIONS
        )
    rows = cur.fetchall()
    conn.close()
    return rows

def transform_row(row):
    acta_url, season, competition, grp, jornada, home_team, away_team, data_json_str = row
    try:
        data = json.loads(data_json_str)
    except Exception:
        return None

    referees = data.get('referees', [])
    main_referee = referees[0] if referees else None

    # Skip if no referee data
    if not main_referee:
        return None

    yellow_cards = data.get('yellow_cards', [])
    red_cards = data.get('red_cards', [])
    home_score = data.get('home_score')
    away_score = data.get('away_score')
    match_date = data.get('date', '')

    row_id = build_id(jornada, home_team, away_team)

    return {
        'id': row_id,
        'competition': competition,
        'group_name': grp,
        'season': season,
        'jornada': int(jornada) if jornada else None,
        'match_date': match_date,
        'home_team': home_team,
        'away_team': away_team,
        'home_score': int(home_score) if home_score is not None else None,
        'away_score': int(away_score) if away_score is not None else None,
        'main_referee': main_referee,
        'referees': referees,
        'yellow_cards': yellow_cards,
        'red_cards': red_cards,
    }

def upsert_batch(records, batch_size=200):
    total = len(records)
    pushed = 0
    errors = 0
    for i in range(0, total, batch_size):
        batch = records[i:i+batch_size]
        try:
            res = sb.table('fcf_referee_matches').upsert(batch, on_conflict='id').execute()
            pushed += len(batch)
            print(f"  Upserted {pushed}/{total}...")
        except Exception as e:
            print(f"  ERROR on batch {i//batch_size}: {e}")
            errors += len(batch)
        time.sleep(0.1)
    return pushed, errors

def main():
    print("Loading actas from SQLite...")
    rows = load_actas()
    print(f"Found {len(rows)} acta rows for priority competitions")

    records = []
    skipped = 0
    for row in rows:
        rec = transform_row(row)
        if rec is None:
            skipped += 1
        else:
            records.append(rec)

    print(f"Transformed: {len(records)} records, skipped (no referee): {skipped}")

    # Group by competition for reporting
    from collections import Counter
    comp_counts = Counter(r['competition'] for r in records)
    for comp, cnt in sorted(comp_counts.items()):
        print(f"  {comp}: {cnt} matches with referee data")

    print("\nUpserting to Supabase...")
    pushed, errors = upsert_batch(records)
    print(f"\nDone! Pushed: {pushed}, Errors: {errors}")

if __name__ == '__main__':
    main()
