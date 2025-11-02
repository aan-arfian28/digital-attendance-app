import { useUserData } from '@/hooks/useUserData'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

interface RoleGuardProps {
  children: React.ReactNode
  adminOnly?: boolean
  userOnly?: boolean
}

export default function RoleGuard({ children, adminOnly = false, userOnly = false }: RoleGuardProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { isAdmin, user, isLoading: userLoading } = useUserData()
  const navigate = useNavigate()
  const previousAuthState = useRef(isAuthenticated)
  const previousUserState = useRef(user)

  const isLoading = authLoading || userLoading

  useEffect(() => {
    // Detect if user data is being cleared (logout in progress)
    const isLogoutInProgress = 
      previousAuthState.current === true && 
      isAuthenticated === false ||
      previousUserState.current !== null && 
      user === null

    // Update refs for next comparison
    previousAuthState.current = isAuthenticated
    previousUserState.current = user

    // Don't perform role checks if logout is in progress
    if (isLogoutInProgress) {
      return
    }

    // Only check role permissions if user is authenticated and not during logout
    if (!isLoading && isAuthenticated && user) {
      // Admin trying to access user-only page
      if (userOnly && isAdmin) {
        navigate({ to: '/404' })
        return
      }

      // Non-admin trying to access admin-only page
      if (adminOnly && !isAdmin) {
        navigate({ to: '/404' })
        return
      }
    }
    // If not authenticated, let AuthGuard handle the redirect to login
  }, [isAdmin, isLoading, isAuthenticated, user, adminOnly, userOnly, navigate])

  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#428bff] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // If not authenticated, let AuthGuard handle the redirect
  if (!isAuthenticated) {
    return null
  }

  // Don't render if access is not allowed (only check this if authenticated and not during logout)
  if (user && adminOnly && !isAdmin) return null
  if (user && userOnly && isAdmin) return null

  return <>{children}</>
}