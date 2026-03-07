"""Debug script to test acta main headers using requests"""
import requests
from bs4 import BeautifulSoup

url = "https://www.fcf.cat/acta/2526/futbol-11/segona-catalana/grup-3/2cat/marianao-poblet-ud-a/2cat/fundacio-academia-f-lhospitalet-a"
headers = {"User-Agent": "Mozilla/5.0"}
resp = requests.get(url, headers=headers)
soup = BeautifulSoup(resp.text, "lxml")

acta_tables = soup.find_all(class_=["acta-table", "acta-table2"])
print(f"Found {len(acta_tables)} tables")

for t in acta_tables:
    rows = t.find_all("tr")
    if not rows: continue
    header = rows[0].get_text(strip=True)
    print(f"Table header: '{header}' | rows={len(rows)}")
    if "Gols" in header:
        print(" -> Found GOLS block!")
