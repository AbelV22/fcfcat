import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SITE_URL } from '@/lib/supabase-config'
import type { EmailOtpType } from '@supabase/supabase-js'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

/** Categorize a Supabase auth error into a URL-safe error code. */
function categorizeError(error: { message?: string; status?: number } | null): string {
  if (!error) return 'missing_code'
  const msg = (error.message || '').toLowerCase()
  if (msg.includes('expired') || msg.includes('otp_expired')) return 'link_expired'
  if (msg.includes('code verifier') || msg.includes('pkce') || msg.includes('code_verifier')) return 'pkce_failed'
  if (msg.includes('not found') || msg.includes('invalid')) return 'invalid_link'
  return 'confirmation_failed'
}

/**
 * GET /auth/callback
 * Supabase redirects here after the user clicks the confirmation link in their email.
 * Supports both token_hash (cross-browser) and PKCE code exchange flows.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  const supabase = await createClient()
  let userData: { user: any; session: any } | null = null
  let lastError: any = null

  // Path A: token_hash flow (works cross-browser, no cookie needed)
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })
    if (!error && data?.user) {
      userData = data
    } else {
      console.error('[auth/callback] verifyOtp failed:', error?.message, error?.status)
      lastError = error
    }
  }

  // Path B: PKCE code exchange (fallback for links already sent with ?code=)
  if (!userData && code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data?.user) {
      userData = data
    } else {
      console.error('[auth/callback] exchangeCodeForSession failed:', error?.message, error?.status)
      lastError = error
    }
  }

  // Neither path worked
  if (!userData?.user) {
    if (!code && !tokenHash) {
      return NextResponse.redirect(`${SITE_URL}/login?error=missing_code`)
    }
    const errorCode = categorizeError(lastError)
    return NextResponse.redirect(`${SITE_URL}/login?error=${errorCode}`)
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
      .eq('user_id', userData.user.id)
      .single()

    if (!existing) {
      const refCode = generateCode()
      const { error } = await client
        .from('user_referral_codes')
        .insert({ user_id: userData.user.id, referral_code: refCode })

      if (error?.code === '23505') {
        // Code collision — retry once
        await client
          .from('user_referral_codes')
          .insert({ user_id: userData.user.id, referral_code: generateCode() })
      }
    }
  } catch {
    // Non-critical
  }

  // Record referral if user signed up with a referral code
  const userRefCode = userData.user.user_metadata?.referral_code
  if (userRefCode && admin) {
    try {
      await admin.rpc('record_referral', {
        p_referral_code: userRefCode,
        p_referred_user_id: userData.user.id,
      })
    } catch {
      // Non-critical — don't block login
    }
  } else if (userRefCode && !admin) {
    try {
      await supabase.rpc('record_referral', {
        p_referral_code: userRefCode,
        p_referred_user_id: userData.user.id,
      })
    } catch {
      // Non-critical
    }
  }

  // Password recovery: redirect to reset-password page instead of login
  if (type === 'recovery') {
    return NextResponse.redirect(`${SITE_URL}/reset-password`)
  }

  return NextResponse.redirect(`${SITE_URL}/login?confirmed=1`)
}
