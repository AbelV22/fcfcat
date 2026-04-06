import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

/**
 * GET /api/referral — Get current user's referral code + stats
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Get or create referral code
  let { data: codeRow } = await supabase
    .from('user_referral_codes')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!codeRow) {
    const code = generateCode()
    const { data: newRow, error } = await supabase
      .from('user_referral_codes')
      .insert({ user_id: user.id, referral_code: code })
      .select()
      .single()

    if (error) {
      // Code collision — retry once
      const code2 = generateCode()
      const { data: retry } = await supabase
        .from('user_referral_codes')
        .insert({ user_id: user.id, referral_code: code2 })
        .select()
        .single()
      codeRow = retry
    } else {
      codeRow = newRow
    }
  }

  if (!codeRow) {
    return NextResponse.json({ error: 'Failed to generate referral code' }, { status: 500 })
  }

  // Get referral count
  const { count } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', user.id)

  return NextResponse.json({
    referral_code: codeRow.referral_code,
    referral_count: count || 0,
    pro_unlocked: codeRow.pro_unlocked || (count || 0) >= 3,
    target: 3,
  })
}

/**
 * POST /api/referral — Record a referral (called during signup callback)
 * Body: { referral_code: string, referred_user_id: string }
 *
 * Uses a SECURITY DEFINER Postgres function (record_referral) so that
 * referral_count and pro_unlocked are updated atomically — even when
 * the caller is unauthenticated (server-to-server fetch from /auth/callback).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const { referral_code, referred_user_id } = body

  if (!referral_code || !referred_user_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('record_referral', {
    p_referral_code: referral_code,
    p_referred_user_id: referred_user_id,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // The function returns a JSONB object
  const result = data as { error?: string; status?: number; success?: boolean; referral_count?: number }

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status || 400 })
  }

  return NextResponse.json({ success: true, referral_count: result.referral_count })
}
