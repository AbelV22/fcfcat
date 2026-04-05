import { cookies } from 'next/headers'

const ADMIN_COOKIE = 'ns_admin_token'
const ADMIN_TOKEN_VALUE = 'ns-admin-ok'
const ADMIN_JS_COOKIE = 'ns_admin'

/** Check if the current request is from a verified admin */
export async function isAdminUser(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  return token === ADMIN_TOKEN_VALUE
}

/** Set the admin cookie */
export async function setAdminCookie(): Promise<void> {
  const cookieStore = await cookies()
  const isProduction = process.env.NODE_ENV === 'production'
  const maxAge = 60 * 60 * 24 * 30 // 30 days
  // httpOnly token — verified server-side
  cookieStore.set(ADMIN_COOKIE, ADMIN_TOKEN_VALUE, {
    path: '/',
    sameSite: 'strict',
    httpOnly: true,
    secure: isProduction,
    maxAge,
  })
  // JS-readable flag — used by client components (apunts pages)
  cookieStore.set(ADMIN_JS_COOKIE, '1', {
    path: '/',
    sameSite: 'strict',
    httpOnly: false,
    secure: isProduction,
    maxAge,
  })
}

/** Clear the admin cookie */
export async function clearAdminCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
  cookieStore.delete(ADMIN_JS_COOKIE)
}

export { ADMIN_COOKIE }
