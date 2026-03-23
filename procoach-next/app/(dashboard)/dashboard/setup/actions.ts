'use server'

import { cookies } from 'next/headers'
import { slugify } from '@/lib/utils'

export async function saveTeamSelection(formData: FormData) {
  const team = formData.get('team') as string
  const competition = formData.get('competition') as string

  if (!team || !competition) {
    return { error: 'Cal seleccionar equip i competició.' }
  }

  const cookieStore = await cookies()
  const opts = { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: false } as const

  cookieStore.set('ns_team_slug', slugify(team), opts)
  cookieStore.set('ns_team_name', team, opts)
  cookieStore.set('ns_competition', competition, opts)

  return { success: true }
}
