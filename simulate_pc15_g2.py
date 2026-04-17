"""
Monte Carlo: Preferent Cadet S15 Grup 2, season 2526.
Input: current standings (as of 2026-03-14 snapshot) from Supabase project nxgyduqprxbhtpqsepgj.
Model: Dixon-Coles style Poisson with home/away attack & defense strengths
computed from per-team home/away goals per game, normalized to league averages.
Remaining fixtures: Jornadas 26-30 (all 8 per J) + pending J25 Llefia vs Anguera.
"""

import random
import math
from collections import defaultdict

# Current standings (position, team, played, won, drawn, lost, GF, GA, pts,
#                   home_w, home_d, home_l, away_w, away_d, away_l)
STANDINGS = [
    (1,  "L'HOSPITALET A",               25, 23, 0, 2,  89, 18, 69, 13, 0, 0, 10, 0, 2),
    (2,  "SANT ANDREU A",                 25, 20, 1, 4,  76, 21, 61, 11, 0, 1,  9, 1, 3),
    (3,  "SANT JUST A",                   25, 20, 1, 4,  66, 20, 61, 10, 1, 1, 10, 0, 3),
    (4,  "PREMIER BCN A",                 25, 15, 1, 9,  58, 40, 46,  8, 0, 4,  7, 1, 5),
    (5,  "CAN BUXERES A",                 25, 13, 5, 7,  50, 31, 44,  9, 1, 2,  4, 4, 5),
    (6,  "P. BARC. ANGUERA A",            24, 13, 2, 9,  52, 31, 41,  8, 1, 4,  5, 1, 5),
    (7,  "EUROPA A",                      25, 12, 5, 8,  64, 45, 41,  7, 3, 3,  5, 2, 5),
    (8,  "SANTS A",                       25, 10, 3, 12, 36, 39, 33,  7, 1, 4,  3, 2, 8),
    (9,  "BUFALA A",                      25,  9, 5, 11, 50, 51, 32,  7, 2, 3,  2, 3, 8),
    (10, "GRAMA A",                       25,  9, 4, 12, 46, 52, 31,  3, 2, 8,  6, 2, 4),
    (11, "SARRIA A",                      25,  8, 3, 14, 40, 60, 27,  6, 1, 6,  2, 2, 8),
    (12, "BADALONA B",                    25,  6, 4, 15, 31, 58, 22,  2, 3, 7,  4, 1, 8),
    (13, "MARTINENC A",                   25,  5, 6, 14, 34, 58, 21,  4, 3, 5,  1, 3, 9),
    (14, "SANT GABRIEL B",                25,  5, 3, 17, 33, 84, 18,  3, 3, 7,  2, 0, 10),
    (15, "UNIF. LLEFIA A",                24,  3, 5, 16, 21, 63, 14,  2, 2, 8,  1, 3, 8),
    (16, "SANTFELIUENC A",                25,  2, 4, 19, 17, 92, 10,  1, 3, 9,  1, 1, 10),
]

# Remaining fixtures (home, away) from the full fixture list
# J25 pending + J26 + J27 + J28 + J29 + J30
REMAINING = [
    # J25 pending (postponed)
    ("UNIF. LLEFIA A",        "P. BARC. ANGUERA A"),
    # J26 (19-04-2026)
    ("SANT JUST A",           "SANT GABRIEL B"),
    ("CAN BUXERES A",         "EUROPA A"),
    ("BUFALA A",              "L'HOSPITALET A"),
    ("SARRIA A",              "P. BARC. ANGUERA A"),
    ("PREMIER BCN A",         "GRAMA A"),
    ("BADALONA B",            "SANTFELIUENC A"),
    ("MARTINENC A",           "SANTS A"),
    ("SANT ANDREU A",         "UNIF. LLEFIA A"),
    # J27 (26-04-2026)
    ("SANT GABRIEL B",        "BUFALA A"),
    ("L'HOSPITALET A",        "PREMIER BCN A"),
    ("UNIF. LLEFIA A",        "SARRIA A"),
    ("P. BARC. ANGUERA A",    "SANT JUST A"),
    ("GRAMA A",               "CAN BUXERES A"),
    ("EUROPA A",              "BADALONA B"),
    ("SANTFELIUENC A",        "MARTINENC A"),
    ("SANTS A",               "SANT ANDREU A"),
    # J28 (03-05-2026)
    ("SANT JUST A",           "SARRIA A"),
    ("SANT ANDREU A",         "SANTFELIUENC A"),
    ("MARTINENC A",           "EUROPA A"),
    ("BUFALA A",              "P. BARC. ANGUERA A"),
    ("PREMIER BCN A",         "SANT GABRIEL B"),
    ("SANTS A",               "UNIF. LLEFIA A"),
    ("BADALONA B",            "GRAMA A"),
    ("CAN BUXERES A",         "L'HOSPITALET A"),
    # J29 (10-05-2026)
    ("SANT JUST A",           "UNIF. LLEFIA A"),
    ("L'HOSPITALET A",        "BADALONA B"),
    ("GRAMA A",               "MARTINENC A"),
    ("SANT GABRIEL B",        "CAN BUXERES A"),
    ("EUROPA A",              "SANT ANDREU A"),
    ("SANTFELIUENC A",        "SANTS A"),
    ("P. BARC. ANGUERA A",    "PREMIER BCN A"),
    ("SARRIA A",              "BUFALA A"),
    # J30 (17-05-2026)
    ("PREMIER BCN A",         "SARRIA A"),
    ("BADALONA B",            "SANT GABRIEL B"),
    ("MARTINENC A",           "L'HOSPITALET A"),
    ("SANT ANDREU A",         "GRAMA A"),
    ("SANTS A",               "EUROPA A"),
    ("UNIF. LLEFIA A",        "SANTFELIUENC A"),
    ("BUFALA A",              "SANT JUST A"),
    ("CAN BUXERES A",         "P. BARC. ANGUERA A"),
]

# -------- Build team-strength model --------
# For each team: home_gf, home_ga over home matches played; same for away.
TEAM = {}
total_home_gf = 0.0
total_home_ga = 0.0
total_home_games = 0
total_away_gf = 0.0
total_away_ga = 0.0
total_away_games = 0

# We need per-team home GF/GA; but standings give GF/GA only as totals.
# Derive approximations by splitting: assume goals split proportional to
# home vs away wins+draws+losses (i.e., by matches played home vs away).
# Actually we only have aggregate GF, GA. So use overall per-game scoring
# and blend with home/away results. We'll use overall attack/defense strength,
# then apply a league-wide home advantage factor.

for row in STANDINGS:
    pos, name, pl, w, d, l, gf, ga, pts, hw, hd, hl, aw, ad, al = row
    home_games = hw + hd + hl
    away_games = aw + ad + al
    TEAM[name] = {
        "played": pl, "pts": pts, "gf": gf, "ga": ga,
        "home_games": home_games, "away_games": away_games,
        "home_pts": 3*hw + hd, "away_pts": 3*aw + ad,
    }

# Overall per-game rates
total_games_team = sum(t["played"] for t in TEAM.values())  # == 2 * matches played
total_gf = sum(t["gf"] for t in TEAM.values())
# In league, total GF == total GA. Avg goals per match:
league_total_matches = total_games_team / 2
league_avg_goals = total_gf / league_total_matches  # e.g. 3.2
# Goals per side per match
league_avg_per_side = league_avg_goals / 2

# Home advantage: ratio of home points-per-game to away points-per-game
total_home_pts = sum(t["home_pts"] for t in TEAM.values())
total_away_pts = sum(t["away_pts"] for t in TEAM.values())
total_home_g = sum(t["home_games"] for t in TEAM.values())
total_away_g = sum(t["away_games"] for t in TEAM.values())
home_ppg = total_home_pts / total_home_g
away_ppg = total_away_pts / total_away_g
# Derive home/away goal multipliers (simplified): distribute league goals
# slightly more to home side. From typical football ~1.15x home / 0.85x away
# but estimate from data: we approximate by home_ppg/away_ppg ratio mapped
# to goal share.
# Use fixed 55/45 split given no per-home goals data:
HOME_GOAL_MULT = 1.10
AWAY_GOAL_MULT = 0.90

# Team attack/defense (relative to league avg per side)
for name, t in TEAM.items():
    gf_pg = t["gf"] / t["played"]   # goals scored per match
    ga_pg = t["ga"] / t["played"]   # goals conceded per match
    t["attack"]  = gf_pg / league_avg_per_side
    t["defense"] = ga_pg / league_avg_per_side  # >1 means leaks goals
    t["base_pts"] = t["pts"]
    t["gd"]       = t["gf"] - t["ga"]

def simulate_match(home, away):
    """Return (home_goals, away_goals) via independent Poisson draws."""
    lam_h = league_avg_per_side * TEAM[home]["attack"] * TEAM[away]["defense"] * HOME_GOAL_MULT
    lam_a = league_avg_per_side * TEAM[away]["attack"] * TEAM[home]["defense"] * AWAY_GOAL_MULT
    # clamp
    lam_h = max(0.1, min(6.0, lam_h))
    lam_a = max(0.1, min(6.0, lam_a))
    return (poisson(lam_h), poisson(lam_a))

def poisson(lam):
    # Knuth
    L = math.exp(-lam)
    k = 0
    p = 1.0
    while True:
        k += 1
        p *= random.random()
        if p <= L:
            return k - 1

N_SIMS = 20000
pos_counts = defaultdict(lambda: [0]*16)     # team -> [count at pos 1..16]
final_pts_sum = defaultdict(float)
final_gd_sum = defaultdict(float)
champ = defaultdict(int)
top3 = defaultdict(int)
bottom3 = defaultdict(int)

for _ in range(N_SIMS):
    pts = {n: TEAM[n]["base_pts"] for n in TEAM}
    gd  = {n: TEAM[n]["gd"] for n in TEAM}
    gf  = {n: TEAM[n]["gf"] for n in TEAM}
    for (h, a) in REMAINING:
        hg, ag = simulate_match(h, a)
        gd[h] += hg - ag; gd[a] += ag - hg
        gf[h] += hg; gf[a] += ag
        if hg > ag:
            pts[h] += 3
        elif hg < ag:
            pts[a] += 3
        else:
            pts[h] += 1; pts[a] += 1
    # rank by pts desc, gd desc, gf desc
    ordered = sorted(TEAM.keys(), key=lambda n: (-pts[n], -gd[n], -gf[n]))
    for i, n in enumerate(ordered):
        pos_counts[n][i] += 1
        final_pts_sum[n] += pts[n]
        final_gd_sum[n] += gd[n]
    champ[ordered[0]] += 1
    for n in ordered[:3]:
        top3[n] += 1
    for n in ordered[-3:]:
        bottom3[n] += 1

# Report
teams_sorted = sorted(TEAM.keys(), key=lambda n: -final_pts_sum[n]/N_SIMS)

print(f"Simulaciones: {N_SIMS}")
print(f"Media goles/partido liga (histórico): {league_avg_goals:.2f}")
print()
hdr = ["Eq.", "PtsAct", "PJ", "PtsProj", "GDProj", "%Camp", "%Top3", "%Desc(3últ)", "PosMedia"]
print(" | ".join(f"{h:<14}" if h=='Eq.' else f"{h:>8}" for h in hdr))
print("-"*110)
for n in teams_sorted:
    counts = pos_counts[n]
    avg_pos = sum((i+1)*counts[i] for i in range(16)) / N_SIMS
    proj_pts = final_pts_sum[n] / N_SIMS
    proj_gd  = final_gd_sum[n] / N_SIMS
    cur_pts = TEAM[n]["base_pts"]
    pj = TEAM[n]["played"]
    pc = 100*champ[n]/N_SIMS
    p3 = 100*top3[n]/N_SIMS
    pd = 100*bottom3[n]/N_SIMS
    print(f"{n:<14} | {cur_pts:>8} | {pj:>8} | {proj_pts:>8.1f} | {proj_gd:>+8.1f} | {pc:>7.1f}% | {p3:>7.1f}% | {pd:>10.1f}% | {avg_pos:>8.2f}")

print()
print("Distribución de posición final (%):")
print(f"{'Equipo':<16} " + " ".join(f"P{i+1:>2}" for i in range(16)))
for n in teams_sorted:
    counts = pos_counts[n]
    pcts = [100*c/N_SIMS for c in counts]
    print(f"{n:<16} " + " ".join(f"{p:>4.1f}" if p>=0.1 else "   .  " for p in pcts))
