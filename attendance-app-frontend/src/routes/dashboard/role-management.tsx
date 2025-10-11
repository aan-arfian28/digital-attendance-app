import { createFileRoute } from '@tanstack/react-router'
import { Shield, Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/dashboard/role-management')({
  component: RoleManagement,
})

function RoleManagement() {
  const roles = [
    { 
      id: 1, 
      name: 'Admin', 
      description: 'Full system access and user management', 
      userCount: 2, 
      permissions: ['All Permissions'] 
    },
    { 
      id: 2, 
      name: 'Manager', 
      description: 'Manage team attendance and reports', 
      userCount: 5, 
      permissions: ['View Reports', 'Manage Team', 'Validate Attendance'] 
    },
    { 
      id: 3, 
      name: 'Employee', 
      description: 'Basic attendance access', 
      userCount: 43, 
      permissions: ['Record Attendance', 'View Own History'] 
    },
    { 
      id: 4, 
      name: 'HR', 
      description: 'Human resources management', 
      userCount: 3, 
      permissions: ['Manage Users', 'View All Reports', 'System Settings'] 
    },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-[#428bff]" />
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
        </div>
        <Button className="bg-[#428bff] hover:bg-[#3b7ee6] text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      <p className="text-gray-600 mb-6">
        Define and manage user roles and permissions.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div key={role.id} className="border border-gray-300 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4">{role.description}</p>

            <div className="mb-4">
              <span className="text-sm font-medium text-gray-900">Users: </span>
              <span className="text-[#428bff] font-semibold">{role.userCount}</span>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Permissions:</h4>
              <div className="space-y-1">
                {role.permissions.map((permission, index) => (
                  <span 
                    key={index}
                    className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 border border-blue-200 mr-1 mb-1"
                  >
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Role Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border border-gray-300 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-1">Total Roles</h3>
            <p className="text-2xl font-bold text-[#428bff]">{roles.length}</p>
          </div>
          <div className="p-4 border border-gray-300 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-1">Total Users</h3>
            <p className="text-2xl font-bold text-green-600">
              {roles.reduce((sum, role) => sum + role.userCount, 0)}
            </p>
          </div>
          <div className="p-4 border border-gray-300 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-1">Admin Users</h3>
            <p className="text-2xl font-bold text-purple-600">
              {roles.find(r => r.name === 'Admin')?.userCount || 0}
            </p>
          </div>
          <div className="p-4 border border-gray-300 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-1">Employee Users</h3>
            <p className="text-2xl font-bold text-blue-600">
              {roles.find(r => r.name === 'Employee')?.userCount || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}