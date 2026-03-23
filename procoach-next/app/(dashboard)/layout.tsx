import { getDashboardTeam, isAdminUser } from '@/lib/dashboard-auth'
import { DashboardSidebar, DashboardBottomNav, DashboardTopBar } from '@/components/DashboardNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const team = await getDashboardTeam()
  const isAdmin = await isAdminUser()
  const teamName = team?.name || null

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Desktop sidebar */}
      <DashboardSidebar teamName={teamName} isAdmin={isAdmin} />

      {/* Mobile top bar */}
      <DashboardTopBar teamName={teamName} isAdmin={isAdmin} />

      {/* Main content — offset by sidebar on desktop, bottom padding on mobile */}
      <main className="lg:pl-[220px] pb-16 lg:pb-0 transition-all duration-300">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <DashboardBottomNav />
    </div>
  )
}
