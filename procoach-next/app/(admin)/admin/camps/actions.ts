'use server'
import fs from 'fs'
import path from 'path'
import { revalidatePath } from 'next/cache'

export async function saveField(_prevState: { error?: string; success?: string } | undefined, formData: FormData) {
  const entry = {
    name: (formData.get('name') as string)?.trim(),
    fcf_venue: (formData.get('fcf_venue') as string)?.trim() || null,
    team: (formData.get('team') as string)?.trim() || null,
    city: (formData.get('city') as string)?.trim() || '',
    address: null as null,
    length_m: parseFloat(formData.get('length_m') as string),
    width_m: parseFloat(formData.get('width_m') as string),
    confirmed: formData.get('confirmed') === 'on',
    notes: (formData.get('notes') as string)?.trim() || '',
  }

  if (!entry.name || isNaN(entry.length_m) || isNaN(entry.width_m)) {
    return { error: 'Nom, longitud i amplada són obligatoris' }
  }

  if (entry.length_m <= 0 || entry.width_m <= 0) {
    return { error: 'Les dimensions han de ser nombres positius' }
  }

  try {
    const fieldsPath = path.join(process.cwd(), '..', 'data', 'fields.json')
    const raw = JSON.parse(fs.readFileSync(fieldsPath, 'utf-8'))

    if (!Array.isArray(raw.fields)) raw.fields = []
    if (typeof raw.team_venues !== 'object' || raw.team_venues === null) raw.team_venues = {}

    // Update existing entry or add new
    const idx = raw.fields.findIndex((f: { name: string }) => f.name === entry.name)
    if (idx >= 0) {
      raw.fields[idx] = entry
    } else {
      raw.fields.push(entry)
    }

    // Also update team_venues if team is specified
    if (entry.team) {
      raw.team_venues[entry.team] = {
        field_name: entry.name,
        fcf_venue: entry.fcf_venue,
        city: entry.city,
        length_m: entry.length_m,
        width_m: entry.width_m,
      }
    }

    fs.writeFileSync(fieldsPath, JSON.stringify(raw, null, 2), 'utf-8')
    revalidatePath('/admin/camps')
    return { success: `Camp "${entry.name}" desat correctament` }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { error: `Error desant: ${msg}` }
  }
}
