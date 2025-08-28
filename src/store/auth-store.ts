import { create } from 'zustand'

interface AuthState {
  user: any | null
  isAuthenticated: boolean
  isInitialized: boolean
  setUser: (user: any | null) => void
  setIsAuthenticated: (isAuthenticated: boolean) => void
  setIsInitialized: (isInitialized: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  setUser: (user) => set({ user }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setIsInitialized: (isInitialized) => set({ isInitialized })
})) 
