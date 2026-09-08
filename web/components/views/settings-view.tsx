'use client'

import { useState } from 'react'
import { User, Bell, ShieldCheck, Palette } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/store'
import { getInitials } from '@/lib/utils'

const NOTIFICATION_PREFERENCES = [
  { id: 'price-alerts', label: 'Price alerts', description: 'Notify me on significant gold/silver/platinum price moves', defaultChecked: true },
  { id: 'vault-events', label: 'Vault events', description: 'Mints, deposits, and audit updates', defaultChecked: true },
  { id: 'redemption-updates', label: 'Redemption updates', description: 'Status changes on redemption requests', defaultChecked: true },
  { id: 'marketing', label: 'Product updates', description: 'New features and platform announcements', defaultChecked: false },
]

export function SettingsView() {
  const user = useAuthStore((state) => state.user)
  const [preferences, setPreferences] = useState(
    Object.fromEntries(NOTIFICATION_PREFERENCES.map((p) => [p.id, p.defaultChecked]))
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#E8E8E8]">Settings</h1>
        <p className="text-sm text-[#888888] mt-1">Manage your profile, notifications, and security preferences</p>
      </div>

      <Card className="glass border-[#2A2A2A] bg-[#111111]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1A1A1A]">
              <User weight="light" className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div>
              <CardTitle className="text-[#E8E8E8]">Profile</CardTitle>
              <CardDescription className="text-[#888888]">Your account information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center text-[#0A0A0A] font-semibold text-lg shrink-0">
              {user ? getInitials(user.name) : '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#E8E8E8] truncate">{user?.name ?? 'Loading...'}</p>
              <p className="text-xs text-[#888888] truncate">{user?.email ?? ''}</p>
              <Badge variant="outline" className="mt-2 border-[#D4AF37]/30 text-[#D4AF37] capitalize">
                {user?.role ?? 'user'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-[#2A2A2A] bg-[#111111]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1A1A1A]">
              <Bell weight="light" className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div>
              <CardTitle className="text-[#E8E8E8]">Notifications</CardTitle>
              <CardDescription className="text-[#888888]">Choose what you hear about</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIFICATION_PREFERENCES.map((pref, index) => (
            <div key={pref.id}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Label htmlFor={pref.id} className="text-[#E8E8E8]">{pref.label}</Label>
                  <p className="text-xs text-[#888888] mt-0.5">{pref.description}</p>
                </div>
                <Switch
                  id={pref.id}
                  checked={preferences[pref.id]}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, [pref.id]: checked }))
                  }
                />
              </div>
              {index < NOTIFICATION_PREFERENCES.length - 1 && (
                <Separator className="mt-4 bg-[#2A2A2A]" />
              )}
            </div>
          ))}
          <p className="text-xs text-[#666666] pt-2">
            Preferences shown here are for demonstration and are not yet persisted to your account.
          </p>
        </CardContent>
      </Card>

      <Card className="glass border-[#2A2A2A] bg-[#111111]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1A1A1A]">
              <ShieldCheck weight="light" className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div>
              <CardTitle className="text-[#E8E8E8]">Security</CardTitle>
              <CardDescription className="text-[#888888]">Session and authentication</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A]">
            <div>
              <p className="text-sm text-[#E8E8E8]">Current session</p>
              <p className="text-xs text-[#888888] mt-0.5">Authenticated via secure session cookie</p>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">Active</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A]">
            <div>
              <p className="text-sm text-[#E8E8E8]">Two-factor authentication</p>
              <p className="text-xs text-[#888888] mt-0.5">Add an extra layer of security to your account</p>
            </div>
            <Badge variant="outline" className="border-[#2A2A2A] text-[#888888]">Not enabled</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-[#2A2A2A] bg-[#111111]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1A1A1A]">
              <Palette weight="light" className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div>
              <CardTitle className="text-[#E8E8E8]">Appearance</CardTitle>
              <CardDescription className="text-[#888888]">Vault Dark is the only theme, by design</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg border border-[#D4AF37]/30 bg-[#0A0A0A] flex items-center justify-between">
            <span className="text-sm text-[#E8E8E8]">Vault Dark</span>
            <Badge className="bg-[#D4AF37] text-[#0A0A0A]">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
