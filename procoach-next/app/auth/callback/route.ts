import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { SUPABASE_URL } from '@/lib/supabase-config'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

/**
 * GET /auth/callback
 * Supabase redirects here after the user clicks the confirmation link in their email.
 * Exchanges the auth code for a session, then redirects to /login.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !data?.user) {
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
  }

  // Use service role client for privileged operations (referral code creation + referral recording)
  // This avoids RLS issues and the problematic self-fetch to /api/referral
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const admin = serviceKey
    ? createServiceClient(SUPABASE_URL, serviceKey)
    : null

  // Auto-create referral code for new user
  try {
    const client = admin || supabase
    const { data: existing } = await client
      .from('user_referral_codes')
      .select('user_id')
      .eq('user_id', data.user.id)
      .single()

    if (!existing) {
      const refCode = generateCode()
      const { error } = await client
        .from('user_referral_codes')
        .insert({ user_id: data.user.id, referral_code: refCode })

      if (error?.code === '23505') {
        // Code collision — retry once
        await client
          .from('user_referral_codes')
          .insert({ user_id: data.user.id, referral_code: generateCode() })
      }
    }
  } catch {
    // Non-critical
  }

  // Record referral if user signed up with a referral code
  const userRefCode = data.user.user_metadata?.referral_code
  if (userRefCode && admin) {
    try {
      // Call the RPC function directly instead of self-fetching /api/referral
      // This avoids Cloudflare Workers self-fetch issues and is more reliable
      await admin.rpc('record_referral', {
        p_referral_code: userRefCode,
        p_referred_user_id: data.user.id,
      })
    } catch {
      // Non-critical — don't block login
    }
  } else if (userRefCode && !admin) {
    // Fallback: try with the user's own client (less reliable but better than nothing)
    try {
      await supabase.rpc('record_referral', {
        p_referral_code: userRefCode,
        p_referred_user_id: data.user.id,
      })
    } catch {
      // Non-critical
    }
  }

  // Password recovery: redirect to reset-password page instead of login
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  return NextResponse.redirect(`${origin}/login?confirmed=1`)
}
