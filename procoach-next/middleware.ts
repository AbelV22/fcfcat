import { type NextRequest, NextResponse } from 'next/server'

// Cloudflare Workers only supports Edge middleware
export const runtime = 'edge'

export function middleware(request: NextRequest) {
  // Let all requests pass through — auth is checked in the
  // dashboard page's server component via supabase.auth.getUser()
  return NextResponse.next()
}

export const config = {
  // Only intercept dashboard routes (keeps public pages fast)
  matcher: ['/dashboard/:path*'],
}
