"""Test substitution parsing after rewrite."""
from scraper.http_client import FCFClient
from scraper.actas import scrape_acta
from scraper.calendar_results import get_acta_urls_from_calendar

c = FCFClient()
urls = get_acta_urls_from_calendar(c, "https://www.fcf.cat/calendari/2526/futbol-11/segona-catalana/grup-3")
prat_urls = [u for u in urls if "prat" in u.lower()]
url = prat_urls[0]

a = scrape_acta(c, url)
if a:
    print(f"J{a.jornada}: {a.home_team} {a.home_score}-{a.away_score} {a.away_team}")
    print(f"Substitutions ({len(a.substitutions)}):")
    for s in a.substitutions:
        print(f"  {s.team} min {s.minute}: {s.player_out} -> {s.player_in}")
    print(f"\nGoals ({len(a.goals)}):")
    for g in a.goals:
        print(f"  {g.team} min {g.minute}: {g.player}")
    print(f"\nYellow cards ({len(a.yellow_cards)}):")
    for c2 in a.yellow_cards:
        print(f"  {c2.team} min {c2.minute}: {c2.player}")
