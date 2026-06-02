'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth.store'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useQuery } from '@tanstack/react-query'
import { notificationApi } from '@/lib/api'

interface AppLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  const { isAuthenticated, setAuth } = useAuthStore()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Restore auth from localStorage on every page load
    const token = localStorage.getItem('crm_token')
    const userStr = localStorage.getItem('crm_user')
    const isAuth = localStorage.getItem('crm_auth')

    if (token && userStr && isAuth === 'true') {
      try {
        const user = JSON.parse(userStr)
        setAuth(user, token)
        setReady(true)
      } catch {
        localStorage.removeItem('crm_token')
        localStorage.removeItem('crm_user')
        localStorage.removeItem('crm_auth')
        router.push('/auth/login')
      }
    } else {
      router.push('/auth/login')
    }
  }, [])

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [ready, isAuthenticated])

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationApi.getAll({ isRead: false, limit: 1 }),
    refetchInterval: 30000,
    enabled: isAuthenticated && ready,
  })

  const unreadCount = notifData?.data?.meta?.unreadCount || 0

  if (!ready || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#E8C96A] flex items-center justify-center">
            <span className="font-bold text-[#0A1628] text-lg">A</span>
          </div>
          <p className="text-[#C9A84C] text-sm animate-pulse">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      <Sidebar unreadNotifications={unreadCount} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          title={title}
          subtitle={subtitle}
          actions={actions}
          unreadCount={unreadCount}
        />
        <main className="flex-1 overflow-y-auto bg-[#0D1F38] p-5">
          {children}
        </main>
      </div>
    </div>
  )
}