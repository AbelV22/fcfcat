import requests
from bs4 import BeautifulSoup
import argparse

def get_html(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.content

def parse_standings(html, target_team):
    soup = BeautifulSoup(html, 'html.parser')
    standings_table = soup.find('table', class_='fcftable-e')
    
    if not standings_table:
        print("Could not find the standings table.")
        return None

    teams = []
    rows = standings_table.find('tbody').find_all('tr')
    for row in rows:
        cols = row.find_all('td')
        if len(cols) > 2:
            position = cols[0].text.strip()
            team_name = cols[2].text.strip()
            points = cols[3].text.strip()
            played = cols[4].text.strip()
            won = cols[5].text.strip()
            drawn = cols[6].text.strip()
            lost = cols[7].text.strip()
            
            team_info = {
                'position': position,
                'name': team_name,
                'points': points,
                'played': played,
                'won': won,
                'drawn': drawn,
                'lost': lost
            }
            teams.append(team_info)

    target_info = next((t for t in teams if target_team.lower() in t['name'].lower()), None)
    return target_info, teams

def generate_report(team_info, standigs):
    if not team_info:
        return "Team not found in standings."

    report = f"# Informe del Equipo: {team_info['name']}\n\n"
    report += f"**Posición actual:** {team_info['position']}\n"
    report += f"**Puntos:** {team_info['points']}\n"
    report += f"**Partidos Jugados:** {team_info['played']}\n"
    report += f"**Victorias:** {team_info['won']} | **Empates:** {team_info['drawn']} | **Derrotas:** {team_info['lost']}\n\n"
    
    # Próximo oponente se debería extraer del calendario, pero como prueba inicial mostraremos estadísticas del equipo.
    report += "## Estadísticas de Competición\n"
    report += "Este es un reporte preliminar extraído de la clasificación actual de la liga.\n"
    
    return report

def main():
    parser = argparse.ArgumentParser(description="Scrape FCF data for a team.")
    parser.add_argument("--url", default="https://www.fcf.cat/classificacio/2526/futbol-11/segona-catalana/grup-3", help="URL of the FCF group standings")
    parser.add_argument("--team", default="Fundació Academia", help="Target team name to search for (use substring to avoid accent issues)")
    
    args = parser.parse_args()
    
    print(f"Scraping data from: {args.url}")
    print(f"Looking for team: {args.team}")
    
    try:
        html = get_html(args.url)
        team_info, standings = parse_standings(html, args.team)
        
        report = generate_report(team_info, standings)
        print("\n" + "="*50 + "\n")
        print(report)
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
