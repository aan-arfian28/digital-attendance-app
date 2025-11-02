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
          // Verify stored user matches current token
          const decodedToken = decodeJWT(token)
          if (decodedToken && storedUser.ID === decodedToken.id) {
            // Use stored user data if it matches the token
            console.log('📦 Using cached user data:', storedUser.Username)
            setUserState(storedUser)
          } else {
            // Token and stored user don't match - fetch fresh data
            console.log('⚠️ Token/user mismatch, fetching fresh user data...')
            await fetchUserProfile(token)
          }
        } else if (token) {
          // If we have token but no user data, fetch it
          console.log('🔄 Token found but no user data, fetching...')
          await fetchUserProfile(token)
        } else {
          // No token, no user
          console.log('👤 No authentication found')
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

    const fetchUserProfile = async (token: string) => {
      try {
        // First try the non-admin profile endpoint
        const userProfile = await authService.getMyProfile()
        console.log('✅ User profile fetched:', userProfile.Username)
        setUserState(userProfile)
        userStorage.set(userProfile)
      } catch (error) {
        // If that fails, try the admin endpoint (for backward compatibility)
        const decodedToken = decodeJWT(token)
        if (decodedToken) {
          const userProfile = await authService.getUserProfile(decodedToken.id)
          console.log('✅ User profile fetched (admin):', userProfile.Username)
          setUserState(userProfile)
          userStorage.set(userProfile)
        } else {
          throw error
        }
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
      console.log('🔄 Refreshing user data...')
      // First try the non-admin profile endpoint
      try {
        const userProfile = await authService.getMyProfile()
        console.log('✅ User data refreshed:', userProfile.Username)
        setUser(userProfile)
      } catch (error) {
        // If that fails, try the admin endpoint (for backward compatibility)
        const decodedToken = decodeJWT(token)
        if (decodedToken) {
          const userProfile = await authService.getUserProfile(decodedToken.id)
          console.log('✅ User data refreshed (admin):', userProfile.Username)
          setUser(userProfile)
        } else {
          throw error
        }
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
      clearUser()
    }
  }

  const clearUser = () => {
    console.log('🧹 Clearing user data from context and storage')
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