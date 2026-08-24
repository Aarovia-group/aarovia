'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { authApi } from '@/lib/api'
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
      { href: '/leads', icon: Users, label: 'Lead Management' },
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
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // proceed with local cleanup even if server logout fails
    }
    clearAuth()
    router.push('/auth/login')
  }

  return (
    <aside className="w-[220px] min-w-[220px] h-screen bg-white border-r border-[#d8e0e8] flex flex-col overflow-hidden">
      {/* Logo - fixed top */}
      <div className="px-4 py-4 border-b border-[#d8e0e8] flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C9A84C] to-[#E8C96A] flex items-center justify-center flex-shrink-0">
            <span className="font-bold text-[#0A1628] text-sm">A</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-[#172033] leading-tight">Aarovia</div>
            <div className="text-[9px] text-[#64748b] uppercase tracking-[2px]">Real Estates</div>
          </div>
        </Link>
      </div>

      {/* Nav - scrollable */}
      <nav
        className="flex-1 overflow-y-scroll py-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #ffffff' }}
      >
        {navItems.map((section) => (
          <div key={section.label} className="mb-1">
            <p className="text-[9px] font-medium uppercase tracking-[1.5px] text-[#64748b] px-4 py-2">
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
                      ? 'bg-[#fff7e3] text-[#9a6812] border-l-[#b27a16] font-medium'
                      : 'text-[#475569] border-l-transparent hover:bg-[#fffaf0] hover:text-[#9a6812] hover:border-l-[#b27a16]/30'
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
      <div className="border-t border-[#d8e0e8] p-3 flex-shrink-0 bg-white">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#E8C96A] flex items-center justify-center flex-shrink-0">
            <span className="text-[#0A1628] text-xs font-bold">
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-[#172033] truncate">{user?.name}</div>
            <div className="text-[10px] text-[#64748b] truncate">
              {user?.role?.replace(/_/g, ' ')}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-[#64748b] hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
