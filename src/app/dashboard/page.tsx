import { Suspense } from 'react'
import { DashboardStats } from '@/dashboard/_components/stats'
import { QuickActions } from '@/dashboard/_components/quick-actions'
import { DashboardSkeleton } from '@/dashboard/_components/skeleton'

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <div className="grid gap-6 md:grid-cols-2">
        <DashboardStats />
        <QuickActions />
      </div>
    </Suspense>
  )
} 
