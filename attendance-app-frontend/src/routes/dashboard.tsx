import { createFileRoute, Outlet } from '@tanstack/react-router'
import DashboardLayout from '../components/DashboardLayout'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayoutRoute,
})

function DashboardLayoutRoute() {
  const handleLogout = () => {
    console.log('Logout clicked')
    // TODO: Clear auth tokens/session & Redirect to login page
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