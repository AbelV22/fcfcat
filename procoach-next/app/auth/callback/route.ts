import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * GET /auth/callback
 * Supabase redirects here after the user clicks the confirmation link in their email.
 * Exchanges the auth code for a session, then redirects to /login.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)

    // Record referral if user signed up with a referral code
    if (data?.user) {
      const refCode = data.user.user_metadata?.referral_code
      if (refCode) {
        try {
          await fetch(`${origin}/api/referral`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referral_code: refCode,
              referred_user_id: data.user.id,
            }),
          })
        } catch {
          // Non-critical — don't block login
        }
      }
    }
  }

  // Redirect to login page after email confirmation
  return NextResponse.redirect(`${origin}/login?confirmed=1`)
}
