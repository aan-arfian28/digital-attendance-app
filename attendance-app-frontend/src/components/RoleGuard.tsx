import { useUserData } from '@/hooks/useUserData'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

interface RoleGuardProps {
  children: React.ReactNode
  adminOnly?: boolean
  userOnly?: boolean
}

export default function RoleGuard({ children, adminOnly = false, userOnly = false }: RoleGuardProps) {
  const { isAdmin, isLoading } = useUserData()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading) {
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
  }, [isAdmin, isLoading, adminOnly, userOnly, navigate])

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

  // Don't render if access is not allowed
  if (adminOnly && !isAdmin) return null
  if (userOnly && isAdmin) return null

  return <>{children}</>
}