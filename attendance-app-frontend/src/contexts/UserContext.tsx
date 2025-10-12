import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { userStorage, tokenStorage, authService, decodeJWT } from '@/services/auth'
import type { UserProfile } from '@/types/auth'

interface UserContextType {
  user: UserProfile | null
  setUser: (user: UserProfile | null) => void
  isLoading: boolean
  refreshUser: () => Promise<void>
  clearUser: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUserState] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize user data on mount
  useEffect(() => {
    const initializeUser = async () => {
      setIsLoading(true)
      
      try {
        const token = tokenStorage.get()
        const storedUser = userStorage.get()

        if (token && storedUser) {
          // Use stored user data if available
          setUserState(storedUser)
        } else if (token) {
          // If we have token but no user data, try to fetch it
          const decodedToken = decodeJWT(token)
          if (decodedToken) {
            const userProfile = await authService.getUserProfile(decodedToken.id, token)
            setUserState(userProfile)
            userStorage.set(userProfile)
          }
        }
      } catch (error) {
        console.error('Failed to initialize user:', error)
        // Clear invalid data
        tokenStorage.remove()
        userStorage.remove()
        setUserState(null)
      } finally {
        setIsLoading(false)
      }
    }

    initializeUser()
  }, [])

  const setUser = (userData: UserProfile | null) => {
    setUserState(userData)
    if (userData) {
      userStorage.set(userData)
    } else {
      userStorage.remove()
    }
  }

  const refreshUser = async () => {
    const token = tokenStorage.get()
    if (!token) {
      clearUser()
      return
    }

    try {
      const decodedToken = decodeJWT(token)
      if (decodedToken) {
        const userProfile = await authService.getUserProfile(decodedToken.id, token)
        setUser(userProfile)
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
      clearUser()
    }
  }

  const clearUser = () => {
    setUserState(null)
    userStorage.remove()
  }

  const value: UserContextType = {
    user,
    setUser,
    isLoading,
    refreshUser,
    clearUser,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}