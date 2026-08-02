import { getSession } from '@/lib/get-session'
import { Sidebar } from '@/components/dashboard/sidebar'
import { MobileTopbar } from '@/components/dashboard/mobile-topbar'
import { BottomNav } from '@/components/dashboard/bottom-nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  return (
    <div className="min-h-screen flex bg-[#FBF6EA]">
      <Sidebar adminNama={session?.nama ?? 'Admin'} />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTopbar />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}