'use client'

import React from "react"
import { useRouter } from "next/navigation"

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Bell, Search, Coins, ShieldCheck, RefreshCw, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAPAXStore, useAuthStore } from '@/lib/store'
import { logoutApi } from '@/lib/services/login.api'
import { getInitials } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const NOTIFICATIONS = [
  {
    icon: Coins,
    title: 'Gold deposit confirmed',
    detail: '100g added to your vault allocation',
    time: '2h ago',
  },
  {
    icon: ShieldCheck,
    title: 'Vault re-verified',
    detail: 'Lead auditor confirmed reserve ratio at 87.55%',
    time: '5h ago',
  },
  {
    icon: RefreshCw,
    title: 'Price alert',
    detail: 'Gold moved +0.89% in the past 24h',
    time: '1d ago',
  },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const { metalPrices, setActiveView } = useAPAXStore()
  const { user, clearUser } = useAuthStore()

  const handleLogout = async () => {
    await logoutApi()
    clearUser()
    router.push('/login')
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-[#0A0A0A] overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b border-[#2A2A2A] bg-[#0A0A0A]/95 backdrop-blur-sm px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="text-[#888888] hover:text-[#E8E8E8] hover:bg-[#1A1A1A]" />

            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#888888]" />
              <Input
                placeholder="Search assets, transactions..."
                className="w-64 pl-9 bg-[#1A1A1A] border-[#2A2A2A] text-[#E8E8E8] placeholder:text-[#888888] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Metal Prices Ticker */}
            <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A]">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#D4AF37] animate-pulse" />
                <span className="text-xs text-[#888888]">GOLD</span>
                <span className="text-sm font-medium text-[#D4AF37]">${metalPrices.gold.toFixed(2)}</span>
              </div>
              <div className="w-px h-4 bg-[#2A2A2A]" />
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#C0C0C0] animate-pulse" />
                <span className="text-xs text-[#888888]">SILVER</span>
                <span className="text-sm font-medium text-[#C0C0C0]">${metalPrices.silver.toFixed(2)}</span>
              </div>
              <div className="w-px h-4 bg-[#2A2A2A]" />
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#E5E4E2] animate-pulse" />
                <span className="text-xs text-[#888888]">PLATINUM</span>
                <span className="text-sm font-medium text-[#E5E4E2]">${metalPrices.platinum.toFixed(2)}</span>
              </div>
            </div>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Notifications"
                  className="relative text-[#888888] hover:text-[#E8E8E8] hover:bg-[#1A1A1A]"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#D4AF37]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80 bg-[#111111] border-[#2A2A2A] text-[#E8E8E8]"
              >
                <DropdownMenuLabel className="text-[#888888] font-normal text-xs uppercase tracking-wider">
                  Notifications
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#2A2A2A]" />
                {NOTIFICATIONS.map((note) => (
                  <DropdownMenuItem
                    key={note.title}
                    className="flex items-start gap-3 py-2.5 focus:bg-[#1A1A1A] focus:text-[#E8E8E8]"
                  >
                    <div className="p-1.5 rounded-md bg-[#1A1A1A] shrink-0">
                      <note.icon className="h-4 w-4 text-[#D4AF37]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-[#E8E8E8]">{note.title}</p>
                      <p className="text-xs text-[#888888] mt-0.5">{note.detail}</p>
                      <p className="text-[10px] text-[#666666] mt-1">{note.time}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Account menu"
                  className="h-9 w-9 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center text-[#0A0A0A] font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  {user ? getInitials(user.name) : '?'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-[#111111] border-[#2A2A2A] text-[#E8E8E8]"
              >
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm text-[#E8E8E8] truncate">{user?.name ?? 'Loading...'}</p>
                  <p className="text-xs text-[#888888] truncate">{user?.email ?? ''}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#2A2A2A]" />
                <DropdownMenuItem
                  onClick={() => setActiveView('settings')}
                  className="focus:bg-[#1A1A1A] focus:text-[#E8E8E8]"
                >
                  <Settings className="h-4 w-4 text-[#888888]" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#2A2A2A]" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 p-4 md:p-6 min-w-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
