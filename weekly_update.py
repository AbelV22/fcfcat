#!/usr/bin/env python3
"""
weekly_update.py
================
Script d'actualització setmanal per a FutLab.

Fase 1 — Grups endarrerits (sense tocar si ja estan al dia):
  Detecta quins grups de competició estan per darrere del màxim de jornades.
  Per a cada grup endarrerit executa scrape_all_groups.py per actualitzar totes
  les actes del grup (inclou tots els equips del grup, no només un representant).

Fase 2 — Equips individuals (JSON propis):
  Per a cada fitxer a data/teams/ que tingui un next_match ja passat o null,
  executa l'actualitzador incremental (--update) per re-calcular:
    • Standings, sancions, golejadors del dia
    • next_match actualitzat (jornada i arbitre)
    • rival_intelligence per al nou rival
    • Actes noves (només les que no estan a la BD)

Usage:
    python weekly_update.py              # actualitza tot el que cal
    python weekly_update.py --all        # força actualització de tot
    python weekly_update.py --dry-run    # mostra el que faria sense executar
    python weekly_update.py --skip-groups  # salta la fase 1
    python weekly_update.py --skip-teams   # salta la fase 2
"""

import argparse
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT     = Path(__file__).parent
DATA_DIR = ROOT / "data"
TEAMS_DIR = DATA_DIR / "teams"
SEASON   = "2526"

# ─── Helpers ──────────────────────────────────────────────────────────────────

def today() -> date:
    return date.today()

def is_past(date_str: str | None) -> bool:
    """Returns True if the match date (DD-MM-YYYY) is in the past or missing."""
    if not date_str:
        return True
    try:
        d, m, y = map(int, date_str.split("-"))
        return date(y, m, d) < today()
    except Exception:
        return True

def load_team_files() -> list[dict]:
    """Load metadata from all team JSON files in data/teams/."""
    teams = []
    for f in sorted(TEAMS_DIR.glob("*.json")):
        try:
            raw = json.loads(f.read_text(encoding="utf-8"))
            meta = raw.get("meta") or {}
            nm   = raw.get("next_match")
            team = meta.get("team") or ""
            comp = meta.get("competition") or ""
            grp  = meta.get("group") or ""
            if not (team and comp and grp):
                continue
            n_actas = len(raw.get("actas") or [])
            max_j   = max((a.get("jornada") or 0 for a in (raw.get("actas") or [])), default=0)
            teams.append({
                "file":        str(f),
                "name":        f.stem,
                "team":        team,
                "competition": comp,
                "group":       grp,
                "next_j":      nm.get("jornada")    if nm else None,
                "next_date":   nm.get("date")        if nm else None,
                "next_rival":  nm.get("rival_name")  if nm else None,
                "n_actas":     n_actas,
                "max_j":       max_j,
                "outdated":    not nm or is_past(nm.get("date")),
            })
        except Exception as e:
            print(f"  [!] Cannot read {f.name}: {e}")
    return teams


# ─── Phase 1: Group-level update ─────────────────────────────────────────────

def find_outdated_groups(teams: list[dict]) -> list[tuple[str, str]]:
    """
    Returns (competition, group) pairs where the group's max jornada is below
    the global maximum.  These groups need a full re-scrape to pick up missing
    jornada actes.
    """
    global_max = max((t["max_j"] for t in teams), default=0)
    seen: dict[tuple, int] = {}
    for t in teams:
        key = (t["competition"], t["group"])
        seen[key] = max(seen.get(key, 0), t["max_j"])
    return [(comp, grp) for (comp, grp), mj in seen.items() if mj < global_max]


def run_group_scrape(competition: str, group: str, dry_run: bool = False) -> bool:
    """Re-scrape a specific competition/group via scrape_all_groups.py."""
    cmd = [
        sys.executable, "scrape_all_groups.py",
        "--competition", competition,
        "--group",       group,
    ]
    print(f"  CMD: {' '.join(cmd)}")
    if dry_run:
        return True
    result = subprocess.run(cmd, cwd=str(ROOT))
    return result.returncode == 0


# ─── Phase 2: Individual team update ─────────────────────────────────────────

def run_team_update(task: dict, dry_run: bool = False) -> bool:
    """Incremental update for a single team JSON (--update mode)."""
    cmd = [
        sys.executable, "-m", "scraper.main",
        "--team",        task["team"],
        "--competition", task["competition"],
        "--group",       task["group"],
        "--update",
        "--output",      task["file"],
        "--season",      SEASON,
    ]
    print(f"  CMD: {' '.join(cmd)}")
    if dry_run:
        return True
    result = subprocess.run(cmd, cwd=str(ROOT))
    return result.returncode == 0


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="FutLab weekly data updater",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python weekly_update.py                # smart update (outdated only)
  python weekly_update.py --all          # force update everything
  python weekly_update.py --dry-run      # preview without running
  python weekly_update.py --skip-groups  # only update individual team files
  python weekly_update.py --skip-teams   # only update group-level files
        """,
    )
    parser.add_argument("--all",          action="store_true", help="Force update all teams/groups")
    parser.add_argument("--dry-run",      action="store_true", help="Print commands without executing")
    parser.add_argument("--skip-groups",  action="store_true", help="Skip phase 1 (group-level update)")
    parser.add_argument("--skip-teams",   action="store_true", help="Skip phase 2 (individual team update)")
    args = parser.parse_args()

    teams = load_team_files()
    if not teams:
        print("No team JSON files found in data/teams/. Aborting.")
        sys.exit(1)

    # ── Status overview ──────────────────────────────────────────────────────
    global_max_j = max(t["max_j"]   for t in teams)
    global_max_next = max((t["next_j"] or 0) for t in teams)
    print()
    print("FutLab Weekly Update")
    print("=" * 70)
    print(f"  Today         : {today().strftime('%d-%m-%Y')}")
    print(f"  Max jornada (actes): J{global_max_j}")
    print(f"  Max jornada (next): J{global_max_next}")
    print()
    print(f"  {'FILE':<40}  {'COMP/GRP':<28}  {'NEXT':<8}  STATUS")
    print(f"  {'-'*40}  {'-'*28}  {'-'*8}  ------")
    for t in teams:
        status = "[OUTDATED]" if t["outdated"] else "[OK      ]"
        nxt = f"J{t['next_j']} {t['next_date'] or ''}" if t["next_j"] else "None"
        print(f"  {t['name']:<40}  {t['competition']}/{t['group']:<17}  {nxt:<15}  {status}")
    print()

    results = {"groups_ok": 0, "groups_fail": 0, "teams_ok": 0, "teams_fail": 0}

    # ── Phase 1: group-level ─────────────────────────────────────────────────
    if not args.skip_groups:
        outdated_groups = find_outdated_groups(teams) if not args.all else \
            list({(t["competition"], t["group"]) for t in teams})

        if outdated_groups:
            print(f"Phase 1 — Group scrape ({len(outdated_groups)} group(s) behind J{global_max_j}):")
            for comp, grp in sorted(outdated_groups):
                print(f"\n  [{comp}/{grp}]")
                ok = run_group_scrape(comp, grp, dry_run=args.dry_run)
                if ok:
                    results["groups_ok"] += 1
                    print(f"  [OK] {comp}/{grp}")
                else:
                    results["groups_fail"] += 1
                    print(f"  [FAILED] {comp}/{grp}")
        else:
            print("Phase 1 — All groups are up to date. Skipping.\n")
    else:
        print("Phase 1 — Skipped (--skip-groups).\n")

    # ── Phase 2: individual teams ─────────────────────────────────────────────
    if not args.skip_teams:
        to_update = [t for t in teams if t["outdated"] or args.all]

        if to_update:
            print(f"\nPhase 2 — Individual team update ({len(to_update)} team(s)):")
            for i, task in enumerate(to_update, 1):
                rival_str = f"vs {task['next_rival']}" if task["next_rival"] else "(sense next_match)"
                print(f"\n  [{i}/{len(to_update)}] {task['team']} ({task['competition']}/{task['group']}) {rival_str}")
                ok = run_team_update(task, dry_run=args.dry_run)
                if ok:
                    results["teams_ok"] += 1
                    print(f"  [OK]")
                else:
                    results["teams_fail"] += 1
                    print(f"  [FAILED]")
        else:
            print("\nPhase 2 — All individual teams are up to date. Skipping.")
    else:
        print("\nPhase 2 — Skipped (--skip-teams).\n")

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    print("=" * 70)
    print(f"  DONE  |  Groups: {results['groups_ok']} ok, {results['groups_fail']} failed"
          f"  |  Teams: {results['teams_ok']} ok, {results['teams_fail']} failed")
    if not args.dry_run:
        print()
        print("  -> Restart the Next.js dev server to see the updated data.")
        print("     (or just do a hard refresh — dev mode auto-reloads)")
    print("=" * 70)
    print()


if __name__ == "__main__":
    main()
