'use client'

import { useEffect, useState } from 'react'
import { Spinner } from '@/components/ui/spinner'

const SLOW_NOTICE_DELAY_MS = 4000

/**
 * Shown while a page checks whether the visitor already has a valid
 * session (GET /user/me), before deciding what to render. Previously this
 * was a bare `return null` - invisible on the app's near-black background,
 * so a slow response (Render's free tier spins the server down when idle
 * and can take 20-50s+ to wake back up) looked like a frozen blank page
 * rather than something loading.
 */
export function SessionLoading() {
  const [showSlowNotice, setShowSlowNotice] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowSlowNotice(true), SLOW_NOTICE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-4 p-4">
      <Spinner className="size-8 text-[#D4AF37]" />
      <p className="text-sm text-[#888888]">Verifying your session...</p>
      {showSlowNotice && (
        <p className="text-xs text-[#666666] max-w-xs text-center">
          First load can take up to a minute while the server wakes up.
        </p>
      )}
    </div>
  )
}
