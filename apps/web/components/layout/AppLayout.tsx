'use client'

import { useEffect } from 'react'
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
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth/login')
  }, [isAuthenticated, router])

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationApi.getAll({ isRead: false, limit: 1 }),
    refetchInterval: 30000,
    enabled: isAuthenticated,
  })

  const unreadCount = notifData?.data?.meta?.unreadCount || 0

  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      <Sidebar unreadNotifications={unreadCount} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} subtitle={subtitle} actions={actions} unreadCount={unreadCount} />
        <main className="flex-1 overflow-y-auto bg-[#0D1F38] p-5">
          {children}
        </main>
      </div>
    </div>
  )
}
