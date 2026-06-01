import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const authData = localStorage.getItem('aarovia-auth')
      if (authData) {
        const parsed = JSON.parse(authData)
        if (parsed.state?.token) {
          config.headers.Authorization = `Bearer ${parsed.state.token}`
        }
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('aarovia-auth')
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)

export default api

// API modules
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/api/auth/login', data),
  register: (data: any) => api.post('/api/auth/register', data),
  getProfile: () => api.get('/api/auth/profile'),
  updateProfile: (data: any) => api.put('/api/auth/profile', data),
  changePassword: (data: any) => api.put('/api/auth/change-password', data),
}

export const leadApi = {
  getAll: (params?: any) => api.get('/api/leads', { params }),
  getById: (id: string) => api.get(`/api/leads/${id}`),
  create: (data: any) => api.post('/api/leads', data),
  update: (id: string, data: any) => api.put(`/api/leads/${id}`, data),
  delete: (id: string) => api.delete(`/api/leads/${id}`),
  updateStatus: (id: string, data: any) => api.patch(`/api/leads/${id}/status`, data),
  assign: (id: string, data: any) => api.patch(`/api/leads/${id}/assign`, data),
  addCallLog: (id: string, data: any) => api.post(`/api/leads/${id}/call-log`, data),
  addNote: (id: string, data: any) => api.post(`/api/leads/${id}/note`, data),
  getPipeline: () => api.get('/api/leads/pipeline'),
  bulkImport: (data: any) => api.post('/api/leads/bulk-import', data),
}

export const inventoryApi = {
  getAll: (params?: any) => api.get('/api/inventory', { params }),
  getById: (id: string) => api.get(`/api/inventory/${id}`),
  create: (data: any) => api.post('/api/inventory', data),
  update: (id: string, data: any) => api.put(`/api/inventory/${id}`, data),
  updateStatus: (id: string, data: any) => api.patch(`/api/inventory/${id}/status`, data),
  getHeatmap: (projectId: string) => api.get(`/api/inventory/heatmap/${projectId}`),
  delete: (id: string) => api.delete(`/api/inventory/${id}`),
}

export const quotationApi = {
  getAll: (params?: any) => api.get('/api/quotations', { params }),
  getById: (id: string) => api.get(`/api/quotations/${id}`),
  create: (data: any) => api.post('/api/quotations', data),
  update: (id: string, data: any) => api.put(`/api/quotations/${id}`, data),
  updateStatus: (id: string, data: any) => api.patch(`/api/quotations/${id}/status`, data),
  delete: (id: string) => api.delete(`/api/quotations/${id}`),
}

export const bookingApi = {
  getAll: (params?: any) => api.get('/api/bookings', { params }),
  getById: (id: string) => api.get(`/api/bookings/${id}`),
  create: (data: any) => api.post('/api/bookings', data),
  update: (id: string, data: any) => api.put(`/api/bookings/${id}`, data),
  addPayment: (id: string, data: any) => api.post(`/api/bookings/${id}/payment`, data),
}

export const customerApi = {
  getAll: (params?: any) => api.get('/api/customers', { params }),
  getById: (id: string) => api.get(`/api/customers/${id}`),
  create: (data: any) => api.post('/api/customers', data),
  update: (id: string, data: any) => api.put(`/api/customers/${id}`, data),
  verifyKyc: (id: string) => api.patch(`/api/customers/${id}/verify-kyc`, {}),
}

export const reportApi = {
  getDashboard: () => api.get('/api/reports/dashboard'),
  getMonthlyRevenue: (months?: number) => api.get('/api/reports/monthly-revenue', { params: { months } }),
  getLeadSources: () => api.get('/api/reports/lead-sources'),
  getTeamPerformance: (params?: any) => api.get('/api/reports/team-performance', { params }),
  getCollections: (params?: any) => api.get('/api/reports/collections', { params }),
  getInventory: () => api.get('/api/reports/inventory'),
}

export const emailApi = {
  sendProjectDetails: (data: any) => api.post('/api/email/send-project-details', data),
  sendQuotation: (data: any) => api.post('/api/email/send-quotation', data),
  getLogs: (params?: any) => api.get('/api/email/logs', { params }),
}

export const whatsappApi = {
  sendProjectDetails: (data: any) => api.post('/api/whatsapp/send-project-details', data),
  sendFollowup: (data: any) => api.post('/api/whatsapp/send-followup', data),
  sendPaymentReminder: (data: any) => api.post('/api/whatsapp/send-payment-reminder', data),
  getLogs: (params?: any) => api.get('/api/whatsapp/logs', { params }),
}

export const notificationApi = {
  getAll: (params?: any) => api.get('/api/notifications', { params }),
  markAsRead: (id: string) => api.patch(`/api/notifications/${id}/read`, {}),
  markAllAsRead: () => api.patch('/api/notifications/mark-all-read', {}),
}

export const projectApi = {
  getAll: (params?: any) => api.get('/api/projects', { params }),
  getById: (id: string) => api.get(`/api/projects/${id}`),
  create: (data: any) => api.post('/api/projects', data),
  update: (id: string, data: any) => api.put(`/api/projects/${id}`, data),
}
