import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

const ADMIN_COOKIE = 'ns_admin_token'
const PAYLOAD = 'admin:neoscout'

function getSecret(): string {
  const secret = process.env.ADMIN_SECRET
  if (!secret || secret.length < 12) {
    throw new Error('ADMIN_SECRET env var must be set and at least 12 characters')
  }
  return secret
}

/** Sign a value with HMAC-SHA256 */
function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex')
}

/** Create a signed admin token */
export function createAdminToken(): string {
  const secret = getSecret()
  const sig = sign(PAYLOAD, secret)
  return `${PAYLOAD}.${sig}`
}

/** Verify a signed admin token */
export function verifyAdminToken(token: string): boolean {
  try {
    const secret = getSecret()
    const lastDot = token.lastIndexOf('.')
    if (lastDot === -1) return false

    const payload = token.slice(0, lastDot)
    const sig = token.slice(lastDot + 1)

    const expected = sign(payload, secret)

    // Constant-time comparison to prevent timing attacks
    const sigBuf = Buffer.from(sig, 'hex')
    const expectedBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expectedBuf.length) return false

    return timingSafeEqual(sigBuf, expectedBuf)
  } catch {
    return false
  }
}

/** Check if the current request is from a verified admin */
export async function isAdminUser(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  if (!token) return false
  return verifyAdminToken(token)
}

/** Set the admin cookie with a signed token */
export async function setAdminCookie(): Promise<void> {
  const cookieStore = await cookies()
  const token = createAdminToken()
  cookieStore.set(ADMIN_COOKIE, token, {
    path: '/',
    sameSite: 'strict',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

/** Clear the admin cookie */
export async function clearAdminCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
}

export { ADMIN_COOKIE }
