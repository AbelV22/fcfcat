'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function loginAdmin(_prevState: unknown, formData: FormData) {
  const password = formData.get('password') as string
  const secret = process.env.ADMIN_SECRET || 'ns2026admin'

  if (password === secret) {
    const cookieStore = await cookies()
    cookieStore.set('ns_admin', '1', {
      path: '/',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    redirect('/admin')
  }

  return { error: 'Contrasenya incorrecta' }
}
