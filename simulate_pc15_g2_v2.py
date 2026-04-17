"""
Monte Carlo v2: Dixon-Coles-style Poisson calibrated on real match results
scraped from FCF. Inputs: data/pc15_g2_matches.json.
Fits per-team attack/defense + home advantage by maximum likelihood
(simple gradient descent on log-likelihood of Poisson).
Applies recency weighting (half-life = 8 matches).
"""
import json
import math
import random
from pathlib import Path
from collections import defaultdict
from datetime import datetime

DATA = Path(__file__).parent / "data" / "pc15_g2_matches.json"
MATCHES = json.loads(DATA.read_text())

played = [m for m in MATCHES if m["home_score"] is not None]
remaining = [m for m in MATCHES if m["home_score"] is None]

teams = sorted({m["home"] for m in MATCHES} | {m["away"] for m in MATCHES})
idx = {t: i for i, t in enumerate(teams)}
n = len(teams)
print(f"Teams: {n}, played: {len(played)}, remaining: {len(remaining)}")

# Recency weight: matches closer to today count more.
def parse_d(s):
    try: return datetime.strptime(s, "%d-%m-%Y").date()
    except Exception: return None

dates = [parse_d(m["date"]) for m in played]
max_date = max(d for d in dates if d)
HALF_LIFE_DAYS = 60.0  # ~2 months half life
weights = []
for m in played:
    d = parse_d(m["date"])
    dt = (max_date - d).days if d else 0
    w = 0.5 ** (dt / HALF_LIFE_DAYS)
    weights.append(w)

# Parameters: att[i], def[i] (log-scale), home_adv (log), baseline mu
# lambda_home = exp(mu + home_adv + att[h] - def[a])
# lambda_away = exp(mu + att[a] - def[h])
# Constraints: sum(att)=0, sum(def)=0 for identifiability.

import numpy as np

att = np.zeros(n)
dfn = np.zeros(n)
home_adv = 0.25
mu = math.log(1.5)  # ~1.5 goals per side

LR = 0.05
N_ITERS = 400

def loglik_and_grads(att, dfn, mu, home_adv):
    g_att = np.zeros(n); g_def = np.zeros(n)
    g_mu = 0.0; g_ha = 0.0
    ll = 0.0
    for m, w in zip(played, weights):
        h = idx[m["home"]]; a = idx[m["away"]]
        hg = m["home_score"]; ag = m["away_score"]
        lam_h = math.exp(mu + home_adv + att[h] - dfn[a])
        lam_a = math.exp(mu + att[a] - dfn[h])
        # Poisson log-lik: k*log(lam) - lam (ignoring constant)
        ll += w * (hg*math.log(lam_h) - lam_h + ag*math.log(lam_a) - lam_a)
        # Gradients
        d_lh = w * (hg - lam_h)  # d/d(log lam_h)
        d_la = w * (ag - lam_a)
        g_att[h] += d_lh
        g_def[a] += -d_lh
        g_att[a] += d_la
        g_def[h] += -d_la
        g_mu += d_lh + d_la
        g_ha += d_lh
    return ll, g_att, g_def, g_mu, g_ha

for it in range(N_ITERS):
    ll, gA, gD, gM, gH = loglik_and_grads(att, dfn, mu, home_adv)
    att += LR * gA / max(1, len(played))
    dfn += LR * gD / max(1, len(played))
    mu  += LR * gM / max(1, len(played))
    home_adv += LR * gH / max(1, len(played))
    # Re-center
    att -= att.mean()
    dfn -= dfn.mean()

print(f"Final mu={mu:.3f} (exp={math.exp(mu):.2f}), home_adv={home_adv:.3f} (mult={math.exp(home_adv):.2f})")
print("\nStrengths (att / def, higher att = better attack, higher def = better defence):")
for t in sorted(teams, key=lambda t: -(att[idx[t]] + dfn[idx[t]])):
    print(f"  {t:<45} att={att[idx[t]]:+.3f}  def={dfn[idx[t]]:+.3f}")

# Current standings from real matches (since scrape is authoritative)
def compute_table(match_list):
    pts=defaultdict(int); gf=defaultdict(int); ga=defaultdict(int); pl=defaultdict(int)
    w_=defaultdict(int); d_=defaultdict(int); l_=defaultdict(int)
    for m in match_list:
        if m["home_score"] is None: continue
        h,a = m["home"], m["away"]; hs,ass_ = m["home_score"], m["away_score"]
        pl[h]+=1; pl[a]+=1; gf[h]+=hs; gf[a]+=ass_; ga[h]+=ass_; ga[a]+=hs
        if hs>ass_: pts[h]+=3; w_[h]+=1; l_[a]+=1
        elif hs<ass_: pts[a]+=3; w_[a]+=1; l_[h]+=1
        else: pts[h]+=1; pts[a]+=1; d_[h]+=1; d_[a]+=1
    return {t: dict(pts=pts[t], gf=gf[t], ga=ga[t], gd=gf[t]-ga[t], pl=pl[t],
                    w=w_[t], d=d_[t], l=l_[t]) for t in teams}

base = compute_table(played)
print("\nCurrent standings (computed from scraped results):")
for t in sorted(teams, key=lambda t: (-base[t]["pts"], -base[t]["gd"], -base[t]["gf"])):
    b = base[t]
    print(f"  {b['pts']:>3}  {b['pl']:>2}PJ {b['w']}G {b['d']}E {b['l']}P  GF{b['gf']} GA{b['ga']} GD{b['gd']:+d}  {t}")

# Simulate remaining matches
def poisson(lam):
    L = math.exp(-lam); k=0; p=1.0
    while True:
        k+=1; p*=random.random()
        if p<=L: return k-1

N_SIMS = 20000
pos_counts = defaultdict(lambda: [0]*n)
proj_pts = defaultdict(float); proj_gd = defaultdict(float)
champ = defaultdict(int); top3 = defaultdict(int); bottom3 = defaultdict(int)

for _ in range(N_SIMS):
    pts = {t: base[t]["pts"] for t in teams}
    gd  = {t: base[t]["gd"] for t in teams}
    gf  = {t: base[t]["gf"] for t in teams}
    for m in remaining:
        h, a = m["home"], m["away"]
        lam_h = math.exp(mu + home_adv + att[idx[h]] - dfn[idx[a]])
        lam_a = math.exp(mu + att[idx[a]] - dfn[idx[h]])
        hg, ag = poisson(lam_h), poisson(lam_a)
        gd[h]+=hg-ag; gd[a]+=ag-hg; gf[h]+=hg; gf[a]+=ag
        if hg>ag: pts[h]+=3
        elif hg<ag: pts[a]+=3
        else: pts[h]+=1; pts[a]+=1
    order = sorted(teams, key=lambda t: (-pts[t], -gd[t], -gf[t]))
    for i,t in enumerate(order):
        pos_counts[t][i]+=1
        proj_pts[t]+=pts[t]; proj_gd[t]+=gd[t]
    champ[order[0]]+=1
    for t in order[:3]: top3[t]+=1
    for t in order[-3:]: bottom3[t]+=1

print(f"\n===== Monte Carlo ({N_SIMS} sims) =====")
sorted_t = sorted(teams, key=lambda t: -proj_pts[t]/N_SIMS)
print(f"{'Equipo':<45} | Pts | PtsProj | GDProj | %Camp  | %Top3  | %Desc  | PosMed")
print("-"*130)
for t in sorted_t:
    pp = proj_pts[t]/N_SIMS
    pg = proj_gd[t]/N_SIMS
    pc = 100*champ[t]/N_SIMS
    p3 = 100*top3[t]/N_SIMS
    pd = 100*bottom3[t]/N_SIMS
    avg = sum((i+1)*pos_counts[t][i] for i in range(n))/N_SIMS
    print(f"{t:<45} | {base[t]['pts']:>3} | {pp:>7.1f} | {pg:>+6.1f} | {pc:>5.1f}% | {p3:>5.1f}% | {pd:>5.1f}% | {avg:>5.2f}")

# Save full distribution
out = {
    "model": {"mu": mu, "home_adv": home_adv, "half_life_days": HALF_LIFE_DAYS},
    "played": len(played), "remaining": len(remaining),
    "teams": [
        {
            "team": t,
            "current_pts": base[t]["pts"], "current_gd": base[t]["gd"],
            "att": att[idx[t]], "def": dfn[idx[t]],
            "proj_pts": proj_pts[t]/N_SIMS,
            "proj_gd": proj_gd[t]/N_SIMS,
            "pct_champ": 100*champ[t]/N_SIMS,
            "pct_top3":  100*top3[t]/N_SIMS,
            "pct_bottom3": 100*bottom3[t]/N_SIMS,
            "avg_pos": sum((i+1)*pos_counts[t][i] for i in range(n))/N_SIMS,
            "pos_pct": [100*c/N_SIMS for c in pos_counts[t]],
        }
        for t in sorted_t
    ],
}
Path(__file__).parent.joinpath("data/pc15_g2_projection.json").write_text(json.dumps(out, ensure_ascii=False, indent=2))
print("\nSaved projection JSON -> data/pc15_g2_projection.json")
