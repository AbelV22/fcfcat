/**
 * Seeds the 74 SEED_EXERCISES as global public templates in training_exercises.
 *
 * Each template is inserted with:
 *   - user_id = NULL (global, owned by no-one)
 *   - is_template = TRUE
 *   - is_public = TRUE
 *   - share_slug = generated unique 8-char slug
 *
 * Reruns are idempotent: existing templates with the same name are replaced.
 *
 * Usage:
 *   cd procoach-next
 *   npx tsx scripts/seed-templates.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { SEED_EXERCISES } from '../lib/training-seed-exercises'
import { SUPABASE_URL } from '../lib/supabase-config'

// Load .env.local manually (dotenv is overkill for one script)
const envPath = path.resolve(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

function slug() {
  return crypto.randomBytes(4).toString('hex')
}

async function main() {
  console.log(`Seeding ${SEED_EXERCISES.length} templates…`)

  // Wipe existing templates to make the script idempotent.
  const { error: delErr } = await supabase
    .from('training_exercises')
    .delete()
    .eq('is_template', true)
    .is('user_id', null)
  if (delErr) {
    console.error('Delete step failed:', delErr)
    process.exit(1)
  }

  const rows = SEED_EXERCISES.map(seed => ({
    user_id: null,
    name: seed.name,
    category: seed.category,
    description: seed.description,
    duration_min: seed.duration_min,
    intensity: seed.intensity,
    min_players: seed.min_players,
    equipment: seed.equipment,
    tactical_objective: seed.tactical_objective,
    diagram_data: seed.diagram_data,
    is_favorite: false,
    is_template: true,
    tags: seed.tags,
    is_public: true,
    share_slug: slug(),
    shared_at: new Date().toISOString(),
  }))

  const { error: insErr, count } = await supabase
    .from('training_exercises')
    .insert(rows, { count: 'exact' })

  if (insErr) {
    console.error('Insert failed:', insErr)
    process.exit(1)
  }

  console.log(`✓ Inserted ${count ?? rows.length} templates.`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
