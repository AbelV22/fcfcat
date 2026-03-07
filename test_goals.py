"""Test script for the new regex-based goal parser."""
from scraper.http_client import FCFClient
from scraper.actas import scrape_acta

c = FCFClient()
url = "https://www.fcf.cat/acta/2526/futbol-11/segona-catalana/grup-3/2cat/marianao-poblet-ud-a/2cat/fundacio-academia-f-lhospitalet-a"

a = scrape_acta(c, url)
if a:
    print(f"J{a.jornada}: {a.home_team} {a.home_score}-{a.away_score} {a.away_team}")
    print(f"Goals ({len(a.goals)}):")
    for g in a.goals:
        print(f"  {g.team} min {g.minute}: {g.player}")
