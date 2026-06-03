import { create } from 'zustand'

interface User {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
  phone?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: (user: User, token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_token', token)
      localStorage.setItem('crm_user', JSON.stringify(user))
      localStorage.setItem('crm_auth', 'true')
      localStorage.setItem('aarovia-auth', 'true')
    }
    set({ user, token, isAuthenticated: true })
  },
  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('crm_token')
      localStorage.removeItem('crm_user')
      localStorage.removeItem('crm_auth')
      localStorage.removeItem('aarovia-auth')
    }
    set({ user: null, token: null, isAuthenticated: false })
  },
  updateUser: (userData: Partial<User>) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    })),
}))
