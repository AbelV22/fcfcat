'use server'
import { redirect } from 'next/navigation'
import { setAdminCookie } from '@/lib/admin-auth'

export async function loginAdmin(_prevState: unknown, formData: FormData) {
  const password = formData.get('password') as string
  const secret = process.env.ADMIN_SECRET

  if (!secret || secret.length < 12) {
    return { error: 'ADMIN_SECRET no configurat al servidor' }
  }

  if (password === secret) {
    await setAdminCookie()
    redirect('/admin')
  }

  return { error: 'Contrasenya incorrecta' }
}
