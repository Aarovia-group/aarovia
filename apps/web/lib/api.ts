import axios from 'axios'

const productionApiBase = 'https://aarovia-api.vercel.app'
const isBrowser = typeof window !== 'undefined'
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || process.env.API_URL || ''
const browserApiBase = rawApiUrl
  ? `${rawApiUrl.replace(/\/+$/, '').replace(/\/api$/, '')}/api`
  : (process.env.NODE_ENV === 'production' ? `${productionApiBase}/api` : '/api')

const apiBase = isBrowser
  ? browserApiBase
  : rawApiUrl
    ? rawApiUrl.replace(/\/+$/, '').replace(/\/api$/, '')
    : (process.env.NODE_ENV === 'production' ? productionApiBase : 'http://localhost:5000')

const api = axios.create({
  baseURL: isBrowser
    ? '/api'
    : `${apiBase.replace(/\/+$/, '')}/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []
let refreshRejectors: Array<(reason?: any) => void> = []

const clearClientAuth = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('crm_token')
    localStorage.removeItem('crm_user')
    localStorage.removeItem('crm_auth')
    localStorage.removeItem('aarovia-auth')
  }
}

const redirectToLogin = () => {
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/login'
  }
}

const saveAuthToStorage = (user: any, token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('crm_token', token)
    localStorage.setItem('crm_user', JSON.stringify(user))
    localStorage.setItem('crm_auth', 'true')
    localStorage.setItem('aarovia-auth', 'true')
  }
}

const refreshAuth = async (): Promise<string> => {
  const response = await api.post('/auth/refresh-token')
  const data = response.data?.data
  if (!data?.token || !data?.user) {
    throw new Error('Refresh failed')
  }
  saveAuthToStorage(data.user, data.token)
  return data.token
}

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('crm_token')
      if (token) {
        config.headers = {
          ...(config.headers as any),
          Authorization: `Bearer ${token}`,
        } as any
      }
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const requestUrl = error.config?.url || ''
    const originalRequest = error.config

    const isRefreshRequest = requestUrl.includes('/auth/refresh-token')
    const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register')

    if (status === 401 && !isAuthRequest && !isRefreshRequest) {
      if (!originalRequest || (originalRequest as any)._retry) {
        clearClientAuth()
        redirectToLogin()
        return Promise.reject(error)
      }

      ;(originalRequest as any)._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshSubscribers.push((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            resolve(api(originalRequest))
          })
          refreshRejectors.push(reject)
        })
      }

      isRefreshing = true
      try {
        const newToken = await refreshAuth()
        refreshSubscribers.forEach((callback) => callback(newToken))
        refreshSubscribers = []
        refreshRejectors = []

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }

        return api(originalRequest)
      } catch (refreshError) {
        refreshRejectors.forEach((reject) => reject(refreshError))
        refreshRejectors = []
        clearClientAuth()
        redirectToLogin()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (isRefreshRequest || isAuthRequest) {
      return Promise.reject(error)
    }

    return Promise.reject(error)
  },
)

export const authApi = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  refreshToken: () => api.post('/auth/refresh-token'),
  logout: () => api.post('/auth/logout'),
}

export const settingsApi = {
  getAll: () => api.get('/settings'),
}

export const leadApi = {
  getAll: (params?: any) => api.get('/leads', { params }),
  getById: (id: string) => api.get(`/leads/${id}`),
  getPipeline: () => api.get('/leads/pipeline'),
  create: (data: any) => api.post('/leads', data),
  update: (id: string, data: any) => api.put(`/leads/${id}`, data),
  delete: (id: string) => api.delete(`/leads/${id}`),
  updateStatus: (id: string, data: any) => api.patch(`/leads/${id}/status`, data),
  assign: (id: string, data: any) => api.patch(`/leads/${id}/assign`, data),
  addCallLog: (id: string, data: any) => api.post(`/leads/${id}/call-log`, data),
  addNote: (id: string, data: any) => api.post(`/leads/${id}/note`, data),
  scheduleSiteVisit: (id: string, data: any) => api.post(`/leads/${id}/site-visit`, data),
}

export const notificationApi = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/mark-all-read'),
}

export const reportApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  getMonthlyRevenue: (months: number) => api.get('/reports/monthly-revenue', { params: { months } }),
  getLeadSources: () => api.get('/reports/lead-sources'),
  getLeadStatus: () => api.get('/reports/lead-status'),
  getTeamPerformance: (params?: any) => api.get('/reports/team-performance', { params }),
  getCollections: (params?: any) => api.get('/reports/collections', { params }),
  getInventory: (params?: any) => api.get('/reports/inventory', { params }),
}

export const customerApi = {
  getAll: (params?: any) => api.get('/customers', { params }),
  getById: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  verifyKyc: (id: string) => api.patch(`/customers/${id}/verify-kyc`),
}

export const inventoryApi = {
  getAll: (params?: any) => api.get('/inventory', { params }),
  getById: (id: string) => api.get(`/inventory/${id}`),
  create: (data: any) => api.post('/inventory', data),
  update: (id: string, data: any) => api.put(`/inventory/${id}`, data),
  updateStatus: (id: string, data: any) => api.patch(`/inventory/${id}/status`, data),
  import: (data: any) => api.post('/inventory/import', data),
  getHeatmap: (projectId: string) => api.get(`/inventory/heatmap/${projectId}`),
  delete: (id: string) => api.delete(`/inventory/${id}`),
}

export const quotationApi = {
  getAll: (params?: any) => api.get('/quotations', { params }),
  getById: (id: string) => api.get(`/quotations/${id}`),
  create: (data: any) => api.post('/quotations', data),
  update: (id: string, data: any) => api.put(`/quotations/${id}`, data),
  updateStatus: (id: string, data: any) => api.patch(`/quotations/${id}/status`, data),
  delete: (id: string) => api.delete(`/quotations/${id}`),
}

export const bookingApi = {
  getAll: (params?: any) => api.get('/bookings', { params }),
  getById: (id: string) => api.get(`/bookings/${id}`),
  create: (data: any) => api.post('/bookings', data),
  update: (id: string, data: any) => api.put(`/bookings/${id}`, data),
  addPayment: (id: string, data: any) => api.post(`/bookings/${id}/payment`, data),
}

export const projectApi = {
  getAll: (params?: any) => api.get('/projects', { params }),
  getById: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
}

export const whatsappApi = {
  sendProjectDetails: (data: any) => api.post('/whatsapp/send-project-details', data),
  sendFollowup: (data: any) => api.post('/whatsapp/send-followup', data),
  sendPaymentReminder: (data: any) => api.post('/whatsapp/send-payment-reminder', data),
  getLogs: (params?: any) => api.get('/whatsapp/logs', { params }),
}

export const emailApi = {
  sendProjectDetails: (data: any) => api.post('/email/send-project-details', data),
  sendQuotation: (data: any) => api.post('/email/send-quotation', data),
  getLogs: (params?: any) => api.get('/email/logs', { params }),
}

export const uploadApi = {
  uploadDocument: (file: File, category = 'BROCHURE') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)
    return api.post('/upload/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export default api
