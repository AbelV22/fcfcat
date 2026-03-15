import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Fallback to placeholders during build-time pre-rendering when env vars
  // may not be available (e.g. Cloudflare Pages CI).  No API calls are made
  // during SSR of the login form — the real values are inlined by Next.js
  // into the client bundle when NEXT_PUBLIC_* vars are set at build time.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  )
}
