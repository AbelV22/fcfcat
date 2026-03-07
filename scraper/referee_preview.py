"""Quick referee stats preview from the global database."""
import json
from collections import defaultdict
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
d = json.load(open(DATA_DIR / "global_referees.json", "r", encoding="utf-8"))
sc = {k: v for k, v in d.items() if v.get("competition") == "segona-catalana"}
print(f"=== SEGONA CATALANA: {len(sc)} matches (J1-J20, 6 grupos) ===\n")

ref_stats = defaultdict(lambda: {
    "matches": 0, "yellows": 0, "reds": 0,
    "home_wins": 0, "away_wins": 0, "draws": 0,
})

for v in sc.values():
    for r in v.get("referees", []):
        r = r.strip()
        if not r:
            continue
        s = ref_stats[r]
        s["matches"] += 1
        s["yellows"] += len(v.get("yellow_cards", []))
        s["reds"] += len(v.get("red_cards", []))
        hs = v.get("home_score", 0)
        aws = v.get("away_score", 0)
        if hs > aws:
            s["home_wins"] += 1
        elif hs < aws:
            s["away_wins"] += 1
        else:
            s["draws"] += 1

top = sorted(ref_stats.items(), key=lambda x: -x[1]["matches"])

print(f"Total arbitros unicos: {len(ref_stats)}\n")
header = f"{'ARBITRO':<35} {'PJ':>3} {'TA':>4} {'TR':>3} {'TA/p':>5} {'TR/p':>5} {'Loc%':>5} {'Vis%':>5} {'Emp%':>5}"
print(header)
print("-" * len(header))

for name, s in top[:25]:
    m = s["matches"]
    ypm = round(s["yellows"] / m, 1)
    rpm = round(s["reds"] / m, 2)
    hw = round(s["home_wins"] / m * 100)
    aw = round(s["away_wins"] / m * 100)
    dr = round(s["draws"] / m * 100)
    print(f"{name:<35} {m:>3} {s['yellows']:>4} {s['reds']:>3} {ypm:>5} {rpm:>5} {hw:>4}% {aw:>4}% {dr:>4}%")

print(f"\n{'='*70}")
print("Errores de validacion:")
try:
    log = open(DATA_DIR / "acta_errors.log", "r", encoding="utf-8").read()
    lines = [l for l in log.split("\n") if "[ERROR]" in l]
    print(f"  Total errores registrados: {len(lines)}")
    for l in lines[:10]:
        print(f"  {l.strip()}")
    if len(lines) > 10:
        print(f"  ... y {len(lines)-10} mas")
except:
    print("  No error log found")
