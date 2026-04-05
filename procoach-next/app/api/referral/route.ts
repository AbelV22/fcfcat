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
 * POST /api/referral — Record a referral (called during signup)
 * Body: { referral_code: string, referred_user_id: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const { referral_code, referred_user_id } = body

  if (!referral_code || !referred_user_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Find referrer by code
  const { data: codeRow } = await supabase
    .from('user_referral_codes')
    .select('user_id')
    .eq('referral_code', referral_code.toUpperCase())
    .single()

  if (!codeRow) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
  }

  // Don't allow self-referral
  if (codeRow.user_id === referred_user_id) {
    return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 })
  }

  // Create referral record
  const { error } = await supabase
    .from('referrals')
    .insert({
      referrer_id: codeRow.user_id,
      referred_id: referred_user_id,
      referral_code: referral_code.toUpperCase(),
    })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'User already referred' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update referral count
  const { count } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', codeRow.user_id)

  const newCount = count || 0

  await supabase
    .from('user_referral_codes')
    .update({
      referral_count: newCount,
      pro_unlocked: newCount >= 3,
    })
    .eq('user_id', codeRow.user_id)

  return NextResponse.json({ success: true, referral_count: newCount })
}
