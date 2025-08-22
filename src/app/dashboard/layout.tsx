import { Sidebar } from "@/components/dashboard/sidebar"
import { TRPCProvider } from "@/lib/trpc/provider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TRPCProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </TRPCProvider>
  )
}
