import { createFileRoute, Link } from '@tanstack/react-router'
import { useUserData } from '@/hooks/useUserData'
import { Users, Clock, CheckCircle, User, Shield, Settings, History } from 'lucide-react'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardHome,
})

function DashboardHome() {
  const { displayName, roleName, isAdmin } = useUserData()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {displayName}! You are logged in as <span className="font-medium capitalize">{roleName}</span>
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {isAdmin && (
          <>
            <div className="p-6 border border-gray-300 bg-white rounded-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Total Users</h3>
                <Users className="h-5 w-5 text-[#428bff]" />
              </div>
              <p className="text-2xl font-bold text-[#428bff]">150</p>
              <p className="text-sm text-gray-600 mt-1">Active system users</p>
            </div>
            
            <div className="p-6 border border-gray-300 bg-white rounded-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Total Roles</h3>
                <Shield className="h-5 w-5 text-[#428bff]" />
              </div>
              <p className="text-2xl font-bold text-[#428bff]">4</p>
              <p className="text-sm text-gray-600 mt-1">System roles configured</p>
            </div>
            
            <div className="p-6 border border-gray-300 bg-white rounded-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">System Status</h3>
                <Settings className="h-5 w-5 text-[#428bff]" />
              </div>
              <p className="text-2xl font-bold text-green-600">Active</p>
              <p className="text-sm text-gray-600 mt-1">All systems operational</p>
            </div>
          </>
        )}
        
        {!isAdmin && (
          <>
            <div className="p-6 border border-gray-300 bg-white rounded-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Today's Attendance</h3>
                <Clock className="h-5 w-5 text-[#428bff]" />
              </div>
              <p className="text-2xl font-bold text-[#428bff]">Present</p>
              <p className="text-sm text-gray-600 mt-1">Checked in at 08:30 AM</p>
            </div>
            
            <div className="p-6 border border-gray-300 bg-white rounded-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">This Month</h3>
                <History className="h-5 w-5 text-[#428bff]" />
              </div>
              <p className="text-2xl font-bold text-[#428bff]">22/24</p>
              <p className="text-sm text-gray-600 mt-1">Days present this month</p>
            </div>
            
            <div className="p-6 border border-gray-300 bg-white rounded-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Pending Tasks</h3>
                <CheckCircle className="h-5 w-5 text-[#428bff]" />
              </div>
              <p className="text-2xl font-bold text-[#428bff]">3</p>
              <p className="text-sm text-gray-600 mt-1">Items need validation</p>
            </div>
          </>
        )}

        <div className="p-6 border border-gray-300 bg-white rounded-sm">
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
          {isAdmin && (
            <>
              <Link to="/dashboard/user-management" className="group">
                <div className="p-4 text-left border border-gray-300 bg-white rounded-sm hover:bg-gray-50 transition-colors group-hover:border-[#428bff]">
                  <Users className="h-6 w-6 text-[#428bff] mb-2" />
                  <h3 className="font-medium text-gray-900">Manage Users</h3>
                  <p className="text-sm text-gray-600">Add or edit users</p>
                </div>
              </Link>
              
              <Link to="/dashboard/role-management" className="group">
                <div className="p-4 text-left border border-gray-300 bg-white rounded-sm hover:bg-gray-50 transition-colors group-hover:border-[#428bff]">
                  <Shield className="h-6 w-6 text-[#428bff] mb-2" />
                  <h3 className="font-medium text-gray-900">Manage Roles</h3>
                  <p className="text-sm text-gray-600">Configure user roles</p>
                </div>
              </Link>
              
              <Link to="/dashboard/settings" className="group">
                <div className="p-4 text-left border border-gray-300 bg-white rounded-sm hover:bg-gray-50 transition-colors group-hover:border-[#428bff]">
                  <Settings className="h-6 w-6 text-[#428bff] mb-2" />
                  <h3 className="font-medium text-gray-900">Settings</h3>
                  <p className="text-sm text-gray-600">System configuration</p>
                </div>
              </Link>
            </>
          )}
          
          {!isAdmin && (
            <>
              <Link to="/dashboard/attendance" className="group">
                <div className="p-4 text-left border border-gray-300 bg-white rounded-sm hover:bg-gray-50 transition-colors group-hover:border-[#428bff]">
                  <Clock className="h-6 w-6 text-[#428bff] mb-2" />
                  <h3 className="font-medium text-gray-900">Attendance</h3>
                  <p className="text-sm text-gray-600">Check in/out</p>
                </div>
              </Link>
              
              <Link to="/dashboard/history" className="group">
                <div className="p-4 text-left border border-gray-300 bg-white rounded-sm hover:bg-gray-50 transition-colors group-hover:border-[#428bff]">
                  <History className="h-6 w-6 text-[#428bff] mb-2" />
                  <h3 className="font-medium text-gray-900">History</h3>
                  <p className="text-sm text-gray-600">View attendance history</p>
                </div>
              </Link>
              
              <Link to="/dashboard/validate" className="group">
                <div className="p-4 text-left border border-gray-300 bg-white rounded-sm hover:bg-gray-50 transition-colors group-hover:border-[#428bff]">
                  <CheckCircle className="h-6 w-6 text-[#428bff] mb-2" />
                  <h3 className="font-medium text-gray-900">Validate</h3>
                  <p className="text-sm text-gray-600">Approve records</p>
                </div>
              </Link>
            </>
          )}
          
          <Link to="/dashboard/profile" className="group">
            <div className="p-4 text-left border border-gray-300 bg-white rounded-sm hover:bg-gray-50 transition-colors group-hover:border-[#428bff]">
              <User className="h-6 w-6 text-[#428bff] mb-2" />
              <h3 className="font-medium text-gray-900">My Profile</h3>
              <p className="text-sm text-gray-600">View profile details</p>
            </div>
          </Link>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="border border-gray-300 bg-white rounded-sm">
          {isAdmin ? (
            <>
              <div className="p-4 border-b border-gray-200">
                <p className="text-sm text-gray-600">10:30 AM - New user "teacher2" created</p>
              </div>
              <div className="p-4 border-b border-gray-200">
                <p className="text-sm text-gray-600">10:25 AM - Role "Supervisor" updated</p>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600">10:20 AM - System backup completed</p>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200">
                <p className="text-sm text-gray-600">08:30 AM - You checked in</p>
              </div>
              <div className="p-4 border-b border-gray-200">
                <p className="text-sm text-gray-600">Yesterday - Attendance validated</p>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600">Yesterday - 8 hours worked</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}