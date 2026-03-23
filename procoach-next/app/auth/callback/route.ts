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
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to login page after email confirmation
  return NextResponse.redirect(`${origin}/login?confirmed=1`)
}
