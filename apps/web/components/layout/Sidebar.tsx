'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/store/auth.store'
import {
  LayoutDashboard, Users, UserCheck, Building2, FileText,
  Calendar, BookOpen, Receipt, Coins, ClipboardList,
  Mail, MessageSquare, BarChart3, Bell, Settings,
  UsersRound, Shield, LogOut, ChevronRight, Home
} from 'lucide-react'

const navItems: any = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/leads', icon: Users, label: 'Lead Management', badge: 'leads' },
      { href: '/customers', icon: UserCheck, label: 'Customers' },
      { href: '/inventory', icon: Building2, label: 'Inventory' },
      { href: '/quotations', icon: FileText, label: 'Quotations', badge: 'quotations' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/bookings', icon: BookOpen, label: 'Bookings' },
      { href: '/invoices', icon: Receipt, label: 'Invoices' },
      { href: '/collections', icon: Coins, label: 'Collections' },
      { href: '/post-sales', icon: ClipboardList, label: 'Post Sales' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { href: '/email', icon: Mail, label: 'Email Config' },
      { href: '/whatsapp', icon: MessageSquare, label: 'WhatsApp' },
      { href: '/reports', icon: BarChart3, label: 'Reports' },
      { href: '/notifications', icon: Bell, label: 'Notifications', badge: 'notifications' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/team', icon: UsersRound, label: 'Team' },
      { href: '/settings', icon: Settings, label: 'Settings' },
    ],
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
]

interface SidebarProps {
  unreadNotifications?: number
  pendingQuotations?: number
  newLeads?: number
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({
  unreadNotifications = 0,
  pendingQuotations = 0,
  newLeads = 0,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname()
  const { user, clearAuth } = useAuthStore()

  const getBadgeCount = (badge: string) => {
    switch (badge) {
      case 'notifications': return unreadNotifications
      case 'quotations': return pendingQuotations
      case 'leads': return newLeads
      default: return 0
    }
  }

  const handleLogout = () => {
    clearAuth()
    window.location.href = '/auth/login'
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-20 bg-black/40 transition-opacity duration-200 md:hidden',
          mobileOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        )}
        onClick={onMobileClose}
      />
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 transform w-64 bg-navy-mid border-r border-navy-border flex flex-col h-[100vh] transition-transform duration-200 md:static md:translate-x-0 md:w-[220px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="px-4 py-4 border-b border-navy-border flex items-center justify-between gap-3 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-navy text-sm">A</span>
            </div>
            <div>
              <div className="font-display text-sm font-semibold text-gold-light leading-tight">Aarovia</div>
              <div className="text-[9px] text-slate uppercase tracking-[2px]">Real Estates</div>
            </div>
          </Link>
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="md:hidden p-2 rounded-lg text-slate hover:text-gold hover:bg-gold/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto scrollbar-hide">
        {navItems.map((section: any) => {
          if (section.roles && !section.roles.includes(user?.role || '')) return null
          return (
            <div key={section.label} className="mb-1">
              <p className="text-[9px] font-medium uppercase tracking-[1.5px] text-slate px-4 py-2">{section.label}</p>
              {section.items.map((item: any) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const badgeCount = item.badge ? getBadgeCount(item.badge) : 0
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 px-4 py-2 text-[12.5px] border-l-2 transition-all duration-150',
                      isActive
                        ? 'bg-gold/10 text-gold border-l-gold font-medium'
                        : 'text-slate-light border-l-transparent hover:bg-gold/5 hover:text-gold-light hover:border-l-gold/30'
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badgeCount > 0 && (
                      <span className={cn(
                        'text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0',
                        item.badge === 'notifications' ? 'bg-red-500 text-white' : 'bg-gold text-navy'
                      )}>
                        {badgeCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* User profile */}
      <div className="border-t border-navy-border p-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center flex-shrink-0">
            <span className="text-navy text-xs font-bold">
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{user?.name}</div>
            <div className="text-[10px] text-slate truncate">
              {user?.role?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-slate hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
    </>
  )
}
