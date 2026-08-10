import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as SecureStore from 'expo-secure-store'
import { login as loginRequest, type CustomerSession } from '../api/auth'

const STORAGE_KEY = 'gtn.customerSession'

interface AuthContextValue {
  session: CustomerSession | null
  isLoading: boolean
  error: string | null
  login: (customerNumber: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CustomerSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((raw) => {
        if (raw) setSession(JSON.parse(raw))
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (customerNumber: string) => {
    setError(null)
    setIsLoading(true)
    try {
      const s = await loginRequest(customerNumber.trim())
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(s))
      setSession(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
      throw e
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
