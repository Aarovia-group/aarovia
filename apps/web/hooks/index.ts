import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store/auth.store'
import { leadApi, notificationApi, reportApi } from '@/lib/api'
import { Role } from '@/types'

// ============================================
// usePermissions - Role-based access control
// ============================================
const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 8,
  ADMIN: 7,
  SALES_MANAGER: 6,
  SALES_EXECUTIVE: 4,
  TELECALLER: 3,
  CRM_TEAM: 4,
  ACCOUNTS: 4,
  POST_SALES: 3,
}

export function usePermissions() {
  const { user } = useAuthStore()
  const role = user?.role as Role

  const hasRole = (...roles: Role[]) => roles.includes(role)

  const isAtLeast = (minRole: Role) =>
    (ROLE_HIERARCHY[role] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 0)

  return {
    role,
    isAdmin: hasRole('SUPER_ADMIN', 'ADMIN'),
    isSuperAdmin: hasRole('SUPER_ADMIN'),
    isSalesManager: hasRole('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'),
    isSalesExec: hasRole('SALES_EXECUTIVE'),
    isTelecaller: hasRole('TELECALLER'),
    isAccounts: hasRole('ACCOUNTS', 'SUPER_ADMIN', 'ADMIN'),
    isPostSales: hasRole('POST_SALES', 'SUPER_ADMIN', 'ADMIN'),
    canManageUsers: hasRole('SUPER_ADMIN', 'ADMIN'),
    canDeleteLeads: hasRole('SUPER_ADMIN', 'ADMIN'),
    canCreateBookings: hasRole('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE'),
    canManageInventory: hasRole('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'),
    canViewReports: hasRole('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'ACCOUNTS', 'CRM_TEAM'),
    canAccessSettings: hasRole('SUPER_ADMIN', 'ADMIN'),
    hasRole,
    isAtLeast,
  }
}

// ============================================
// useLeads - Lead list with filters
// ============================================
export function useLeads(params?: {
  page?: number
  limit?: number
  status?: string
  source?: string
  search?: string
  assignedToId?: string
  projectId?: string
}) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => leadApi.getAll(params),
    select: (data) => ({
      leads: data.data.data ?? [],
      meta: data.data.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 },
    }),
  })
}

// ============================================
// useLead - Single lead with full details
// ============================================
export function useLead(id: string | null) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadApi.getById(id!),
    enabled: !!id,
    select: (data) => data.data.data,
  })
}

// ============================================
// useLeadPipeline - Kanban pipeline
// ============================================
export function useLeadPipeline() {
  return useQuery({
    queryKey: ['lead-pipeline'],
    queryFn: () => leadApi.getPipeline(),
    select: (data) => data.data.data ?? [],
    refetchInterval: 30000,
  })
}

// ============================================
// useUpdateLeadStatus - Quick status mutation
// ============================================
export function useUpdateLeadStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, remarks }: { id: string; status: string; remarks?: string }) =>
      leadApi.updateStatus(id, { status, remarks }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['lead-pipeline'] })
    },
  })
}

// ============================================
// useNotifications - Unread notification count
// ============================================
export function useNotifications() {
  const { isAuthenticated } = useAuthStore()
  return useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationApi.getAll({ limit: 1 }),
    enabled: isAuthenticated,
    refetchInterval: 30000,
    select: (data) => ({
      unreadCount: data.data.meta?.unreadCount ?? 0,
    }),
  })
}

// ============================================
// useDashboardStats - Dashboard data
// ============================================
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => reportApi.getDashboard(),
    refetchInterval: 60000,
    select: (data) => data.data.data,
  })
}

// ============================================
// useDebounce - Debounce search inputs
// ============================================
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ============================================
// useLocalStorage - Persist state in localStorage
// ============================================
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error(error)
    }
  }

  return [storedValue, setValue] as const
}

// ============================================
// usePagination - Pagination state
// ============================================
export function usePagination(initialPage = 1, initialLimit = 20) {
  const [page, setPage] = useState(initialPage)
  const [limit] = useState(initialLimit)

  const reset = () => setPage(1)

  return { page, limit, setPage, reset }
}

// ============================================
// useTableFilters - Generic table filter state
// ============================================
export function useTableFilters<T extends Record<string, string>>(initial: T) {
  const [filters, setFilters] = useState<T>(initial)
  const [search, setSearch] = useState('')
  const { page, setPage, reset, limit } = usePagination()

  const updateFilter = (key: keyof T, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    reset()
  }

  const resetAll = () => {
    setFilters(initial)
    setSearch('')
    reset()
  }

  const debouncedSearch = useDebounce(search, 400)

  const activeFilterCount = Object.values(filters).filter(v => v !== '' && v !== initial[Object.keys(initial)[Object.values(initial).indexOf(v)] as keyof T]).length

  return {
    filters, search, setSearch, page, limit, setPage,
    updateFilter, resetAll, debouncedSearch, activeFilterCount,
  }
}
