import { createFileRoute } from '@tanstack/react-router'
import { Users, Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUserData } from '@/hooks/useUserData'
import RoleGuard from '@/components/RoleGuard'

export const Route = createFileRoute('/dashboard/user-management')({
  component: UserManagement,
})

function UserManagement() {
  return (
    <RoleGuard adminOnly={true}>
      <UserManagementContent />
    </RoleGuard>
  )
}

function UserManagementContent() {
  const { 
    displayName, 
    canManageUsers
  } = useUserData()

  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Employee', status: 'Active' },
    { id: 3, name: 'Mike Wilson', email: 'mike@example.com', role: 'Manager', status: 'Inactive' },
    { id: 4, name: 'Emily Davis', email: 'emily@example.com', role: 'Employee', status: 'Active' },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-[#428bff]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Welcome, {displayName}!</p>
          </div>
        </div>
        
        {/* Only show add button if user has permission */}
        {canManageUsers && (
          <Button className="bg-[#428bff] hover:bg-[#3b7ee6] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      {/* Permission Check */}
      {!canManageUsers && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            You don't have permission to manage users. Contact your administrator.
          </p>
        </div>
      )}

      <p className="text-gray-600 mb-6">
        Manage users, create new accounts, and update user permissions.
      </p>

      <div className="border border-gray-300 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="text-left p-3 font-semibold text-gray-900">Name</th>
                <th className="text-left p-3 font-semibold text-gray-900">Email</th>
                <th className="text-left p-3 font-semibold text-gray-900">Role</th>
                <th className="text-left p-3 font-semibold text-gray-900">Status</th>
                {canManageUsers && (
                  <th className="text-left p-3 font-semibold text-gray-900">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-3 text-gray-900">{user.name}</td>
                  <td className="p-3 text-gray-600">{user.email}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 border border-blue-200">
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs border ${
                      user.status === 'Active' 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-red-100 text-red-800 border-red-200'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  {canManageUsers && (
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}