'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { DashboardView } from '@/components/views/dashboard-view'
import { PorView } from '@/components/views/por-view'
import { ZakatView } from '@/components/views/zakat-view'
import { RedemptionView } from '@/components/views/redemption-view'
import { ShariaView } from '@/components/views/sharia-view'
import { HelpView } from '@/components/views/help-view'
import { SettingsView } from '@/components/views/settings-view'
import { SessionLoading } from '@/components/session-loading'
import {
  useAPAXStore,
  useAuthStore,
  useHoldingsStore,
  useActivityStore,
  cancelHoldingsFetch,
  cancelActivityFetch,
} from '@/lib/store'
import { getMeApi } from '@/lib/services/me.api'

export default function DashboardPage() {
  const router = useRouter()
  const { activeView } = useAPAXStore()
  const { isHydrating, setUser, clearUser } = useAuthStore()
  const fetchHoldings = useHoldingsStore((state) => state.fetchHoldings)
  const fetchActivity = useActivityStore((state) => state.fetchActivity)

  // Re-populate the auth store's user (name/email for the sidebar) after a
  // hard refresh - the httpOnly cookie survives a reload, but in-memory
  // Zustand state does not. Middleware already gated this route on the
  // cookie's presence, so this call is about display data, not authorization.
  // Deliberately mount-only ([] deps, reading the store directly rather than
  // subscribing to `user`): this must run once per page load, not react to
  // the logout flow's own clearUser() call - that would fire a needless
  // /user/me request against an already-cleared cookie.
  useEffect(() => {
    if (useAuthStore.getState().user) return

    let cancelled = false
    getMeApi().then((res) => {
      if (cancelled) return
      if (res.success && res.data) {
        setUser(res.data.user)
      } else {
        // Middleware only checks the cookie's presence, not its validity -
        // an expired/tampered token gets this far and fails here instead.
        clearUser()
        router.push('/login')
      }
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchHoldings()
    return () => cancelHoldingsFetch()
  }, [fetchHoldings])

  useEffect(() => {
    fetchActivity()
    return () => cancelActivityFetch()
  }, [fetchActivity])

  // Simulated live price ticker - dev-only fallback. Task 1B wires
  // holdings and recent activity to the real API; a live metals price feed
  // is a separate integration (see docs/01-frontend-dashboard-migration.md
  // for the incremental path) so this random walk stays as a clearly
  // labelled placeholder rather than a real polled endpoint for now.
  useEffect(() => {
    const interval = setInterval(() => {
      useAPAXStore.setState((state) => ({
        metalPrices: {
          gold: state.metalPrices.gold + (Math.random() - 0.5) * 2,
          silver: state.metalPrices.silver + (Math.random() - 0.5) * 0.1,
          platinum: state.metalPrices.platinum + (Math.random() - 0.5) * 1,
          lastUpdated: new Date()
        }
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />
      case 'por':
        return <PorView />
      case 'zakat':
        return <ZakatView />
      case 'redemption':
        return <RedemptionView />
      case 'sharia':
        return <ShariaView />
      case 'help':
        return <HelpView />
      case 'settings':
        return <SettingsView />
      default:
        return <DashboardView />
    }
  }

  if (isHydrating) {
    return <SessionLoading />
  }

  return (
    <DashboardLayout>
      {renderView()}
    </DashboardLayout>
  )
}
