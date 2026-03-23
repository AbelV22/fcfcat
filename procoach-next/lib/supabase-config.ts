/**
 * Supabase public credentials.
 * The anon key is a *publishable* key — safe to include in source code.
 * We hardcode them as fallbacks because Cloudflare Workers don't expose
 * process.env for build-time NEXT_PUBLIC_* vars at runtime.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://nxgyduqprxbhtpqsepgj.supabase.co'

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Z3lkdXFwcnhiaHRwcXNlcGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTc5NjcsImV4cCI6MjA4ODU3Mzk2N30.qb-T1ja19sGFyDIOLU6C8SM1OBOa9RnmzEakc9g2Y2U'

/**
 * Public site URL used for auth email redirects.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://neoscout.pages.dev).
 * Falls back to localhost for local development.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://neoscout.es'
