import { DashboardHeader } from '@/dashboard/_components/header'
import { Sidebar } from '@/dashboard/_components/sidebar'
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader />

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
              <div className="mx-auto max-w-6xl">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
