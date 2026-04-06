import { NextRequest, NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase-server'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

/**
 * GET /api/admin/referrals — List ALL users with referral data.
 * Auto-creates referral codes for users who don't have one yet.
 */
export async function GET() {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Get ALL auth users (via admin function)
  const { data: authUsers } = await supabase.rpc('get_user_emails_for_admin', {})

  // Build email map
  const emailMap: Record<string, { email: string; name: string }> = {}
  if (Array.isArray(authUsers)) {
    for (const u of authUsers) {
      emailMap[u.id] = { email: u.email, name: u.name || '' }
    }
  }

  // Get existing referral codes
  const { data: existingCodes } = await supabase
    .from('user_referral_codes')
    .select('user_id, referral_code, referral_count, pro_unlocked, created_at')

  const existingSet = new Set((existingCodes || []).map(c => c.user_id))

  // Auto-create codes for users who don't have one
  const missingUserIds = Object.keys(emailMap).filter(id => !existingSet.has(id))
  for (const userId of missingUserIds) {
    const code = generateCode()
    const { error } = await supabase
      .from('user_referral_codes')
      .insert({ user_id: userId, referral_code: code })

    if (error?.code === '23505') {
      // Code collision — retry
      await supabase
        .from('user_referral_codes')
        .insert({ user_id: userId, referral_code: generateCode() })
    }
  }

  // Re-fetch all codes after backfill
  const { data: users, error: usersErr } = await supabase
    .from('user_referral_codes')
    .select('user_id, referral_code, referral_count, pro_unlocked, created_at')
    .order('created_at', { ascending: false })

  if (usersErr) {
    return NextResponse.json({ error: usersErr.message }, { status: 500 })
  }

  // Get all referral records
  const { data: referrals } = await supabase
    .from('referrals')
    .select('referrer_id, referred_id, referral_code, created_at')
    .order('created_at', { ascending: false })

  return NextResponse.json({
    users: (users || []).map(u => ({
      ...u,
      email: emailMap[u.user_id]?.email || '?',
      name: emailMap[u.user_id]?.name || '?',
    })),
    referrals: referrals || [],
    emailMap,
  })
}

/**
 * POST /api/admin/referrals — Admin actions on referrals
 * Body: { action: 'set_count' | 'set_pro' | 'add_referral', ... }
 */
export async function POST(req: NextRequest) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const body = await req.json()
  const { action } = body

  if (action === 'set_count') {
    const { user_id, count } = body
    if (!user_id || count === undefined) {
      return NextResponse.json({ error: 'Missing user_id or count' }, { status: 400 })
    }
    const { data, error } = await supabase.rpc('admin_set_referral_count', {
      p_user_id: user_id,
      p_count: count,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (action === 'set_pro') {
    const { user_id, pro } = body
    if (!user_id || pro === undefined) {
      return NextResponse.json({ error: 'Missing user_id or pro' }, { status: 400 })
    }
    const { data, error } = await supabase.rpc('admin_set_pro_status', {
      p_user_id: user_id,
      p_pro: pro,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (action === 'add_referral') {
    const { referrer_id, referred_id } = body
    if (!referrer_id || !referred_id) {
      return NextResponse.json({ error: 'Missing referrer_id or referred_id' }, { status: 400 })
    }
    const { data, error } = await supabase.rpc('admin_add_referral', {
      p_referrer_id: referrer_id,
      p_referred_id: referred_id,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
