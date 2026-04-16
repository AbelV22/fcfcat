/**
 * One-off helper: generates SQL INSERT statements for the 74 seed exercises
 * as global templates (user_id = NULL, is_template = TRUE, is_public = TRUE).
 *
 * Usage: npx tsx scripts/generate-seed-sql.ts > /tmp/seeds.sql
 */
import { SEED_EXERCISES } from '../lib/training-seed-exercises'
import crypto from 'node:crypto'

function slug() {
  return crypto.randomBytes(4).toString('hex')
}

function sqlStr(s: string | null): string {
  if (s === null || s === undefined) return 'NULL'
  return `'${s.replace(/'/g, "''")}'`
}

function sqlArr(arr: string[]): string {
  if (!arr || arr.length === 0) return "'{}'::text[]"
  return `ARRAY[${arr.map(s => sqlStr(s)).join(',')}]::text[]`
}

function sqlJsonb(obj: unknown): string {
  const json = JSON.stringify(obj).replace(/'/g, "''")
  return `'${json}'::jsonb`
}

console.log('BEGIN;')
console.log('-- Seed 74 global exercise templates (user_id = NULL, is_template = TRUE, is_public = TRUE)')
console.log('-- Idempotent: UPSERT by name among templates')
console.log()

for (const seed of SEED_EXERCISES) {
  const values = [
    'NULL',                                                  // user_id
    sqlStr(seed.name),                                       // name
    sqlStr(seed.category),                                   // category
    sqlStr(seed.description ?? null),                        // description
    String(seed.duration_min ?? 15),                         // duration_min
    sqlStr(seed.intensity ?? 'medium'),                      // intensity
    String(seed.min_players ?? 2),                           // min_players
    sqlArr(seed.equipment ?? []),                            // equipment
    sqlStr(seed.tactical_objective ?? null),                 // tactical_objective
    sqlJsonb(seed.diagram_data ?? { elements: [] }),         // diagram_data
    'FALSE',                                                 // is_favorite
    'TRUE',                                                  // is_template
    sqlArr(seed.tags ?? []),                                 // tags
    'TRUE',                                                  // is_public
    sqlStr(slug()),                                          // share_slug
    'NOW()',                                                 // shared_at
  ]

  console.log(`INSERT INTO training_exercises
  (user_id, name, category, description, duration_min, intensity, min_players,
   equipment, tactical_objective, diagram_data, is_favorite, is_template, tags,
   is_public, share_slug, shared_at)
VALUES (${values.join(', ')})
ON CONFLICT DO NOTHING;`)
  console.log()
}

console.log('COMMIT;')
