import { Skeleton } from '@/components/ui/skeleton'

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#1e1e3f] bg-[#0d0d1c] p-5 space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#1e1e3f] bg-[#0d0d1c] p-6 space-y-4">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-3 w-72" />
        <div className="flex items-end gap-2 h-20">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${20 + Math.random() * 60}%` }} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#1e1e3f] bg-[#0d0d1c]">
        <div className="p-6 border-b border-[#1e1e3f]">
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-3 w-80" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-[#1e1e3f] last:border-0">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
