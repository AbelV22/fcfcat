"""Upload league projection JSON to Supabase league_projections table."""
import json
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent / ".env")

SEASON = "2526"
COMPETITION = "preferent-cadet-s15"
GROUP = "grup-2"

URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
assert URL and KEY, "Need SUPABASE_URL + SUPABASE_SERVICE_KEY in .env"
sb = create_client(URL, KEY)

proj = json.loads(Path(__file__).parent.joinpath("data/pc15_g2_projection_v4.json").read_text())

# Get slugs from fcf_standings
res = sb.table("fcf_standings").select("team_name,team_slug").eq("season", SEASON).eq("competition", COMPETITION).eq("group_name", GROUP).execute()
slug_by_name = {r["team_name"]: r["team_slug"] for r in res.data}

rows = []
for t in proj["teams"]:
    name = t["team"]
    slug = slug_by_name.get(name)
    if not slug:
        print(f"  ! No slug found for {name}")
        continue
    rows.append({
        "season": SEASON, "competition": COMPETITION, "group_name": GROUP,
        "team_slug": slug, "team_name": name,
        "current_pts": t["current_pts"], "current_gd": t["current_gd"],
        "proj_pts": round(t["proj_pts"], 2),
        "proj_gd":  round(t["proj_gd"], 2),
        "pct_champ": round(t["pct_champ"], 2),
        "pct_top3":  round(t["pct_top3"], 2),
        "pct_bottom3": round(t["pct_bottom4"], 2),  # columna DB pct_bottom3 → ara conté prob. bottom-4
        "avg_pos":  round(t["avg_pos"], 2),
        "pos_pct":  [round(x, 2) for x in t["pos_pct"]],
        "model_meta": proj["model"],
    })

print(f"Upserting {len(rows)} rows...")
sb.table("league_projections").upsert(rows, on_conflict="season,competition,group_name,team_slug").execute()
print("Done.")
