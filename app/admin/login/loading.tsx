function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className ?? ''}`} />
}

export default function LoginLoading() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 bg-[#1a1d24] border border-[#2a2f3a] rounded-2xl p-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-2">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3.5 w-24" />
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <Skeleton className="h-10 w-full mt-2" />
      </div>
    </div>
  )
}
