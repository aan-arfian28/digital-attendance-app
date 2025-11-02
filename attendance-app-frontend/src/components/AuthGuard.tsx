import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useCallback } from 'react'
import { tokenStorage, userStorage } from '@/services/auth'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  // Function to check token expiration
  const checkTokenExpiration = useCallback(() => {
    const token = tokenStorage.get()
    
    if (!token) {
      return false
    }

    try {
      // Decode JWT token to check expiration
      const payload = token.split('.')[1]
      const decoded = JSON.parse(atob(payload))
      
      // Check if token has expired (exp is in seconds)
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        console.log('Token has expired')
        // Clear storage
        tokenStorage.remove()
        userStorage.remove()
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error checking token expiration:', error)
      // If we can't decode the token, consider it invalid
      tokenStorage.remove()
      userStorage.remove()
      return false
    }
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({
        to: '/login',
        replace: true
      })
    }
  }, [isAuthenticated, isLoading, navigate])

  // Check token expiration periodically
  useEffect(() => {
    // Check immediately
    if (!checkTokenExpiration() && !isLoading) {
      navigate({
        to: '/login',
        replace: true,
      })
      return
    }

    // Check every minute
    const intervalId = setInterval(() => {
      if (!checkTokenExpiration()) {
        navigate({
          to: '/login',
          replace: true,
        })
      }
    }, 60000) // 60 seconds

    return () => clearInterval(intervalId)
  }, [checkTokenExpiration, navigate, isLoading])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#428bff] text-white font-bold text-xl mb-4 animate-pulse">
              T
            </div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )
    )
  }

  // Don't render children if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}