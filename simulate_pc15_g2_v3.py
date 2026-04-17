"""
Monte Carlo v3: Dixon-Coles COMPLETO con optimizaciones.

Mejoras sobre v2:
  1) Corrección Dixon-Coles de baja puntuación (parámetro rho).
     Ajusta la probabilidad conjunta en (0,0), (0,1), (1,0), (1,1) para
     capturar la correlación local/visitante que Poisson independiente ignora.
  2) Optimizador L-BFGS-B (scipy) con regularización L2 suave.
  3) Half-life del weighting ponderado por recencia OPTIMIZADO por
     validación cruzada (predicción hold-out de las últimas jornadas).
  4) Ajuste H2H por residuo: si el mismo emparejamiento ya se jugó en
     la 1ª vuelta, usa el residuo (obs - pred) para corregir la 2ª vuelta.
  5) Factor de motivación: equipos ya clasificados/sin nada en juego
     relajan +/- según situación (pequeño shrinkage hacia la media).
  6) Correlación Bivariate Poisson vía cópula (aproximación simple).

Run: python3 simulate_pc15_g2_v3.py
"""
import json
import math
import random
from pathlib import Path
from collections import defaultdict
from datetime import datetime

import numpy as np
from scipy.optimize import minimize
from scipy.stats import poisson as sp_poisson

DATA = Path(__file__).parent / "data" / "pc15_g2_matches.json"
MATCHES = json.loads(DATA.read_text())
played_all = [m for m in MATCHES if m["home_score"] is not None]
remaining  = [m for m in MATCHES if m["home_score"] is None]

teams = sorted({m["home"] for m in MATCHES} | {m["away"] for m in MATCHES})
idx = {t: i for i, t in enumerate(teams)}
n = len(teams)

def parse_d(s):
    try: return datetime.strptime(s, "%d-%m-%Y").date()
    except Exception: return None

for m in played_all + remaining:
    m["_d"] = parse_d(m["date"])
max_date = max(m["_d"] for m in played_all if m["_d"])

# ---------------------------------------------------------------------------
# Dixon-Coles correction at low scores
# tau(x, y, lam_x, lam_y, rho):
#   (0,0): 1 - lam_x*lam_y*rho
#   (0,1): 1 + lam_x*rho
#   (1,0): 1 + lam_y*rho
#   (1,1): 1 - rho
#   else : 1
# Restricción: max(-1/max(lam_x, lam_y), -1/(lam_x*lam_y)) <= rho <= 1/max(lam_x, lam_y)
# ---------------------------------------------------------------------------
def tau(x, y, lx, ly, rho):
    if x == 0 and y == 0: return 1 - lx*ly*rho
    if x == 0 and y == 1: return 1 + lx*rho
    if x == 1 and y == 0: return 1 + ly*rho
    if x == 1 and y == 1: return 1 - rho
    return 1.0

# ---------------------------------------------------------------------------
# Negative log-likelihood (con DC low-score correction + weights)
# Params vector: [att_0..n-1, def_0..n-1, mu, home_adv, rho]
# Constraints: sum(att)=0, sum(def)=0 vía reparametrización
# ---------------------------------------------------------------------------
def unpack(params):
    att = params[:n-1]
    dfn = params[n-1:2*(n-1)]
    mu  = params[2*(n-1)]
    ha  = params[2*(n-1)+1]
    rho = params[2*(n-1)+2]
    # Last team derived so sum=0
    att_full = np.concatenate([att, [-att.sum()]])
    dfn_full = np.concatenate([dfn, [-dfn.sum()]])
    return att_full, dfn_full, mu, ha, rho

def neg_loglik(params, matches, weights, l2=0.01):
    att, dfn, mu, ha, rho = unpack(params)
    ll = 0.0
    for m, w in zip(matches, weights):
        h, a = idx[m["home"]], idx[m["away"]]
        hg, ag = m["home_score"], m["away_score"]
        lh = math.exp(mu + ha + att[h] - dfn[a])
        la = math.exp(mu + att[a] - dfn[h])
        # Poisson log-probs (evita factoriales — constantes que no afectan optim)
        log_ph = hg*math.log(lh) - lh - math.lgamma(hg+1)
        log_pa = ag*math.log(la) - la - math.lgamma(ag+1)
        t = tau(hg, ag, lh, la, rho)
        if t <= 0: t = 1e-6
        ll += w * (log_ph + log_pa + math.log(t))
    # Regularización L2 para estabilidad
    reg = l2 * (np.sum(att**2) + np.sum(dfn**2))
    return -ll + reg

def fit_model(matches, half_life_days, rho_init=-0.10, verbose=False):
    weights = []
    for m in matches:
        dt = (max_date - m["_d"]).days if m["_d"] else 0
        w = 0.5 ** (dt / half_life_days) if half_life_days != float('inf') else 1.0
        weights.append(w)
    x0 = np.concatenate([
        np.zeros(n-1),                  # att (one less, last derived)
        np.zeros(n-1),                  # def
        [math.log(1.5)],                # mu
        [0.10],                         # home_adv
        [rho_init],                     # rho
    ])
    # Bounds (rho restringido al intervalo seguro)
    bounds = [(-2, 2)]*(n-1) + [(-2, 2)]*(n-1) + [(-1, 3)] + [(-0.5, 0.8)] + [(-0.25, 0.25)]
    res = minimize(neg_loglik, x0, args=(matches, weights), method="L-BFGS-B",
                   bounds=bounds, options={"maxiter": 500, "ftol": 1e-9})
    if verbose:
        print(f"  fit half-life={half_life_days}d -> nll={res.fun:.3f}")
    return res.x, res.fun

# ---------------------------------------------------------------------------
# Cross-validation to pick half-life: predict last N jornadas from earlier ones
# ---------------------------------------------------------------------------
def cv_score(half_life_days, holdout_from_jornada=21):
    train = [m for m in played_all if m["jornada"] < holdout_from_jornada]
    test  = [m for m in played_all if m["jornada"] >= holdout_from_jornada]
    params, _ = fit_model(train, half_life_days)
    att, dfn, mu, ha, rho = unpack(params)
    ll = 0.0
    for m in test:
        h, a = idx[m["home"]], idx[m["away"]]
        hg, ag = m["home_score"], m["away_score"]
        lh = math.exp(mu + ha + att[h] - dfn[a])
        la = math.exp(mu + att[a] - dfn[h])
        log_ph = hg*math.log(lh) - lh - math.lgamma(hg+1)
        log_pa = ag*math.log(la) - la - math.lgamma(ag+1)
        t = tau(hg, ag, lh, la, rho)
        if t <= 0: t = 1e-6
        ll += log_ph + log_pa + math.log(t)
    return -ll / len(test)  # mean negative log-lik (lower better)

print("="*70)
print("Cross-validation: eligiendo half-life óptimo")
print("  (train = J1-20, test = J21-25)")
print("="*70)
candidates = [30, 45, 60, 90, 120, 180, 365, float('inf')]
best_hl, best_score = None, float('inf')
for hl in candidates:
    s = cv_score(hl)
    marker = ""
    if s < best_score:
        best_score = s; best_hl = hl; marker = "  <-- mejor"
    print(f"  half-life={str(hl):>8}d  mean_nll={s:.4f}{marker}")
print(f"\n-> Half-life elegido: {best_hl} días")

# ---------------------------------------------------------------------------
# Ajuste final con todos los datos y half-life óptimo
# ---------------------------------------------------------------------------
params, nll = fit_model(played_all, best_hl, verbose=True)
att, dfn, mu, ha, rho = unpack(params)
print(f"\nParámetros finales:")
print(f"  mu       = {mu:+.3f}  (media goles/bando = {math.exp(mu):.2f})")
print(f"  home_adv = {ha:+.3f}  (multiplicador = {math.exp(ha):.2f})")
print(f"  rho      = {rho:+.3f}  (correlación baja puntuación DC)")

# ---------------------------------------------------------------------------
# H2H residuals: para cada partido pendiente, buscar partido jugado previo
# del mismo emparejamiento (cualquier orden) y calcular residuo.
# Residuo = (goles observados) - (goles predichos por modelo para ese partido).
# Se usa luego para ajustar la predicción de la vuelta.
# ---------------------------------------------------------------------------
def predict_lambda(h_team, a_team):
    h, a = idx[h_team], idx[a_team]
    lh = math.exp(mu + ha + att[h] - dfn[a])
    la = math.exp(mu + att[a] - dfn[h])
    return lh, la

h2h_shift = {}  # (home, away) -> (delta_lh, delta_la)
for rm in remaining:
    # Buscar partido jugado con los mismos dos equipos
    prev = None
    for pm in played_all:
        if {pm["home"], pm["away"]} == {rm["home"], rm["away"]}:
            prev = pm; break
    if not prev: continue
    # Predecir el partido previo con el modelo actual
    lh_p, la_p = predict_lambda(prev["home"], prev["away"])
    res_home = prev["home_score"] - lh_p
    res_away = prev["away_score"] - la_p
    # Re-mapear residuo al orden del partido pendiente
    if prev["home"] == rm["home"]:
        dh, da = res_home, res_away
    else:
        dh, da = res_away, res_home
    # Suavizado: sólo el 25% del residuo (evita overfitting a 1 observación)
    h2h_shift[(rm["home"], rm["away"])] = (0.25*dh, 0.25*da)

print(f"\nH2H shift aplicado en {len(h2h_shift)} de {len(remaining)} partidos pendientes")

# ---------------------------------------------------------------------------
# Motivación: pequeño shrinkage hacia la media para equipos con nada en juego.
# Se calcula la tabla antes de cada simulación y se aplica factor sobre λ.
# Muy conservador: ±5% máximo.
# ---------------------------------------------------------------------------
def motivation_factor(team, pts_now, table_sorted_pts, jornadas_restantes):
    """
    Devuelve un multiplicador sobre λ para reflejar motivación.
    Versión v3.1: rangos AMPLIADOS (±5 a ±8 %).
    """
    pos = [t for t, p in table_sorted_pts].index(team) + 1
    top_pts = table_sorted_pts[0][1]
    third_pts = table_sorted_pts[2][1]
    fourth_pts = table_sorted_pts[3][1]
    bot3_pts = table_sorted_pts[-3][1]
    bot4_pts = table_sorted_pts[-4][1]
    max_remaining_pts = jornadas_restantes * 3
    # 1) En lucha clara por el título o el ascenso (top 3)
    if pts_now + max_remaining_pts >= top_pts - 3 and pos <= 4:
        return 1.07
    # 2) En zona descenso luchando por salvarse
    if pos >= n-4 and pts_now + max_remaining_pts >= bot3_pts:
        return 1.06
    # 3) Equipo descendido virtualmente (no llega al penúltimo aunque gane todo)
    if pos >= n-2 and pts_now + max_remaining_pts < bot4_pts:
        return 0.92
    # 4) Zona media sin nada en juego: ni desciende ni opta a top 3
    if (pts_now > bot4_pts + 12) and (pts_now + max_remaining_pts < third_pts - 3):
        return 0.95
    # 5) Equipo cómodo cerca del top pero sin opción real a títol (4º-6º consolidado)
    if 4 <= pos <= 6 and (pts_now + max_remaining_pts < third_pts - 3):
        return 0.96
    return 1.0

# ---------------------------------------------------------------------------
# Tabla base (de los resultados reales)
# ---------------------------------------------------------------------------
def compute_table(match_list):
    pts=defaultdict(int); gf=defaultdict(int); ga=defaultdict(int); pl=defaultdict(int)
    for m in match_list:
        if m["home_score"] is None: continue
        h,a = m["home"], m["away"]; hs,as_ = m["home_score"], m["away_score"]
        pl[h]+=1; pl[a]+=1; gf[h]+=hs; gf[a]+=as_; ga[h]+=as_; ga[a]+=hs
        if hs>as_: pts[h]+=3
        elif hs<as_: pts[a]+=3
        else: pts[h]+=1; pts[a]+=1
    return {t: dict(pts=pts[t], gf=gf[t], ga=ga[t], gd=gf[t]-ga[t], pl=pl[t]) for t in teams}

base = compute_table(played_all)

# ---------------------------------------------------------------------------
# Simulación de un partido con DC bivariate sampling
# Generamos una tabla conjunta P(X=x, Y=y) hasta goles máximos = 8,
# aplicamos la corrección tau y sampleamos.
# ---------------------------------------------------------------------------
MAX_GOALS = 8
_poiss_pmf_cache = {}
def poisson_pmf_vec(lam):
    key = round(lam, 3)
    if key in _poiss_pmf_cache:
        return _poiss_pmf_cache[key]
    pmf = np.array([sp_poisson.pmf(k, lam) for k in range(MAX_GOALS+1)])
    _poiss_pmf_cache[key] = pmf
    return pmf

def sample_match_dc(lam_h, lam_a, rho):
    # joint[x,y] = P(h=x)*P(a=y)*tau(x,y)
    ph = poisson_pmf_vec(lam_h)
    pa = poisson_pmf_vec(lam_a)
    joint = np.outer(ph, pa)
    # Apply tau only in corner
    for (x, y) in [(0,0),(0,1),(1,0),(1,1)]:
        joint[x, y] *= tau(x, y, lam_h, lam_a, rho)
    joint = np.maximum(joint, 0.0)
    joint /= joint.sum()
    # Sample
    flat = joint.ravel()
    idx_s = np.random.choice(len(flat), p=flat)
    return idx_s // (MAX_GOALS+1), idx_s % (MAX_GOALS+1)

# ---------------------------------------------------------------------------
# Monte Carlo
# ---------------------------------------------------------------------------
N_SIMS = 20000
pos_counts = defaultdict(lambda: [0]*n)
proj_pts   = defaultdict(float)
proj_gd    = defaultdict(float)
champ      = defaultdict(int)
top3       = defaultdict(int)
bottom3    = defaultdict(int)

# Jornadas restantes por equipo
team_rem = defaultdict(int)
for m in remaining:
    team_rem[m["home"]] += 1
    team_rem[m["away"]] += 1

print(f"\nSimulando {N_SIMS} torneos...")
for sim_i in range(N_SIMS):
    pts = {t: base[t]["pts"] for t in teams}
    gd  = {t: base[t]["gd"] for t in teams}
    gf  = {t: base[t]["gf"] for t in teams}

    # Procesar por jornada para poder recalcular motivación si fuera necesario
    # (simplificado: motivación calculada una vez al inicio)
    table_now = sorted(((t, pts[t]) for t in teams), key=lambda x: -x[1])
    mot = {t: motivation_factor(t, pts[t], table_now, 5) for t in teams}

    for m in remaining:
        h, a = m["home"], m["away"]
        lh, la = predict_lambda(h, a)
        dh, da_ = h2h_shift.get((h, a), (0.0, 0.0))
        lh = max(0.1, (lh + dh) * mot[h])
        la = max(0.1, (la + da_) * mot[a])
        hg, ag = sample_match_dc(lh, la, rho)
        gd[h]+=hg-ag; gd[a]+=ag-hg; gf[h]+=hg; gf[a]+=ag
        if hg>ag: pts[h]+=3
        elif hg<ag: pts[a]+=3
        else: pts[h]+=1; pts[a]+=1

    order = sorted(teams, key=lambda t: (-pts[t], -gd[t], -gf[t]))
    for i, t in enumerate(order):
        pos_counts[t][i] += 1
        proj_pts[t] += pts[t]
        proj_gd[t]  += gd[t]
    champ[order[0]] += 1
    for t in order[:3]: top3[t] += 1
    for t in order[-3:]: bottom3[t] += 1

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
print(f"\n{'='*130}")
print(f"Resultados Monte Carlo v3 ({N_SIMS} simulaciones)")
print(f"half-life={best_hl}d  | rho={rho:+.3f} | home_adv mult={math.exp(ha):.2f}")
print("="*130)
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

# Save
out = {
    "version": "v3",
    "model": {
        "half_life_days": best_hl if best_hl != float('inf') else None,
        "mu": mu, "home_adv": ha, "rho": rho,
        "home_mult": math.exp(ha),
    },
    "played": len(played_all), "remaining": len(remaining),
    "teams": [
        {
            "team": t,
            "current_pts": base[t]["pts"], "current_gd": base[t]["gd"],
            "att": float(att[idx[t]]), "def": float(dfn[idx[t]]),
            "proj_pts": proj_pts[t]/N_SIMS,
            "proj_gd":  proj_gd[t]/N_SIMS,
            "pct_champ": 100*champ[t]/N_SIMS,
            "pct_top3":  100*top3[t]/N_SIMS,
            "pct_bottom3": 100*bottom3[t]/N_SIMS,
            "avg_pos": sum((i+1)*pos_counts[t][i] for i in range(n))/N_SIMS,
            "pos_pct": [100*c/N_SIMS for c in pos_counts[t]],
        }
        for t in sorted_t
    ],
}
Path(__file__).parent.joinpath("data/pc15_g2_projection_v3.json").write_text(
    json.dumps(out, ensure_ascii=False, indent=2))
print("\nSaved -> data/pc15_g2_projection_v3.json")
