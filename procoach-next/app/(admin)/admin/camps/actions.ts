'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nxgyduqprxbhtpqsepgj.supabase.co'
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Z3lkdXFwcnhiaHRwcXNlcGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTc5NjcsImV4cCI6MjA4ODU3Mzk2N30.qb-T1ja19sGFyDIOLU6C8SM1OBOa9RnmzEakc9g2Y2U'

export async function saveField(
  _prevState: { error?: string; success?: string } | undefined,
  formData: FormData
) {
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
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
    const { error } = await supabase
      .from('fields')
      .upsert(entry, { onConflict: 'name' })

    if (error) throw new Error(error.message)

    revalidatePath('/admin/camps')
    return { success: `Camp "${entry.name}" desat correctament ✓` }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { error: `Error desant: ${msg}` }
  }
}

export async function deleteField(_prevState: unknown, formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Nom obligatori' }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
    const { error } = await supabase.from('fields').delete().eq('name', name)
    if (error) throw new Error(error.message)
    revalidatePath('/admin/camps')
    return { success: `Camp "${name}" eliminat` }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { error: `Error eliminant: ${msg}` }
  }
}
