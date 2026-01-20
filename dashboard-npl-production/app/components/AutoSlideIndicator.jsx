'use client'

export default function AutoSlideIndicator({ isPaused, countdown }) {
  return (
    <div className="fixed bottom-8 right-8 z-50">
      <div className={`
        px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm
        transition-all duration-300 text-xs
        ${isPaused 
          ? 'bg-yellow-500/95 text-yellow-900 border border-yellow-600' 
          : 'bg-primary/95 text-white border border-primary'
        }
      `}>
        <div className="flex items-center gap-2">
          {isPaused ? (
            <>
              <span className="text-lg">⏸️</span>
              <div>
                <div className="font-semibold">Paused</div>
                <div className="text-[10px] opacity-80">
                  Enter to resume
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="text-lg">▶️</span>
              <div>
                <div className="font-semibold">Auto-slide</div>
                <div className="text-[10px] opacity-80">
                  Next in {countdown}s
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
