'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth.store'
import { getModuleForPath, hasModuleAccess } from '@/lib/permissions'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useQuery } from '@tanstack/react-query'
import { authApi, notificationApi, settingsApi } from '@/lib/api'

interface AppLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  const { isAuthenticated, setAuth, clearAuth, user } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [logoUrl, setLogoUrl] = useState('/aarovia-mark.png')

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

  useEffect(() => {
    if (!ready || !isAuthenticated) return
    const applyBranding = (branding?: { accentColor?: string; accent_color?: string; logoUrl?: string; logo_url?: string }) => {
      const color = branding?.accentColor || branding?.accent_color
      if (color && /^#[0-9a-f]{6}$/i.test(color)) document.documentElement.style.setProperty('--brand-accent', color)
      setLogoUrl(branding?.logoUrl || branding?.logo_url || '/aarovia-mark.png')
    }
    settingsApi.getAll().then(response => applyBranding(response.data?.data)).catch(() => undefined)
    const handleBrandingUpdate = (event: Event) => applyBranding((event as CustomEvent).detail)
    window.addEventListener('branding-updated', handleBrandingUpdate)
    return () => window.removeEventListener('branding-updated', handleBrandingUpdate)
  }, [ready, isAuthenticated])

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationApi.getAll({ isRead: false, limit: 1 }),
    refetchInterval: 30000,
    enabled: isAuthenticated && ready,
  })

  const unreadCount = notifData?.data?.meta?.unreadCount || 0
  const requiredModule = getModuleForPath(pathname)
  const canAccessCurrentPage = !requiredModule || hasModuleAccess(user?.role, requiredModule)

  if (!ready || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Image src="/aarovia-mark.png" alt="Aarovia logo" width={40} height={40} className="w-10 h-10 object-contain" />
          <p className="text-[#C9A84C] text-sm animate-pulse">Loading...</p>
        </div>
      </div>
    )
  }

  if (!canAccessCurrentPage) {
    return (
      <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-[#172033]">Access restricted</h1>
          <p className="mt-2 text-sm text-[#64748b]">Your role does not have permission to open this CRM module. Contact an administrator if you need access.</p>
          <button
            onClick={() => router.replace('/dashboard')}
            className="mt-5 rounded-lg bg-[#172033] px-4 py-2 text-sm font-medium text-white"
          >
            Return to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen crm-shell overflow-hidden">
          <Sidebar unreadNotifications={unreadCount} logoUrl={logoUrl} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          title={title}
          subtitle={subtitle}
          actions={actions}
          unreadCount={unreadCount}
        />
        <main className="flex-1 overflow-y-auto p-5 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
