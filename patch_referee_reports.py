"""
Patch script: Rebuild referee_reports in fcf_data.json using updated global_referees.json,
and compute population percentile stats for all referees.
"""
import json
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent
DATA_DIR = ROOT / "data"

sys.path.insert(0, str(ROOT))
from scraper.intelligence import build_referee_intelligence

def percentile_rank(value: float, population: list[float]) -> float:
    """Return the percentile rank (0-100) of value in population."""
    if not population:
        return 50.0
    below = sum(1 for v in population if v < value)
    return round(below / len(population) * 100, 1)

def compute_population_stats(global_refs: list[dict], min_matches: int = 3) -> dict:
    """
    Compute population distributions for key referee metrics.
    Only includes referees with at least min_matches matches.
    Returns per-metric sorted lists for percentile calculation.
    """
    from collections import defaultdict

    # Group matches by MAIN referee only (referees[0]) — assistants don't give cards
    ref_matches: dict[str, list[dict]] = defaultdict(list)
    for acta in global_refs:
        refs = acta.get("referees", [])
        if refs:
            main_ref = refs[0].strip()
            if main_ref:
                ref_matches[main_ref].append(acta)

    metrics = {
        "yellows_per_match": [],
        "away_player_card_pct": [],
        "second_half_card_pct": [],
        "expulsion_pct": [],
        "home_win_pct": [],
        "staff_cards_per_match": [],
        "staff_card_match_pct": [],
    }

    for ref_name, matches in ref_matches.items():
        n = len(matches)
        if n < min_matches:
            continue

        total_yellows = 0
        total_reds = 0
        total_staff_yellows = 0
        total_staff_reds = 0
        home_yc = away_yc = home_rc = away_rc = 0
        first_half = second_half = 0
        matches_with_expulsion = 0
        matches_with_staff = 0
        home_wins = 0

        for acta in matches:
            yc = acta.get("yellow_cards", [])
            rc = acta.get("red_cards", [])

            def is_staff(c):
                return c.get("recipient_type", "player") == "technical_staff"
            def is_dy(c):
                return c.get("is_double_yellow_dismissal", False)

            match_yc_h = sum(1 for c in yc if c.get("team")=="home" and not is_staff(c))
            match_yc_a = sum(1 for c in yc if c.get("team")=="away" and not is_staff(c))
            match_rc_h = sum(1 for c in rc if c.get("team")=="home" and not is_staff(c))
            match_rc_a = sum(1 for c in rc if c.get("team")=="away" and not is_staff(c))
            match_dy = sum(1 for c in yc if is_dy(c) and not is_staff(c))
            match_sy = sum(1 for c in yc if is_staff(c))
            match_sr = sum(1 for c in rc if is_staff(c))

            total_yellows += match_yc_h + match_yc_a
            total_reds += match_rc_h + match_rc_a
            total_staff_yellows += match_sy
            total_staff_reds += match_sr
            home_yc += match_yc_h
            away_yc += match_yc_a
            home_rc += match_rc_h
            away_rc += match_rc_a

            if match_rc_h + match_rc_a + match_dy > 0:
                matches_with_expulsion += 1
            if match_sy + match_sr > 0:
                matches_with_staff += 1

            all_cards = yc + rc
            for card in all_cards:
                try:
                    m = int(str(card.get("minute", "0")).replace("+", "").strip() or 0)
                except:
                    m = 0
                if m <= 45:
                    first_half += 1
                else:
                    second_half += 1

            hs = acta.get("home_score", 0)
            as_ = acta.get("away_score", 0)
            if hs > as_:
                home_wins += 1

        total_all = total_yellows + total_reds + total_staff_yellows + total_staff_reds
        home_p = home_yc + home_rc
        away_p = away_yc + away_rc

        metrics["yellows_per_match"].append(round(total_yellows / n, 2))
        metrics["away_player_card_pct"].append(round(away_p / max(home_p + away_p, 1) * 100, 1))
        metrics["second_half_card_pct"].append(round(second_half / max(total_all, 1) * 100, 1))
        metrics["expulsion_pct"].append(round(matches_with_expulsion / n * 100, 1))
        metrics["home_win_pct"].append(round(home_wins / n * 100, 1))
        metrics["staff_cards_per_match"].append(round((total_staff_yellows + total_staff_reds) / n, 2))
        metrics["staff_card_match_pct"].append(round(matches_with_staff / n * 100, 1))

    result = {}
    for key, vals in metrics.items():
        vals_sorted = sorted(vals)
        result[key] = {
            "sorted_values": vals_sorted,
            "count": len(vals_sorted),
            "mean": round(sum(vals_sorted) / len(vals_sorted), 2) if vals_sorted else 0,
            "p25": vals_sorted[int(len(vals_sorted) * 0.25)] if vals_sorted else 0,
            "p50": vals_sorted[int(len(vals_sorted) * 0.50)] if vals_sorted else 0,
            "p75": vals_sorted[int(len(vals_sorted) * 0.75)] if vals_sorted else 0,
        }
    return result


def main():
    # Load global refs
    global_ref_path = DATA_DIR / "global_referees.json"
    print(f"Loading global_referees.json...")
    with open(global_ref_path, "r", encoding="utf-8") as f:
        global_refs_dict = json.load(f)
    global_refs = list(global_refs_dict.values())
    print(f"  {len(global_refs)} matches in DB")

    # Load existing fcf_data.json
    fcf_data_path = DATA_DIR / "fcf_data.json"
    print(f"Loading fcf_data.json...")
    with open(fcf_data_path, "r", encoding="utf-8") as f:
        fcf_data = json.load(f)

    meta = fcf_data.get("meta", {})
    competition = meta.get("competition", "segona-catalana")
    our_team = meta.get("team", "")
    print(f"  Team: {our_team} | Competition: {competition}")

    # Collect all referee names we need to report on
    all_referee_names: set[str] = set()

    # From existing referee_reports
    for name in fcf_data.get("referee_reports", {}).keys():
        all_referee_names.add(name)

    # From next match
    next_match = fcf_data.get("next_match", {})
    for ref in next_match.get("referees", []):
        if ref.strip():
            all_referee_names.add(ref.strip())

    print(f"  Rebuilding reports for {len(all_referee_names)} referees...")

    # Rebuild referee reports
    referee_reports = {}
    for ref_name in sorted(all_referee_names):
        report = build_referee_intelligence(
            referee_name=ref_name,
            global_refs=global_refs,
            competition=competition,
            our_team=our_team,
        )
        referee_reports[ref_name] = report

    fcf_data["referee_reports"] = referee_reports
    print(f"  ✓ Built {len(referee_reports)} referee reports")

    # Compute population stats
    print("Computing population percentile stats...")
    pop_stats = compute_population_stats(global_refs, min_matches=3)
    for key, stat in pop_stats.items():
        print(f"  {key}: {stat['count']} referees | mean={stat['mean']} | p50={stat['p50']}")
    fcf_data["referee_population_stats"] = pop_stats
    print(f"  ✓ Population stats computed")

    # Save
    from scraper.models import DataEncoder
    with open(fcf_data_path, "w", encoding="utf-8") as f:
        json.dump(fcf_data, f, cls=DataEncoder, ensure_ascii=False, indent=2)
    print(f"\n✅ Saved updated fcf_data.json")


if __name__ == "__main__":
    main()
