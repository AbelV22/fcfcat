"""Scrape jornada-by-jornada results for preferent-cadet-s15 grup-2 and dump JSON."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from scraper.http_client import FCFClient
from scraper.calendar_results import scrape_calendar

BASE = "https://www.fcf.cat"
SEASON = "2526"
SPORT = "futbol-11"
COMP = "preferent-cadet-s15"
GRP = "grup-2"

client = FCFClient()
cal_url = f"{BASE}/calendari/{SEASON}/{SPORT}/{COMP}/{GRP}"
print(f"Fetching calendar: {cal_url}")
cal = scrape_calendar(client, cal_url)
print(f"Calendar matches: {len(cal)}")

# Index fixtures by jornada+teams
def tk(s): return re.sub(r'\W+', '', s.lower())
by_key = {}
for m in cal:
    k = (m.jornada, tk(m.home_team), tk(m.away_team))
    by_key[k] = {
        "jornada": m.jornada, "date": m.date,
        "home": m.home_team, "away": m.away_team,
        "home_score": None, "away_score": None,
    }

# Fetch each jornada results page to harvest scores
for j in range(1, 31):
    url = f"{BASE}/resultats/{SEASON}/{SPORT}/{COMP}/{GRP}/jornada-{j}"
    try:
        soup = client.fetch_soup(url)
    except Exception as e:
        print(f"J{j}: fetch error {e}")
        continue

    tables = soup.find_all("table", class_=lambda c: c and "table_resultats" in c)
    found = 0
    for table in tables:
        team_links = table.find_all("a", href=re.compile(r"/equip/|/calendari-equip/"))
        teams = [a.get_text(strip=True) for a in team_links if a.get_text(strip=True)]
        if len(teams) < 2:
            continue
        home, away = teams[0], teams[-1]

        # Score: look for a specific cell with "N - M" format
        txt = table.get_text(" ", strip=True)
        txt_nd = re.sub(r'\d{2}[/-]\d{2}[/-]\d{4}', '', txt)
        txt_nd = re.sub(r'\d{2}:\d{2}', '', txt_nd)
        hs = as_ = None
        sm = re.search(r'(?<![\d\-/])\b(\d{1,2})\s*[-–]\s*(\d{1,2})\b(?![\d\-/])', txt_nd)
        if sm:
            s1, s2 = int(sm.group(1)), int(sm.group(2))
            if s1 <= 25 and s2 <= 25:
                hs, as_ = s1, s2
        k = (j, tk(home), tk(away))
        if k in by_key:
            if hs is not None:
                by_key[k]["home_score"] = hs
                by_key[k]["away_score"] = as_
                found += 1
        else:
            # fuzzy: find by jornada+best home substring
            for kk, v in by_key.items():
                if kk[0] != j: continue
                if tk(home) in kk[1] or kk[1] in tk(home):
                    if tk(away) in kk[2] or kk[2] in tk(away):
                        if hs is not None:
                            v["home_score"] = hs; v["away_score"] = as_
                            found += 1
                        break
    print(f"J{j}: {found} scores filled ({len(tables)} tables on page)")

out = sorted(by_key.values(), key=lambda x: (x["jornada"], x["date"]))
played = sum(1 for m in out if m["home_score"] is not None)
out_path = Path(__file__).parent / "data" / "pc15_g2_matches.json"
out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2))
print(f"Total: {len(out)}, played: {played}, remaining: {len(out)-played}")
print(f"Saved to {out_path}")
