from scraper.http_client import FCFClient

client = FCFClient(rate_limit_seconds=0.5, max_retries=2, use_cache=True, cache_ttl_seconds=3600)

target_url = "https://www.fcf.cat/acta/2526/futbol-11/segona-catalana/grup-3/2cat/marianao-poblet-ud-a/2cat/fundacio-academia-f-lhospitalet-a"
print(f"Fetching '{target_url}'...")
soup = client.fetch_soup(target_url)
tables = soup.find_all(class_=["acta-table", "acta-table2"])

for t in tables:
    rows = t.find_all("tr")
    if not rows: continue
    header = rows[0].get_text(strip=True)
    
    if "Gols" in header:
        print("\n" + "="*80)
        print(f"GOLS HTML (First 1500 chars): [{len(rows)} rows]")
        print("="*80)
        print(str(t)[:1500])
            
    if "Targetes" in header:
        print("\n" + "="*80)
        print(f"TARGETES HTML [{header}] (First 1500 chars):")
        print("="*80)
        print(str(t)[:1500])
