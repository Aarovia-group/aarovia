'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth.store'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useQuery } from '@tanstack/react-query'
import { authApi, notificationApi } from '@/lib/api'

interface AppLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  const { isAuthenticated, setAuth, clearAuth } = useAuthStore()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  const decodeTokenExpiry = (token: string) => {
    try {
      const [, payload] = token.split('.')
      if (!payload) return null
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
      return decoded.exp ? decoded.exp * 1000 : null
    } catch {
      return null
    }
  }

  const isTokenExpiredOrNearExpiry = (token: string, thresholdMs = 120000) => {
    const expiry = decodeTokenExpiry(token)
    if (!expiry) return true
    return Date.now() >= expiry - thresholdMs
  }

  useEffect(() => {
    const clearLocalAuth = () => {
      localStorage.removeItem('crm_token')
      localStorage.removeItem('crm_user')
      localStorage.removeItem('crm_auth')
      localStorage.removeItem('aarovia-auth')
    }

    const restoreAuth = async () => {
      const token = localStorage.getItem('crm_token')
      const userStr = localStorage.getItem('crm_user')

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr)
          if (isTokenExpiredOrNearExpiry(token)) {
            try {
              const response = await authApi.refreshToken()
              const data = response.data?.data
              if (data?.token && data?.user) {
                setAuth(data.user, data.token)
                setReady(true)
                return
              }
            } catch {
              clearAuth()
              clearLocalAuth()
            }
          } else {
            setAuth(user, token)
            setReady(true)
            return
          }
        } catch {
          clearAuth()
          clearLocalAuth()
        }
      }

      try {
        const response = await authApi.refreshToken()
        const data = response.data?.data
        if (data?.token && data?.user) {
          setAuth(data.user, data.token)
          setReady(true)
          return
        }
      } catch {
        clearAuth()
        clearLocalAuth()
      }

      setReady(true)
      router.push('/auth/login')
    }

    restoreAuth()
  }, [setAuth, clearAuth, router])

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [ready, isAuthenticated, router])

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
