import { createFileRoute, Outlet } from '@tanstack/react-router'
import DashboardLayout from '../components/DashboardLayout'
import { useLogout } from '../hooks/useAuth'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayoutRoute,
})

function DashboardLayoutRoute() {
  const logoutMutation = useLogout()

  const handleLogout = () => {
    logoutMutation.mutate()
  }

  const handleProfile = () => {
    console.log('Profile clicked')
    // TODO: Implement profile logic here
  }

  return (
    <DashboardLayout
      userName="Admin User"
      onLogout={handleLogout}
      onProfile={handleProfile}
    >
      <Outlet />
    </DashboardLayout>
  )
}