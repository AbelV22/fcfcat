"""
Upload goal_type data from global_referees.json to Supabase.

Reads the local JSON and outputs SQL UPDATE statements in batches
that can be executed via the Supabase MCP execute_sql tool.

Usage:
    python3 upload_goals_to_supabase.py --batch 0   # first 500 matches
    python3 upload_goals_to_supabase.py --batch 1   # next 500 matches
    python3 upload_goals_to_supabase.py --stats      # show summary stats
    python3 upload_goals_to_supabase.py --dump-sql 0 > batch0.sql  # dump SQL to file
"""
import json
import argparse
from pathlib import Path

DATA_PATH = Path(__file__).parent / "data" / "global_referees.json"
BATCH_SIZE = 200  # matches per batch


def load_data():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def stats():
    data = load_data()
    total = len(data)
    total_goals = sum(len(v.get("goals", [])) for v in data.values())
    pens = sum(1 for v in data.values() for g in v.get("goals", []) if g.get("goal_type") == "penalty")
    ogs = sum(1 for v in data.values() for g in v.get("goals", []) if g.get("goal_type") == "own_goal")
    matches_w_pen = sum(1 for v in data.values() if any(g.get("goal_type") == "penalty" for g in v.get("goals", [])))
    matches_w_goals = sum(1 for v in data.values() if v.get("goals"))
    batches_needed = (total + BATCH_SIZE - 1) // BATCH_SIZE

    print(f"Total matches: {total}")
    print(f"Matches with goals: {matches_w_goals}")
    print(f"Total goals: {total_goals}")
    print(f"Penalties: {pens}")
    print(f"Own goals: {ogs}")
    print(f"Normal goals: {total_goals - pens - ogs}")
    print(f"Matches with penalty: {matches_w_pen} ({matches_w_pen/total*100:.1f}%)")
    print(f"Batches needed: {batches_needed} (batch size {BATCH_SIZE})")


def generate_sql_batch(batch_num: int) -> str:
    """Generate SQL for a batch of updates."""
    data = load_data()
    items = list(data.items())
    start = batch_num * BATCH_SIZE
    end = min(start + BATCH_SIZE, len(items))

    if start >= len(items):
        return f"-- Batch {batch_num}: no data (only {len(items)} total matches)"

    statements = []
    for match_id, match_data in items[start:end]:
        goals = match_data.get("goals", [])
        if not goals:
            continue
        # Escape single quotes in JSON
        goals_json = json.dumps(goals, ensure_ascii=False).replace("'", "''")
        safe_id = match_id.replace("'", "''")
        statements.append(
            f"UPDATE fcf_referee_matches SET goals = '{goals_json}'::jsonb "
            f"WHERE id = '{safe_id}';"
        )

    if not statements:
        return f"-- Batch {batch_num}: no goals to update"

    return "\n".join(statements)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stats", action="store_true")
    parser.add_argument("--batch", type=int, help="Batch number to generate SQL for")
    parser.add_argument("--dump-sql", type=int, help="Dump SQL batch to stdout")
    parser.add_argument("--count-batches", action="store_true")
    args = parser.parse_args()

    if args.stats:
        stats()
    elif args.count_batches:
        data = load_data()
        total = len(data)
        print((total + BATCH_SIZE - 1) // BATCH_SIZE)
    elif args.batch is not None:
        sql = generate_sql_batch(args.batch)
        print(f"-- Batch {args.batch}: {sql.count('UPDATE')} updates")
        print(sql[:200] + "..." if len(sql) > 200 else sql)
    elif args.dump_sql is not None:
        print(generate_sql_batch(args.dump_sql))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
