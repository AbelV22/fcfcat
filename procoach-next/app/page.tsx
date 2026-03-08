import PublicHeader from '@/components/PublicHeader'
import HeroSection from '@/components/landing/HeroSection'
import StatsBar from '@/components/landing/StatsBar'
import FeaturedSection from '@/components/landing/FeaturedSection'
import CoachCTA from '@/components/landing/CoachCTA'
import PublicFooter from '@/components/PublicFooter'
import { getRefereeStats, getTeamCount } from '@/lib/data'

export default async function HomePage() {
  const { refereeCount, matchCount } = await getRefereeStats()
  const teamCount = await getTeamCount()

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <PublicHeader />
      <main>
        <HeroSection />
        <StatsBar
          refereeCount={refereeCount}
          matchCount={matchCount}
          teamCount={teamCount}
        />
        <FeaturedSection />
        <CoachCTA />
      </main>
      <PublicFooter />
    </div>
  )
}
