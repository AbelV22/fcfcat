export const dynamic = 'force-dynamic'

import HeaderV2 from '@/components/landing-v2/HeaderV2'
import HeroV2 from '@/components/landing-v2/HeroV2'
import StatsBarV2 from '@/components/landing-v2/StatsBarV2'
import HowItWorksV2 from '@/components/landing-v2/HowItWorksV2'
import FeaturedSectionV2 from '@/components/landing-v2/FeaturedSectionV2'
import CoachCTAV2 from '@/components/landing-v2/CoachCTAV2'
import FooterV2 from '@/components/landing-v2/FooterV2'
import { getHomePageStatsDB } from '@/lib/supabase-data'

export default async function HomePage() {
  const { refereeCount, matchCount, teamCount } = await getHomePageStatsDB()

  return (
    <div style={{ minHeight: '100vh', background: '#08090a' }}>
      <HeaderV2 />
      <main>
        <HeroV2 />
        <StatsBarV2
          refereeCount={refereeCount}
          matchCount={matchCount}
          teamCount={teamCount}
        />
        <HowItWorksV2 />
        <FeaturedSectionV2 />
        <CoachCTAV2 matchCount={matchCount} />
      </main>
      <FooterV2 />
    </div>
  )
}
