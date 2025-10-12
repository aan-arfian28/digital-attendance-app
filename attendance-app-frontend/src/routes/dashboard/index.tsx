import { createFileRoute, Link } from '@tanstack/react-router'
import { useUserData } from '@/hooks/useUserData'
import { Users, Clock, CheckCircle, User } from 'lucide-react'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardHome,
})

function DashboardHome() {
  const { displayName, roleName, isAdmin, canManageUsers } = useUserData()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {displayName}! You are logged in as <span className="font-medium capitalize">{roleName}</span>
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {canManageUsers && (
          <div className="p-6 border border-gray-300 bg-white rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Total Users</h3>
              <Users className="h-5 w-5 text-[#428bff]" />
            </div>
            <p className="text-2xl font-bold text-[#428bff]">150</p>
            <p className="text-sm text-gray-600 mt-1">Active system users</p>
          </div>
        )}
        
        <div className="p-6 border border-gray-300 bg-white rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Today's Attendance</h3>
            <Clock className="h-5 w-5 text-[#428bff]" />
          </div>
          <p className="text-2xl font-bold text-[#428bff]">142</p>
          <p className="text-sm text-gray-600 mt-1">Checked in today</p>
        </div>
        
        {(isAdmin || canManageUsers) && (
          <div className="p-6 border border-gray-300 bg-white rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Pending Validations</h3>
              <CheckCircle className="h-5 w-5 text-[#428bff]" />
            </div>
            <p className="text-2xl font-bold text-[#428bff]">8</p>
            <p className="text-sm text-gray-600 mt-1">Awaiting approval</p>
          </div>
        )}

        <div className="p-6 border border-gray-300 bg-white rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Your Profile</h3>
            <User className="h-5 w-5 text-[#428bff]" />
          </div>
          <p className="text-lg font-medium text-gray-900">{displayName}</p>
          <p className="text-sm text-gray-600 mt-1 capitalize">{roleName} access</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/dashboard/attendance" className="group">
            <div className="p-4 text-left border border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors group-hover:border-[#428bff]">
              <Clock className="h-6 w-6 text-[#428bff] mb-2" />
              <h3 className="font-medium text-gray-900">Check Attendance</h3>
              <p className="text-sm text-gray-600">View attendance records</p>
            </div>
          </Link>
          
          {canManageUsers && (
            <Link to="/dashboard/user-management" className="group">
              <div className="p-4 text-left border border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors group-hover:border-[#428bff]">
                <Users className="h-6 w-6 text-[#428bff] mb-2" />
                <h3 className="font-medium text-gray-900">Manage Users</h3>
                <p className="text-sm text-gray-600">Add or edit users</p>
              </div>
            </Link>
          )}
          
          <Link to="/dashboard/profile" className="group">
            <div className="p-4 text-left border border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors group-hover:border-[#428bff]">
              <User className="h-6 w-6 text-[#428bff] mb-2" />
              <h3 className="font-medium text-gray-900">My Profile</h3>
              <p className="text-sm text-gray-600">View profile details</p>
            </div>
          </Link>
          
          {(isAdmin || canManageUsers) && (
            <Link to="/dashboard/validate" className="group">
              <div className="p-4 text-left border border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors group-hover:border-[#428bff]">
                <CheckCircle className="h-6 w-6 text-[#428bff] mb-2" />
                <h3 className="font-medium text-gray-900">Validate Records</h3>
                <p className="text-sm text-gray-600">Approve attendance</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="border border-gray-300 bg-white rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <p className="text-sm text-gray-600">10:30 AM - John Doe checked in</p>
          </div>
          <div className="p-4 border-b border-gray-200">
            <p className="text-sm text-gray-600">10:25 AM - Sarah Johnson checked in</p>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600">10:20 AM - Mike Wilson checked in</p>
          </div>
        </div>
      </div>
    </div>
  )
}