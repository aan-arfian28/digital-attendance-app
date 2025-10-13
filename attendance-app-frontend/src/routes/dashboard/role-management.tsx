import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { Search, Download, ChevronUp, ChevronDown, ChevronsUpDown, AlertCircle, ArrowUp, ArrowDown, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import RoleGuard from '@/components/RoleGuard'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Helper to get auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

export const Route = createFileRoute('/dashboard/role-management')({
  component: RoleManagement,
})

// Types
interface Role {
  ID: number
  Name: string
  Position: string
  PositionLevel: number
}

interface CreateRoleData {
  Name: string
  Position: string
  PositionLevel: number
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function RoleManagement() {
  return (
    <RoleGuard adminOnly={true}>
      <RoleManagementContent />
    </RoleGuard>
  )
}

function RoleManagementContent() {
  const queryClient = useQueryClient()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  
  // Form state
  const [formData, setFormData] = useState<CreateRoleData>({
    Name: '',
    Position: '',
    PositionLevel: 1,
  })
  
  // Error states
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateRoleData, string>>>({})

  // Fetch roles data
  const { data: roles = [], isLoading, error } = useQuery({
    queryKey: ['roles'],
    queryFn: async (): Promise<Role[]> => {
      const response = await fetch(`${API_BASE_URL}/admin/users/roles/`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        throw new Error('Failed to fetch roles')
      }
      const data = await response.json()
      // Sort by position level ascending
      return data.sort((a: Role, b: Role) => a.PositionLevel - b.PositionLevel)
    },
  })

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: CreateRoleData): Promise<Role> => {
      const response = await fetch(`${API_BASE_URL}/admin/users/roles/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(roleData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create role')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setIsCreateModalOpen(false)
      resetForm()
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
    },
  })

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, roleData }: { id: number; roleData: CreateRoleData }): Promise<Role> => {
      const response = await fetch(`${API_BASE_URL}/admin/users/roles/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(roleData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update role')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setIsEditModalOpen(false)
      setEditingRole(null)
      resetForm()
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
    },
  })

  // Update position level mutation
  const updatePositionLevelMutation = useMutation({
    mutationFn: async ({ id, positionLevel }: { id: number; positionLevel: number }): Promise<Role> => {
      const response = await fetch(`${API_BASE_URL}/admin/users/roles/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ PositionLevel: positionLevel }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update position level')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
    },
  })

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/admin/users/roles/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete role')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
    },
  })

  // Form handling functions
  const resetForm = () => {
    setFormData({
      Name: '',
      Position: '',
      PositionLevel: 1,
    })
    setFieldErrors({})
    setErrorMessage('')
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CreateRoleData, string>> = {}
    
    if (!formData.Name.trim()) {
      errors.Name = 'Role is required'
    }
    if (!formData.Position.trim()) {
      errors.Position = 'Position is required'
    }
    if (formData.PositionLevel < 1) {
      errors.PositionLevel = 'Position level must be at least 1'
    }

    // Check for duplicate position
    const isDuplicate = roles.some(role => 
      role.Position.toLowerCase() === formData.Position.toLowerCase().trim() && 
      (!editingRole || role.ID !== editingRole.ID)
    )
    if (isDuplicate) {
      errors.Position = 'This position already exists'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateRole = () => {
    if (!validateForm()) return
    createRoleMutation.mutate(formData)
  }

  const openEditModal = (role: Role) => {
    setEditingRole(role)
    setFormData({
      Name: role.Name,
      Position: role.Position,
      PositionLevel: role.PositionLevel,
    })
    setIsEditModalOpen(true)
  }

  const handleUpdateRole = () => {
    if (!validateForm() || !editingRole) return
    updateRoleMutation.mutate({ id: editingRole.ID, roleData: formData })
  }

  const handleDeleteRole = (roleId: number) => {
    if (confirm('Are you sure you want to delete this role?')) {
      deleteRoleMutation.mutate(roleId)
    }
  }

  const moveRoleUp = (role: Role) => {
    const newPositionLevel = role.PositionLevel - 1
    if (newPositionLevel >= 1) {
      updatePositionLevelMutation.mutate({ id: role.ID, positionLevel: newPositionLevel })
    }
  }

  const moveRoleDown = (role: Role) => {
    const newPositionLevel = role.PositionLevel + 1
    updatePositionLevelMutation.mutate({ id: role.ID, positionLevel: newPositionLevel })
  }

  // Export to CSV function
  const exportToCSV = () => {
    const csvContent = [
      ['Role', 'Position', 'Position Level'],
      ...roles.map(role => [role.Name, role.Position, role.PositionLevel.toString()])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roles_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  // Table columns definition
  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: 'Name',
      header: 'Role',
      enableSorting: false,
    },
    {
      accessorKey: 'Position',
      header: 'Position',
      enableSorting: false,
    },
    {
      accessorKey: 'PositionLevel',
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-2 font-semibold"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Position Level
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4" />
            )}
          </button>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const role = row.original
        
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditModal(role)}
              className="bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100 rounded-sm"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => moveRoleUp(role)}
              disabled={role.PositionLevel === 1}
              className="bg-green-50 border-green-300 text-green-600 hover:bg-green-100 rounded-sm"
              title="Change up"
            >
              <ArrowUp className="h-4 w-4" />
              Change up
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => moveRoleDown(role)}
              className="bg-yellow-50 border-yellow-300 text-yellow-600 hover:bg-yellow-100 rounded-sm"
              title="Change down"
            >
              <ArrowDown className="h-4 w-4" />
              Change down
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteRole(role.ID)}
              disabled={deleteRoleMutation.isPending}
              className="bg-red-50 border-red-300 text-red-600 hover:bg-red-100 rounded-sm disabled:opacity-50"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
              {deleteRoleMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        )
      },
    },
  ]

  // Create table instance
  const table = useReactTable({
    data: roles,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading roles...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="rounded-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load roles: {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Role Management</h1>
        <p className="text-gray-600">Manage system roles and position hierarchy</p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search roles..."
            value={globalFilter ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
            className="pl-10 rounded-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={exportToCSV}
            className="border-gray-300 rounded-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          
          <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
            setIsCreateModalOpen(open)
            if (open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="bg-[#428bff] hover:bg-[#3b7ee6] text-white rounded-sm">
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-sm">
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>
                  Add a new role to the system. Fill in all required fields.
                </DialogDescription>
              </DialogHeader>
              
              {errorMessage && (
                <Alert variant="destructive" className="mt-4 rounded-sm">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.Name}
                    onValueChange={(value) => setFormData({ ...formData, Name: value })}
                  >
                    <SelectTrigger className="rounded-sm">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-sm">
                      <SelectItem value="admin">admin</SelectItem>
                      <SelectItem value="user">user</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldErrors.Name && (
                    <p className="text-sm text-red-500">{fieldErrors.Name}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    value={formData.Position}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, Position: e.target.value })}
                    className={fieldErrors.Position ? 'border-red-500 rounded-sm' : 'rounded-sm'}
                    placeholder="e.g., Teacher, Manager"
                  />
                  {fieldErrors.Position && (
                    <p className="text-sm text-red-500">{fieldErrors.Position}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="positionLevel">Position Level *</Label>
                  <Input
                    id="positionLevel"
                    type="number"
                    min="1"
                    value={formData.PositionLevel}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, PositionLevel: parseInt(e.target.value) || 1 })}
                    className={fieldErrors.PositionLevel ? 'border-red-500 rounded-sm' : 'rounded-sm'}
                  />
                  {fieldErrors.PositionLevel && (
                    <p className="text-sm text-red-500">{fieldErrors.PositionLevel}</p>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRole}
                  disabled={createRoleMutation.isPending}
                  className="bg-[#428bff] hover:bg-[#3b7ee6] text-white rounded-sm disabled:opacity-50"
                >
                  {createRoleMutation.isPending ? 'Creating...' : 'Create Role'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table Container */}
      <div className="border border-gray-300 bg-white rounded-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}{' '}
              of {table.getFilteredRowModel().rows.length} results
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded-sm"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded-sm"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl rounded-sm">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role information. All fields are required.
            </DialogDescription>
          </DialogHeader>
          
          {errorMessage && (
            <Alert variant="destructive" className="mt-4 rounded-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role *</Label>
              <Select
                value={formData.Name}
                onValueChange={(value) => setFormData({ ...formData, Name: value })}
              >
                <SelectTrigger className="rounded-sm">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="user">user</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.Name && (
                <p className="text-sm text-red-500">{fieldErrors.Name}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-position">Position *</Label>
              <Input
                id="edit-position"
                value={formData.Position}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, Position: e.target.value })}
                className={fieldErrors.Position ? 'border-red-500 rounded-sm' : 'rounded-sm'}
                placeholder="e.g., Teacher, Manager"
              />
              {fieldErrors.Position && (
                <p className="text-sm text-red-500">{fieldErrors.Position}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-positionLevel">Position Level *</Label>
              <Input
                id="edit-positionLevel"
                type="number"
                min="1"
                value={formData.PositionLevel}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, PositionLevel: parseInt(e.target.value) || 1 })}
                className={fieldErrors.PositionLevel ? 'border-red-500 rounded-sm' : 'rounded-sm'}
              />
              {fieldErrors.PositionLevel && (
                <p className="text-sm text-red-500">{fieldErrors.PositionLevel}</p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="rounded-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={updateRoleMutation.isPending}
              className="bg-[#428bff] hover:bg-[#3b7ee6] text-white rounded-sm disabled:opacity-50"
            >
              {updateRoleMutation.isPending ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}