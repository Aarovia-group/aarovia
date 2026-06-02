'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/store/auth.store'
import {
  LayoutDashboard, Users, UserCheck, Building2, FileText,
  BookOpen, Receipt, Coins, ClipboardList,
  Mail, MessageSquare, BarChart3, Bell, Settings,
  UsersRound, LogOut
} from 'lucide-react'

const navItems = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/leads', icon: Users, label: 'Lead Management', badge: 'notifications' },
      { href: '/customers', icon: UserCheck, label: 'Customers' },
      { href: '/inventory', icon: Building2, label: 'Inventory' },
      { href: '/quotations', icon: FileText, label: 'Quotations' },
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
      { href: '/notifications', icon: Bell, label: 'Notifications', badge: 'notif' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/team', icon: UsersRound, label: 'Team' },
      { href: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

interface SidebarProps {
  unreadNotifications?: number
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ unreadNotifications = 0, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, clearAuth } = useAuthStore()

  const handleLogout = () => {
    clearAuth()
    window.location.href = '/auth/login'
  }

  return (
    <aside
      className="w-[220px] min-w-[220px] bg-[#12243E] border-r border-[#2A4070] flex flex-col overflow-hidden"
      style={{ height: '100vh' }}
    >
      {/* Logo - fixed top */}
      <div className="px-4 py-4 border-b border-[#2A4070] flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C9A84C] to-[#E8C96A] flex items-center justify-center flex-shrink-0">
            <span className="font-bold text-[#0A1628] text-sm">A</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-[#E8C96A] leading-tight">Aarovia</div>
            <div className="text-[9px] text-[#8BA3C4] uppercase tracking-[2px]">Real Estates</div>
          </div>
        </Link>
      </div>

      {/* Nav - scrollable */}
      <nav
        className="flex-1 overflow-y-scroll py-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A4070 #12243E' }}
      >
        {navItems.map((section) => (
          <div key={section.label} className="mb-1">
            <p className="text-[9px] font-medium uppercase tracking-[1.5px] text-[#8BA3C4] px-4 py-2">
              {section.label}
            </p>
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const showBadge = item.badge === 'notif' && unreadNotifications > 0
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-2 text-[12.5px] border-l-2 transition-all duration-150',
                    isActive
                      ? 'bg-[#C9A84C]/10 text-[#C9A84C] border-l-[#C9A84C] font-medium'
                      : 'text-[#B8CAE0] border-l-transparent hover:bg-[#C9A84C]/5 hover:text-[#E8C96A] hover:border-l-[#C9A84C]/30'
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {showBadge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white flex-shrink-0">
                      {unreadNotifications}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User profile - fixed bottom */}
      <div className="border-t border-[#2A4070] p-3 flex-shrink-0 bg-[#12243E]">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#E8C96A] flex items-center justify-center flex-shrink-0">
            <span className="text-[#0A1628] text-xs font-bold">
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{user?.name}</div>
            <div className="text-[10px] text-[#8BA3C4] truncate">
              {user?.role?.replace(/_/g, ' ')}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-[#8BA3C4] hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
