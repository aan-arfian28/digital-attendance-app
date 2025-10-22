import { useUserData } from '@/hooks/useUserData'
import { useHasSubordinates } from '@/hooks/useSubordinates'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { Shield, Users } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

interface SubordinateGuardProps {
  children: React.ReactNode
}

export default function SubordinateGuard({ children }: SubordinateGuardProps) {
  const { isAdmin, userId, roleName } = useUserData()
  const { hasSubordinates, isLoading, error, subordinatesCount } = useHasSubordinates()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const previousUserIdRef = useRef(userId)

  // Invalidate subordinates query when user changes
  useEffect(() => {
    if (previousUserIdRef.current !== userId) {
      queryClient.invalidateQueries({ queryKey: ['subordinates'] })
      previousUserIdRef.current = userId
    }
  }, [userId, queryClient])

  useEffect(() => {
    if (!isLoading && !error) {
      // Admin users shouldn't access this page (already handled by RoleGuard)
      if (isAdmin) {
        navigate({ to: '/404' })
        return
      }
      // Let the component render the access denied message for users without subordinates
      // No automatic redirect to dashboard
    }
  }, [isAdmin, isLoading, error, navigate])

  // Show loading state while checking subordinates
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#428bff] mx-auto mb-4"></div>
            <p className="text-gray-600">Checking permissions...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if failed to load subordinates
  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Error</h3>
            <p className="text-gray-600">Failed to verify permissions. Please try again.</p>
          </div>
        </div>
      </div>
    )
  }

  // Show access denied for users without subordinates
  if (!hasSubordinates) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-600 mb-4">
              You need to have subordinates to access the validation page.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Current user role: {roleName || 'Unknown'} | Subordinates count: {subordinatesCount}
            </p>
            <button
              onClick={() => navigate({ to: '/dashboard' })}
              className="px-4 py-2 bg-[#428bff] text-white rounded-sm hover:bg-[#357abd] transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}