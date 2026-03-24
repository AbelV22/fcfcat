'use server'
import { redirect } from 'next/navigation'
import { setAdminCookie } from '@/lib/admin-auth'

const ADMIN_PASSWORD = 'nsICO2620'

export async function loginAdmin(_prevState: unknown, formData: FormData) {
  const password = formData.get('password') as string

  if (password === ADMIN_PASSWORD) {
    await setAdminCookie()
    redirect('/admin')
  }

  return { error: 'Contrasenya incorrecta' }
}
