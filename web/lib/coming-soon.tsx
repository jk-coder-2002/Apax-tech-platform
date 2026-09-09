'use client'

import { Sparkle } from '@phosphor-icons/react'
import { toast } from 'sonner'

/**
 * The single place every not-yet-built button/link in the app should call
 * instead of doing nothing. A dead click (no feedback at all) reads as
 * broken; this at least confirms the click landed and sets the right
 * expectation.
 */
export function comingSoon(feature?: string): void {
  toast(feature ? `${feature} - coming soon` : 'Coming soon', {
    description: "This isn't wired up yet - it's on the roadmap.",
    icon: <Sparkle weight="fill" className="text-[#D4AF37]" />,
  })
}
