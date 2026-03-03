"""
FCF Report Generator

Generates a complete, self-contained HTML intelligence report from fcf_data.json.

Usage:
    python -m scraper.report --input data/fcf_data.json --output report.html
    python -m scraper.report --input data/teams/fundacio-academia.json
"""
import argparse
import io
import json
import sys
from datetime import datetime
from pathlib import Path

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")


def _card_color(card_type: str) -> str:
    ct = card_type.lower()
    if "roja" in ct or "red" in ct:
        return "#dc2626"
    if "groga" in ct or "yellow" in ct or "amarilla" in ct:
        return "#f59e0b"
    if "blava" in ct or "blue" in ct:
        return "#3b82f6"
    return "#6b7280"


def _result_badge(result: str) -> str:
    r = result.strip().upper()
    if r == "W":
        return '<span class="badge badge-w">V</span>'
    if r == "D":
        return '<span class="badge badge-d">E</span>'
    if r == "L":
        return '<span class="badge badge-l">D</span>'
    return f'<span class="badge badge-n">{r}</span>'


def _pct_bar(value: float, max_val: float = 100.0, color: str = "#3b82f6") -> str:
    pct = min(100.0, (value / max_val * 100) if max_val > 0 else 0)
    return f'<div class="bar-bg"><div class="bar-fill" style="width:{pct:.1f}%;background:{color}"></div></div>'


def generate_report(data: dict, output_path: Path) -> None:
    """Generate a self-contained HTML report from FCF data."""

    meta = data.get("meta", {})
    team_name = meta.get("team") or data.get("team_intelligence", {}).get("team_name", "Equip")
    rival_name = meta.get("rival") or data.get("rival_intelligence", {}).get("team_name", "")
    season = meta.get("season", "2526")
    competition = meta.get("competition", "")
    group = meta.get("group", "")
    scraped_at = meta.get("scraped_at", "")

    standings = data.get("standings", [])
    matches = data.get("matches", [])
    actas = data.get("actas", [])
    scorers = data.get("scorers_from_actas") or data.get("scorers", [])
    sanctions = data.get("sanctions", [])
    fair_play = data.get("fair_play", [])
    validation = data.get("validation", {})
    team_intel = data.get("team_intelligence", {})
    team_insights = data.get("team_insights", [])
    rival_intel = data.get("rival_intelligence", {})
    rival_insights = data.get("rival_insights", [])

    # Find our team in standings
    our_standing = None
    for s in standings:
        name_norm = s.get("name", "").lower()
        team_norm = team_name.lower()
        # Simple keyword match
        if any(kw in name_norm for kw in team_norm.split() if len(kw) > 3):
            our_standing = s
            break

    # ─── HTML GENERATION ──────────────────────────────────────────────────────

    def standings_table_html() -> str:
        if not standings:
            return "<p class='empty'>No hi ha dades de classificació disponibles.</p>"

        rows = ""
        for s in standings:
            is_our = our_standing and s.get("name") == our_standing.get("name")
            row_cls = " our-team" if is_our else ""
            pos = s.get("position", "")
            name = s.get("name", "")
            pts = s.get("points", 0)
            pj = s.get("played", 0)
            pg = s.get("won", 0)
            pe = s.get("drawn", 0)
            pp = s.get("lost", 0)
            gf = s.get("goals_for", 0)
            gc = s.get("goals_against", 0)
            gd = gf - gc
            gd_str = f"+{gd}" if gd > 0 else str(gd)
            rows += f"""<tr class="{row_cls}">
                <td class="center">{pos}</td>
                <td class="team-name">{'⭐ ' if is_our else ''}{name}</td>
                <td class="center">{pj}</td>
                <td class="center">{pg}</td>
                <td class="center">{pe}</td>
                <td class="center">{pp}</td>
                <td class="center">{gf}</td>
                <td class="center">{gc}</td>
                <td class="center">{gd_str}</td>
                <td class="center bold">{pts}</td>
            </tr>"""
        return f"""<table class="data-table">
            <thead><tr>
                <th>#</th><th>Equip</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th>
                <th>GF</th><th>GC</th><th>GD</th><th>Pts</th>
            </tr></thead>
            <tbody>{rows}</tbody>
        </table>"""

    def scorers_table_html(scorer_list: list, limit: int = 15) -> str:
        if not scorer_list:
            return "<p class='empty'>No hi ha dades de golejadors.</p>"

        rows = ""
        for i, s in enumerate(scorer_list[:limit], 1):
            name = s.get("name", "")
            team = s.get("team", "")
            goals = s.get("goals", 0)
            pens = s.get("penalties", 0)
            bar = _pct_bar(goals, scorer_list[0].get("goals", 1), "#10b981")
            pen_str = f" ({pens}P)" if pens else ""
            rows += f"""<tr>
                <td class="center">{i}</td>
                <td>{name}</td>
                <td class="team-name-sm">{team}</td>
                <td class="center">{goals}{pen_str}</td>
                <td style="min-width:120px">{bar}</td>
            </tr>"""
        return f"""<table class="data-table">
            <thead><tr>
                <th>#</th><th>Jugador</th><th>Equip</th><th>Gols</th><th>Rànquing</th>
            </tr></thead>
            <tbody>{rows}</tbody>
        </table>"""

    def players_table_html(intel: dict, highlight_team: str = "") -> str:
        players = intel.get("players", {})
        if not players:
            return "<p class='empty'>No hi ha dades de jugadors (necessita actes).</p>"

        # Sort by minutes desc, then goals desc
        sorted_players = sorted(
            players.items(),
            key=lambda x: (x[1].get("goals", 0) + x[1].get("assists", 0) * 0.5),
            reverse=True
        )

        rows = ""
        for name, stats in sorted_players:
            apps = stats.get("appearances", 0)
            mins = stats.get("minutes_played", 0)
            goals = stats.get("goals", 0)
            yellows = stats.get("yellow_cards", 0)
            reds = stats.get("red_cards", 0)
            dorsal = stats.get("dorsal", "")
            dorsal_str = f"#{dorsal}" if dorsal else ""

            cards_html = ""
            if yellows:
                cards_html += f'<span class="card-icon yellow">{yellows}🟨</span>'
            if reds:
                cards_html += f'<span class="card-icon red">{reds}🟥</span>'

            rows += f"""<tr>
                <td class="center text-muted">{dorsal_str}</td>
                <td>{name}</td>
                <td class="center">{apps}</td>
                <td class="center">{mins}'</td>
                <td class="center bold">{goals}</td>
                <td>{cards_html}</td>
            </tr>"""

        return f"""<table class="data-table">
            <thead><tr>
                <th>#</th><th>Jugador</th><th>PJ</th><th>Min</th><th>Gols</th><th>Targetes</th>
            </tr></thead>
            <tbody>{rows}</tbody>
        </table>"""

    def results_html(intel: dict) -> str:
        results = intel.get("results", [])
        if not results:
            return "<p class='empty'>No hi ha resultats processats.</p>"

        rows = ""
        for r in results[-10:][::-1]:  # Last 10, most recent first
            home = r.get("home_team", "")
            away = r.get("away_team", "")
            score = f"{r.get('home_score', '?')} - {r.get('away_score', '?')}"
            result = r.get("result", "")
            date = r.get("date", "")[:10] if r.get("date") else ""
            badge = _result_badge(result)
            rows += f"""<tr>
                <td class="text-muted small">{date}</td>
                <td>{home}</td>
                <td class="center score">{score}</td>
                <td>{away}</td>
                <td class="center">{badge}</td>
            </tr>"""

        return f"""<table class="data-table">
            <thead><tr>
                <th>Data</th><th>Local</th><th>Resultat</th><th>Visitant</th><th>R</th>
            </tr></thead>
            <tbody>{rows}</tbody>
        </table>"""

    def sanctions_html() -> str:
        if not sanctions:
            return "<p class='empty'>No hi ha sancions actives.</p>"

        rows = ""
        for s in sanctions:
            player = s.get("player", "")
            team = s.get("team", "")
            reason = s.get("reason", "")
            matches_left = s.get("matches_suspended", 0)
            rows += f"""<tr>
                <td>{player}</td>
                <td class="team-name-sm">{team}</td>
                <td>{reason}</td>
                <td class="center bold" style="color:#dc2626">{matches_left}</td>
            </tr>"""

        return f"""<table class="data-table">
            <thead><tr>
                <th>Jugador</th><th>Equip</th><th>Motiu</th><th>Partits</th>
            </tr></thead>
            <tbody>{rows}</tbody>
        </table>"""

    def insights_html(insights: list, color: str = "#3b82f6") -> str:
        if not insights:
            return "<p class='empty'>No hi ha insights disponibles (necessita més actes).</p>"

        cards = ""
        for ins in insights:
            label = ins.get("label", "")
            detail = ins.get("detail", "")
            value = ins.get("value", "")
            value_str = f'<span class="insight-value" style="color:{color}">{value}</span>' if value else ""
            cards += f"""<div class="insight-card">
                <div class="insight-label">{label}</div>
                {value_str}
                <div class="insight-detail">{detail}</div>
            </div>"""
        return f'<div class="insights-grid">{cards}</div>'

    def stat_card(label: str, value, sub: str = "") -> str:
        sub_html = f'<div class="stat-sub">{sub}</div>' if sub else ""
        return f"""<div class="stat-card">
            <div class="stat-value">{value}</div>
            <div class="stat-label">{label}</div>
            {sub_html}
        </div>"""

    def period_chart_html(intel: dict) -> str:
        goals_by_period = intel.get("goals_by_period", {})
        if not goals_by_period:
            return ""

        max_g = max(goals_by_period.values()) if goals_by_period else 1
        bars = ""
        for period, count in goals_by_period.items():
            height = (count / max(max_g, 1)) * 80
            bars += f"""<div class="period-bar-wrap">
                <div class="period-count">{count}</div>
                <div class="period-bar" style="height:{height}px"></div>
                <div class="period-label">{period}'</div>
            </div>"""
        return f'<div class="period-chart">{bars}</div>'

    def form_html(form: list) -> str:
        if not form:
            return ""
        badges = "".join(_result_badge(r) for r in form[-8:])
        return f'<div class="form-strip">{badges}</div>'

    # ── Build standing stats for our team ──
    our_pos = our_standing.get("position", "?") if our_standing else "?"
    our_pts = our_standing.get("points", 0) if our_standing else 0
    our_pj = our_standing.get("played", 0) if our_standing else 0
    our_gf = our_standing.get("goals_for", 0) if our_standing else 0
    our_gc = our_standing.get("goals_against", 0) if our_standing else 0

    # ── Actas summary ──
    total_actas = len(actas)
    total_goals_in_actas = sum(len(a.get("goals", [])) for a in actas)

    # ── Validation ──
    val_pct = validation.get("accuracy_pct", 0)
    val_passed = validation.get("passed", 0)
    val_total = validation.get("total_checks", 0)

    # ── Team intel stats ──
    t_wins = team_intel.get("wins", 0)
    t_draws = team_intel.get("draws", 0)
    t_losses = team_intel.get("losses", 0)
    t_goals_scored = team_intel.get("goals_scored", 0)
    t_goals_conceded = team_intel.get("goals_conceded", 0)
    t_form = team_intel.get("form", [])

    scrape_date = scraped_at[:10] if scraped_at else datetime.now().strftime("%Y-%m-%d")
    comp_pretty = competition.replace("-", " ").title()
    group_pretty = group.replace("-", " ").title()

    html = f"""<!DOCTYPE html>
<html lang="ca">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ProCoach | {team_name} — {comp_pretty}</title>
<style>
  :root {{
    --primary: #1e40af;
    --primary-light: #3b82f6;
    --success: #10b981;
    --warning: #f59e0b;
    --danger: #dc2626;
    --bg: #0f172a;
    --surface: #1e293b;
    --surface2: #334155;
    --text: #f1f5f9;
    --text-muted: #94a3b8;
    --border: #334155;
    --accent: #6366f1;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
    font-size: 14px;
  }}
  a {{ color: var(--primary-light); text-decoration: none; }}

  /* ── Header ── */
  .header {{
    background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
    padding: 32px 24px 24px;
    text-align: center;
  }}
  .header h1 {{ font-size: 2rem; font-weight: 800; letter-spacing: -0.5px; }}
  .header h2 {{ font-size: 1.1rem; font-weight: 400; opacity: 0.85; margin-top: 4px; }}
  .header .meta {{ margin-top: 12px; font-size: 0.8rem; opacity: 0.7; }}

  /* ── Layout ── */
  .container {{ max-width: 1200px; margin: 0 auto; padding: 24px 16px; }}
  .grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
  .grid-3 {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }}
  .grid-4 {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }}
  @media (max-width: 768px) {{
    .grid-2, .grid-3, .grid-4 {{ grid-template-columns: 1fr; }}
  }}

  /* ── Cards ── */
  .card {{
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
  }}
  .card-header {{
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }}
  .card-header h3 {{ font-size: 1rem; font-weight: 700; }}
  .card-icon {{ font-size: 1.4rem; }}

  /* ── Stat cards ── */
  .stat-card {{
    background: var(--surface2);
    border-radius: 10px;
    padding: 16px;
    text-align: center;
  }}
  .stat-value {{ font-size: 2rem; font-weight: 800; color: var(--primary-light); }}
  .stat-label {{ font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-top: 4px; }}
  .stat-sub {{ font-size: 0.7rem; color: var(--text-muted); margin-top: 2px; }}

  /* ── Tables ── */
  .data-table {{ width: 100%; border-collapse: collapse; font-size: 0.85rem; }}
  .data-table th {{
    background: var(--surface2);
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.5px;
    padding: 8px 10px;
    text-align: left;
  }}
  .data-table td {{ padding: 8px 10px; border-bottom: 1px solid var(--border); }}
  .data-table tr:last-child td {{ border-bottom: none; }}
  .data-table tr:hover td {{ background: rgba(255,255,255,0.03); }}
  .data-table tr.our-team td {{ background: rgba(99,102,241,0.12); font-weight: 600; }}
  .data-table .center {{ text-align: center; }}
  .data-table .bold {{ font-weight: 700; }}
  .data-table .team-name {{ font-weight: 600; }}
  .data-table .team-name-sm {{ color: var(--text-muted); font-size: 0.8rem; }}
  .data-table .score {{ font-weight: 700; font-size: 1rem; letter-spacing: 1px; }}
  .data-table .text-muted {{ color: var(--text-muted); }}
  .data-table .small {{ font-size: 0.75rem; }}

  /* ── Badges ── */
  .badge {{ display: inline-block; width: 22px; height: 22px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; text-align: center; line-height: 22px; }}
  .badge-w {{ background: #065f46; color: #6ee7b7; }}
  .badge-d {{ background: #713f12; color: #fde68a; }}
  .badge-l {{ background: #7f1d1d; color: #fca5a5; }}
  .badge-n {{ background: var(--surface2); color: var(--text-muted); }}

  /* ── Form strip ── */
  .form-strip {{ display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px; }}

  /* ── Progress bars ── */
  .bar-bg {{ background: var(--surface2); border-radius: 3px; height: 6px; overflow: hidden; }}
  .bar-fill {{ height: 100%; border-radius: 3px; transition: width 0.3s; }}

  /* ── Insights grid ── */
  .insights-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }}
  .insight-card {{
    background: var(--surface2);
    border-radius: 10px;
    padding: 14px;
    border-left: 3px solid var(--primary-light);
  }}
  .insight-label {{ font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 4px; }}
  .insight-value {{ font-size: 1.5rem; font-weight: 800; margin-bottom: 4px; }}
  .insight-detail {{ font-size: 0.8rem; color: var(--text-muted); }}

  /* ── Period chart ── */
  .period-chart {{ display: flex; align-items: flex-end; gap: 12px; padding: 16px 0; }}
  .period-bar-wrap {{ display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }}
  .period-bar {{ width: 100%; background: var(--primary-light); border-radius: 4px 4px 0 0; min-height: 4px; }}
  .period-count {{ font-size: 0.8rem; font-weight: 700; color: var(--primary-light); }}
  .period-label {{ font-size: 0.65rem; color: var(--text-muted); }}

  /* ── Section title ── */
  .section-title {{
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
    margin: 24px 0 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }}
  .section-title::after {{
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }}

  /* ── Validation bar ── */
  .val-bar {{ height: 8px; border-radius: 4px; background: var(--surface2); overflow: hidden; margin-top: 8px; }}
  .val-fill {{ height: 100%; border-radius: 4px; background: var(--success); }}

  /* ── Rival section ── */
  .rival-header {{ border-left: 4px solid var(--warning); padding-left: 12px; }}

  /* ── Empty state ── */
  .empty {{ color: var(--text-muted); font-style: italic; padding: 16px 0; font-size: 0.85rem; }}

  /* ── Card mini ── */
  .card-icon-inline {{ display: inline-block; }}
  .yellow {{ color: #f59e0b; }}
  .red {{ color: #dc2626; }}

  /* ── Footer ── */
  .footer {{
    text-align: center;
    padding: 32px 16px;
    color: var(--text-muted);
    font-size: 0.75rem;
    border-top: 1px solid var(--border);
    margin-top: 40px;
  }}
  .footer strong {{ color: var(--primary-light); }}
</style>
</head>
<body>

<!-- ══════════════════════════════════════════════════════════ HEADER -->
<div class="header">
  <div>⚽</div>
  <h1>{team_name}</h1>
  <h2>{comp_pretty} · {group_pretty} · Temporada {season[:2]}/{season[2:]}</h2>
  <div class="meta">Informe generat el {scrape_date} · ProCoach FCF Intelligence</div>
</div>

<div class="container">

<!-- ══════════════════════════════════════════════════════════ STATS BAR -->
<div class="grid-4" style="margin: 20px 0;">
  {stat_card("Posició", our_pos, f"{our_pts} punts")}
  {stat_card("Partits", our_pj, f"{t_wins}V {t_draws}E {t_losses}D")}
  {stat_card("Gols", f"{t_goals_scored}:{t_goals_conceded}", f"GD {'+' if t_goals_scored >= t_goals_conceded else ''}{t_goals_scored - t_goals_conceded}")}
  {stat_card("Actes", total_actas, f"{total_goals_in_actas} gols analitzats")}
</div>

{'<div class="card" style="padding:12px 20px;"><div style="margin-bottom:8px;font-size:0.8rem;color:var(--text-muted)">Forma recent</div>' + form_html(t_form) + '</div>' if t_form else ""}

<!-- ══════════════════════════════════════════════════════════ CLASSIFICACIÓ -->
<div class="section-title">🏆 Classificació</div>
<div class="card">
  <div class="card-header">
    <span class="card-icon">🏆</span>
    <h3>Classificació General — {comp_pretty} {group_pretty}</h3>
  </div>
  {standings_table_html()}
</div>

<!-- ══════════════════════════════════════════════════════════ INSIGHTS EQUIP -->
<div class="section-title">🧠 Intel·ligència de l'Equip</div>
<div class="card">
  <div class="card-header">
    <span class="card-icon">🧠</span>
    <h3>Insights — {team_name}</h3>
  </div>
  {insights_html(team_insights, color="#3b82f6")}
</div>

<!-- ══════════════════════════════════════════════════════════ GOLS PER PERIOD -->
{'''<div class="section-title">⏱️ Gols per Període</div>
<div class="card">
  <div class="card-header">
    <span class="card-icon">⏱️</span>
    <h3>Distribució de Gols per Minut</h3>
  </div>''' + period_chart_html(team_intel) + '</div>' if team_intel.get("goals_by_period") else ""}

<!-- ══════════════════════════════════════════════════════════ PLANTILLA -->
<div class="section-title">👥 Plantilla</div>
<div class="card">
  <div class="card-header">
    <span class="card-icon">👥</span>
    <h3>Jugadors Registrats — {team_name}</h3>
  </div>
  {players_table_html(team_intel)}
</div>

<!-- ══════════════════════════════════════════════════════════ RESULTATS -->
<div class="section-title">📅 Resultats Recents</div>
<div class="card">
  <div class="card-header">
    <span class="card-icon">📅</span>
    <h3>Últims Resultats</h3>
  </div>
  {results_html(team_intel)}
</div>

<!-- ══════════════════════════════════════════════════════════ GOLEJADORS -->
<div class="section-title">⚽ Golejadors</div>
<div class="card">
  <div class="card-header">
    <span class="card-icon">⚽</span>
    <h3>Màxims Golejadors de la Competició</h3>
  </div>
  {scorers_table_html(scorers)}
</div>

<!-- ══════════════════════════════════════════════════════════ SANCIONS -->
<div class="section-title">🟥 Sancions</div>
<div class="card">
  <div class="card-header">
    <span class="card-icon">🟥</span>
    <h3>Sancions Actives</h3>
  </div>
  {sanctions_html()}
</div>

{'<!-- ══════════════════════════════════════════════════════════ SCOUTING -->' if rival_intel else ""}
{f"""
<div class="section-title">🎯 Scouting Rival</div>
<div class="card">
  <div class="card-header rival-header">
    <span class="card-icon">🎯</span>
    <h3>Anàlisi Rival — {rival_intel.get('team_name', rival_name)}</h3>
  </div>
  {insights_html(rival_insights, color="#f59e0b")}
</div>

<div class="section-title">👥 Plantilla Rival</div>
<div class="card">
  <div class="card-header rival-header">
    <span class="card-icon">👥</span>
    <h3>Jugadors — {rival_intel.get('team_name', rival_name)}</h3>
  </div>
  {players_table_html(rival_intel)}
</div>
""" if rival_intel else ""}

<!-- ══════════════════════════════════════════════════════════ VALIDACIÓ -->
<div class="section-title">🔍 Qualitat de Dades</div>
<div class="card">
  <div class="card-header">
    <span class="card-icon">🔍</span>
    <h3>Informe de Validació Creuada</h3>
  </div>
  <div class="grid-3">
    {stat_card("Precisió", f"{val_pct:.1f}%", f"{val_passed}/{val_total} checks OK")}
    {stat_card("Actes", total_actas, "partits processats")}
    {stat_card("Gols validats", total_goals_in_actas, "des de les actes")}
  </div>
  <div class="val-bar" style="margin-top:16px">
    <div class="val-fill" style="width:{val_pct:.1f}%"></div>
  </div>
  <div style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">
    {val_pct:.1f}% de les verificacions han passat correctament
  </div>
</div>

</div><!-- /container -->

<div class="footer">
  Generat per <strong>ProCoach FCF Intelligence</strong> ·
  Dades de <a href="https://www.fcf.cat" target="_blank">fcf.cat</a> ·
  {scrape_date}
</div>

</body>
</html>"""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(html, encoding="utf-8")
    print(f"✅ Report generated: {output_path}")
    print(f"   Size: {output_path.stat().st_size:,} bytes")


def main():
    parser = argparse.ArgumentParser(
        description="FCF Report Generator — create HTML intelligence report from JSON data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m scraper.report --input data/fcf_data.json
  python -m scraper.report --input data/teams/fundacio-academia.json --output report.html
        """,
    )
    parser.add_argument("--input", "-i", default="data/fcf_data.json",
                        help="Input JSON file (default: data/fcf_data.json)")
    parser.add_argument("--output", "-o", default=None,
                        help="Output HTML file (default: report_{team}.html)")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"❌ Input file not found: {input_path}")
        sys.exit(1)

    data = json.loads(input_path.read_text(encoding="utf-8"))

    if args.output:
        output_path = Path(args.output)
    else:
        team_name = data.get("meta", {}).get("team") or \
                    data.get("team_intelligence", {}).get("team_name", "report")
        # Sanitize filename
        safe_name = "".join(c if c.isalnum() or c in " -_" else "_" for c in team_name)
        safe_name = safe_name.strip().replace(" ", "_")[:40]
        output_path = Path(f"reports/{safe_name}.html")

    generate_report(data, output_path)


if __name__ == "__main__":
    main()
