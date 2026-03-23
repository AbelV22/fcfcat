# Plan: Build Missing Dashboard Pages + Admin Access

## Problem
- 6 of 7 dashboard feature cards link to routes that don't exist → 404
- Admin (cookie `ns_admin=1`) has no `club_name` metadata → pages won't know which team to show
- Only `/dashboard/apunts` works

## Architecture Decision
All data functions already exist in `lib/supabase-data.ts`:
- `getFullTeamReportDB(slug)` → returns EVERYTHING (players, form, rival, referee, standings, goalBuckets, etc.)
- `getCompetitionFCFStandingsDB(slug)` → full standings
- `getCompetitionCalendarDB(slug)` → full calendar
- Public pages (`equip/[slug]`, `competicio/[slug]`, `arbitre/[slug]`) already render this data

**Strategy**: Dashboard pages will call `getFullTeamReportDB()` with the user's team slug, then render focused subsets of that data with the same dark theme.

## Steps

### Step 1: Setup page (`/dashboard/setup`)
- Search + select a team (reuse `/api/teams` endpoint)
- Store selection as cookies: `ns_team_slug`, `ns_team_name`, `ns_competition`
- Both admin and regular users can use this
- Server action to set cookies

### Step 2: Helper — `getDashboardTeam()`
- Shared utility in `lib/dashboard-auth.ts`
- Reads team from: (1) cookies `ns_team_slug`/`ns_team_name`/`ns_competition`, or (2) Supabase user metadata `club_name`
- Returns `{ slug, name, competition } | null`
- If no team configured → redirect to `/dashboard/setup`

### Step 3: Dashboard layout (`app/(dashboard)/layout.tsx`)
- Shared header (already duplicated in dashboard/page.tsx) → extract to layout
- Sidebar nav or breadcrumb with current page highlighted

### Step 4: Intel page (`/dashboard/intel`)
- Calls `getFullTeamReportDB(slug)`
- Shows: team record (W/D/L), home/away splits, player stats table, goal timing buckets, form dots
- Reuses data shapes from public `equip/[slug]` page

### Step 5: Rival page (`/dashboard/rival`)
- Shows nextMatch rival from report
- RivalDataDB: position, record, form, top scorers, most minutes, apercibits, goalBuckets, insights
- Head-to-head history
- If no next match → show "No hi ha pròxim rival programat"

### Step 6: Arbitre-pro page (`/dashboard/arbitre-pro`)
- Shows referee from nextMatch report
- RefereeStatsDB: percentiles, yellows/reds per match, home bias, half splits, competition breakdown, recent matches
- Ungated (no paywall in dashboard — admin/pro users)

### Step 7: Calendari page (`/dashboard/calendari`)
- Show all team matches (past results + future fixtures) from report.form
- Color-coded results (W=green, D=amber, L=red)
- Next match highlighted

### Step 8: Classificació page (`/dashboard/classificacio`)
- Show standings table from report.standings
- Highlight user's team row
- Columns: Pos, Team, PJ, PG, PE, PP, GF, GC, Pts

### Step 9: Equip-gestio page (`/dashboard/equip-gestio`)
- Full squad table from report.players
- Sortable by appearances, goals, yellows
- Sanctions section (players with 4+ yellows = apercibits)
- "Coming soon" badge for convocatòria feature

### Step 10: Update dashboard hub
- If team is configured, show team name instead of generic "Admin"
- Add "Canviar equip" link to setup page

## UI Consistency
- All pages use dark theme (`bg-[#0f172a]`, `glass-card`, etc.)
- Shared dashboard header from layout
- Back button to dashboard hub
- Same Lucide icons and color palette as existing pages

## What We're NOT Building
- No new Supabase tables
- No new API endpoints (reuse existing)
- No authentication changes
- Equip-gestio convocatòria feature = placeholder
