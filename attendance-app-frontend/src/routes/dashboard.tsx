import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import DashboardLayout from '../components/DashboardLayout'
import AuthGuard from '../components/AuthGuard'
import { useLogout } from '../hooks/useAuth'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayoutRoute,
})

function DashboardLayoutRoute() {
  const navigate = useNavigate()
  const logoutMutation = useLogout()

  const handleLogout = () => {
    logoutMutation.mutate()
  }

  const handleProfile = () => {
    navigate({ to: '/dashboard/profile' as any })
  }

  return (
    <AuthGuard>
      <DashboardLayout onLogout={handleLogout} onProfile={handleProfile}>
        <Outlet />
      </DashboardLayout>
    </AuthGuard>
  )
}
