export const dynamic = 'force-dynamic'

import PublicHeader from '@/components/PublicHeader'
import HeroSection from '@/components/landing/HeroSection'
import StatsBar from '@/components/landing/StatsBar'
import FeaturedSection from '@/components/landing/FeaturedSection'
import FeaturedPlayersSection from '@/components/landing/FeaturedPlayersSection'
import CoachCTA from '@/components/landing/CoachCTA'
import PublicFooter from '@/components/PublicFooter'
import { getHomePageStatsDB, getFeaturedPlayersDB } from '@/lib/supabase-data'

export default async function HomePage() {
  const [{ refereeCount, matchCount, teamCount }, featuredPlayers] = await Promise.all([
    getHomePageStatsDB(),
    getFeaturedPlayersDB(),
  ])

  return (
    <div className="min-h-screen bg-[#0f172a] noise-bg">
      <PublicHeader />
      <main>
        <HeroSection />
        <StatsBar
          refereeCount={refereeCount}
          matchCount={matchCount}
          teamCount={teamCount}
        />
        <FeaturedPlayersSection data={featuredPlayers} />
        <FeaturedSection />
        <CoachCTA />
      </main>
      <PublicFooter />
    </div>
  )
}
