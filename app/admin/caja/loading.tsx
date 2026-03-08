// Caja is a full-screen component that bypasses AdminLayout.
// This skeleton mirrors its top bar + main area layout.
export default function CajaLoading() {
  return (
    <div className="fixed inset-0 bg-[#1a1d24] flex flex-col">
      {/* Top bar */}
      <div className="h-14 bg-[#1a1d24] border-b border-[#2a2f3a] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-24 rounded-lg bg-[#252a35] animate-pulse" />
          <div className="h-4 w-px bg-[#2a2f3a]" />
          <div className="h-4 w-20 rounded bg-[#252a35] animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-16 rounded bg-[#252a35] animate-pulse" />
          <div className="h-8 w-8 rounded-lg bg-[#252a35] animate-pulse" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 opacity-40">
          <div className="h-12 w-12 rounded-xl bg-[#252a35] animate-pulse" />
          <div className="h-4 w-32 rounded bg-[#252a35] animate-pulse" />
        </div>
      </div>
    </div>
  )
}
