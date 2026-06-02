api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // Try Zustand store first
      try {
        const authData = localStorage.getItem('aarovia-auth')
        if (authData) {
          const parsed = JSON.parse(authData)
          if (parsed.state?.token) {
            config.headers.Authorization = `Bearer ${parsed.state.token}`
            return config
          }
        }
      } catch {}

      // Fallback to direct token
      const token = localStorage.getItem('crm_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)