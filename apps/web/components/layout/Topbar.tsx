'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Search, Plus, Download, Send, Moon, Sun, ChevronDown, Settings, User, LogOut } from 'lucide-react'
import { useAuthStore } from '@/lib/store/auth.store'
import { cn } from '@/lib/utils'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  unreadCount?: number
}

export function Topbar({ title, subtitle, actions, unreadCount = 0 }: TopbarProps) {
  const { user, clearAuth } = useAuthStore()
  const [profileOpen, setProfileOpen] = useState(false)

  const handleLogout = () => {
    clearAuth()
    window.location.href = '/auth/login'
  }

  return (
    <header className="h-14 bg-navy-mid border-b border-navy-border flex items-center px-5 gap-3 flex-shrink-0 z-10">
      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-base font-medium text-white leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-[11px] text-slate truncate">{subtitle}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {actions}

        {/* Notifications */}
        <Link href="/notifications" className="relative p-2 rounded-lg text-slate hover:text-gold hover:bg-gold/10 transition-colors">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </Link>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-gold/10 transition-colors"
          >
            <div className="w-7 h-7 rounded-full gold-gradient flex items-center justify-center flex-shrink-0">
              <span className="text-navy text-[10px] font-bold">
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <span className="text-xs text-slate-light hidden sm:block max-w-[100px] truncate">{user?.name}</span>
            <ChevronDown className="w-3 h-3 text-slate" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-10 z-20 w-48 bg-navy-mid border border-navy-border rounded-lg shadow-xl overflow-hidden">
                <div className="px-3 py-2.5 border-b border-navy-border">
                  <p className="text-xs font-medium text-white truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate truncate">{user?.email}</p>
                </div>
                <div className="py-1">
                  <Link href="/settings/profile" onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-light hover:text-white hover:bg-navy-light transition-colors">
                    <User className="w-3.5 h-3.5" /> My Profile
                  </Link>
                  <Link href="/settings" onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-light hover:text-white hover:bg-navy-light transition-colors">
                    <Settings className="w-3.5 h-3.5" /> Settings
                  </Link>
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
