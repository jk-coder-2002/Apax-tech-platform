'use client'

import { create } from 'zustand'
import { AssetType, AuthUserDTO, ActivityDTO, HoldingDTO } from '@shared/types/api'
import { getHoldingsApi } from './services/holdings.api'
import { getActivityApi } from './services/activity.api'

// ==========================================================================
// Mock slices - not part of this migration pass. See
// docs/01-frontend-dashboard-migration.md for the incremental path off
// each of these.
// ==========================================================================

export interface MetalPrice {
  gold: number
  silver: number
  platinum: number
  lastUpdated: Date
}

export interface UserHolding {
  goldGrams: number
  silverGrams: number
  platinumGrams: number
  apxiTokens: number
}

export interface VaultData {
  totalGoldGrams: number
  totalSilverGrams: number
  totalPlatinumGrams: number
  totalTokensMinted: number
  lastAuditDate: Date
  verificationStatus: 'verified' | 'pending' | 'syncing'
}

export interface ZakatCalculation {
  totalAssetValue: number
  nisabThreshold: number
  zakatDue: number
  isAboveNisab: boolean
}

interface APAXStore {
  // Metal Prices (mock data with live simulation - see dashboard/page.tsx)
  metalPrices: MetalPrice
  setMetalPrices: (prices: MetalPrice) => void

  // User Holdings (mock - still feeds apxiTokens in asset-allocation-chart
  // and the Zakat calculator; the gram totals themselves are superseded by
  // useHoldingsStore below for portfolio-overview.tsx)
  userHoldings: UserHolding
  setUserHoldings: (holdings: UserHolding) => void

  // Vault Data (mock - Proof of Reserve totals, out of scope for this pass)
  vaultData: VaultData
  setVaultData: (data: VaultData) => void

  // Zakat (mock, out of scope for this pass)
  zakatCalculation: ZakatCalculation | null
  calculateZakat: () => void

  // UI State
  activeView: DashboardViewId
  setActiveView: (view: DashboardViewId) => void
}

export type DashboardViewId =
  | 'dashboard'
  | 'por'
  | 'zakat'
  | 'redemption'
  | 'sharia'
  | 'help'
  | 'settings'

const initialMetalPrices: MetalPrice = {
  gold: 2342.50,
  silver: 27.85,
  platinum: 1024.30,
  lastUpdated: new Date()
}

const initialUserHoldings: UserHolding = {
  goldGrams: 156.75,
  silverGrams: 892.40,
  platinumGrams: 45.20,
  apxiTokens: 1250.00
}

const initialVaultData: VaultData = {
  totalGoldGrams: 15678.50,
  totalSilverGrams: 89240.75,
  totalPlatinumGrams: 4520.25,
  totalTokensMinted: 125000,
  lastAuditDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  verificationStatus: 'verified'
}

export const useAPAXStore = create<APAXStore>((set, get) => ({
  metalPrices: initialMetalPrices,
  setMetalPrices: (prices) => set({ metalPrices: prices }),

  userHoldings: initialUserHoldings,
  setUserHoldings: (holdings) => set({ userHoldings: holdings }),

  vaultData: initialVaultData,
  setVaultData: (data) => set({ vaultData: data }),

  zakatCalculation: null,
  calculateZakat: () => {
    const { metalPrices, userHoldings } = get()

    const goldValue = userHoldings.goldGrams * (metalPrices.gold / 31.1035)
    const silverValue = userHoldings.silverGrams * (metalPrices.silver / 31.1035)
    const platinumValue = userHoldings.platinumGrams * (metalPrices.platinum / 31.1035)
    const totalAssetValue = goldValue + silverValue + platinumValue

    const nisabInGold = 85 * (metalPrices.gold / 31.1035)
    const nisabInSilver = 595 * (metalPrices.silver / 31.1035)
    const nisabThreshold = Math.min(nisabInGold, nisabInSilver)

    const isAboveNisab = totalAssetValue >= nisabThreshold
    const zakatDue = isAboveNisab ? totalAssetValue * 0.025 : 0

    set({
      zakatCalculation: {
        totalAssetValue,
        nisabThreshold,
        zakatDue,
        isAboveNisab
      }
    })
  },

  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view })
}))

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`
  }
  return `${grams.toFixed(2)} g`
}

export function calculateAPXiBreakdown(tokens: number) {
  return {
    goldWeight: tokens * 0.60,
    silverWeight: tokens * 0.30,
    platinumWeight: tokens * 0.10
  }
}

// ==========================================================================
// Auth store - real, backed by the server session (httpOnly cookie).
// ==========================================================================

interface AuthState {
  user: AuthUserDTO | null
  // true until the initial session check (getMeApi, see app/dashboard/page.tsx)
  // resolves - lets protected UI wait instead of flashing signed-out state.
  isHydrating: boolean
  setUser: (user: AuthUserDTO | null) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrating: true,
  setUser: (user) => set({ user, isHydrating: false }),
  clearUser: () => set({ user: null, isHydrating: false }),
}))

// ==========================================================================
// Holdings store - real, Task 1B. Replaces the hardcoded userHoldings
// gram values for portfolio-overview.tsx.
// ==========================================================================

export interface HoldingsState {
  data: HoldingDTO[] | null
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  fetchHoldings: () => Promise<void>
}

let holdingsAbortController: AbortController | null = null

export const useHoldingsStore = create<HoldingsState>((set) => ({
  data: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  fetchHoldings: async () => {
    holdingsAbortController?.abort()
    const controller = new AbortController()
    holdingsAbortController = controller

    set({ isLoading: true, error: null })

    try {
      const res = await getHoldingsApi(controller.signal)
      if (controller.signal.aborted) return

      if (!res.success || !res.data) {
        set({ isLoading: false, error: res.message || 'Failed to load holdings' })
        return
      }

      set({
        data: res.data.holdings,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      set({ isLoading: false, error: 'Failed to load holdings' })
    }
  },
}))

export function cancelHoldingsFetch(): void {
  holdingsAbortController?.abort()
}

export function holdingsToMap(holdings: HoldingDTO[] | null): Record<AssetType, number> {
  const map: Record<AssetType, number> = { gold: 0, silver: 0, platinum: 0 }
  holdings?.forEach((holding) => {
    map[holding.assetType] = holding.amount
  })
  return map
}

// ==========================================================================
// Activity store - real, the "recent activity" half of Task 1B. Replaces
// the randomly-generated auditLogs feed in por-view.tsx.
// ==========================================================================

export interface ActivityState {
  data: ActivityDTO[] | null
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  fetchActivity: () => Promise<void>
}

let activityAbortController: AbortController | null = null

export const useActivityStore = create<ActivityState>((set) => ({
  data: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  fetchActivity: async () => {
    activityAbortController?.abort()
    const controller = new AbortController()
    activityAbortController = controller

    set({ isLoading: true, error: null })

    try {
      const res = await getActivityApi(controller.signal)
      if (controller.signal.aborted) return

      if (!res.success || !res.data) {
        set({ isLoading: false, error: res.message || 'Failed to load activity' })
        return
      }

      set({
        data: res.data.activity,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      set({ isLoading: false, error: 'Failed to load activity' })
    }
  },
}))

export function cancelActivityFetch(): void {
  activityAbortController?.abort()
}
