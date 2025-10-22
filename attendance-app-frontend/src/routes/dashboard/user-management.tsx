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
import { Search, Download, ChevronUp, ChevronDown, ChevronsUpDown, AlertCircle, Edit, Trash2 } from 'lucide-react'
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

export const Route = createFileRoute('/dashboard/user-management')({
  component: UserManagement,
})

// Types
interface User {
  ID: number
  Username: string
  Name: string
  Email: string
  Role: 'admin' | 'user'
  Position: string
  PositionLevel: number
  Supervisor: {
    SupervisorID: number
    SupervisorName: string
  } | null
}

interface Role {
  ID: number
  Name: 'admin' | 'user'
  Position: string
  PositionLevel: number
}

interface CreateUserData {
  Username: string
  Password: string
  Email: string
  SupervisorID?: number
  Role: {
    Name: 'admin' | 'user'
    Position: string
    PositionLevel: number
  }
  UserDetail: {
    Name: string
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function UserManagement() {
  return (
    <RoleGuard adminOnly={true}>
      <UserManagementContent />
    </RoleGuard>
  )
}

function UserManagementContent() {
  const queryClient = useQueryClient()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Form state
  const [formData, setFormData] = useState({
    Username: '',
    Password: '',
    Email: '',
    Name: '',
    Role: '' as 'admin' | 'user' | '',
    Position: '',
    PositionLevel: 0,
    SupervisorID: undefined as number | undefined,
  })

  // Fetch users (both admins and non-admins)
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Fetch non-admin users
      const nonAdminsResponse = await fetch(`${API_BASE_URL}/admin/users/non-admins`, {
        headers: getAuthHeaders(),
      })
      if (!nonAdminsResponse.ok) throw new Error('Failed to fetch non-admin users')
      const nonAdmins = (await nonAdminsResponse.json()) as User[]

      // Fetch admin users
      const adminsResponse = await fetch(`${API_BASE_URL}/admin/users/admins`, {
        headers: getAuthHeaders(),
      })
      if (!adminsResponse.ok) throw new Error('Failed to fetch admin users')
      const admins = (await adminsResponse.json()) as User[]

      // Merge both arrays
      return [...admins, ...nonAdmins]
    },
  })

  // Fetch roles
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/users/roles`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Failed to fetch roles')
      return response.json() as Promise<Role[]>
    },
  })

  // Fetch potential supervisors
  const { data: supervisors = [] } = useQuery({
    queryKey: ['supervisors', formData.PositionLevel],
    queryFn: async () => {
      // Fetch non-admin users
      const nonAdminsResponse = await fetch(`${API_BASE_URL}/admin/users/non-admins`, {
        headers: getAuthHeaders(),
      })
      if (!nonAdminsResponse.ok) throw new Error('Failed to fetch non-admin users')
      const nonAdmins = (await nonAdminsResponse.json()) as User[]

      // Fetch admin users
      const adminsResponse = await fetch(`${API_BASE_URL}/admin/users/admins`, {
        headers: getAuthHeaders(),
      })
      if (!adminsResponse.ok) throw new Error('Failed to fetch admin users')
      const admins = (await adminsResponse.json()) as User[]

      // Merge and filter by position level
      const allUsers = [...admins, ...nonAdmins]
      return allUsers.filter((user) => user.PositionLevel < formData.PositionLevel)
    },
    enabled: formData.PositionLevel > 0,
  })

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserData) => {
      const response = await fetch(`${API_BASE_URL}/admin/users/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw errorData
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsCreateModalOpen(false)
      resetForm()
      setErrorMessage('')
      setFieldErrors({})
    },
    onError: (error: any) => {
      if (error.errors) {
        // Parse field validation errors
        setFieldErrors(error.errors)
        setErrorMessage('Please fix the validation errors below.')
      } else if (error.error) {
        setErrorMessage(error.error)
        setFieldErrors({})
      } else {
        setErrorMessage('Failed to create user. Please try again.')
        setFieldErrors({})
      }
    },
  })

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateUserData> }) => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw errorData
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsEditModalOpen(false)
      setSelectedUser(null)
      resetForm()
      setErrorMessage('')
      setFieldErrors({})
    },
    onError: (error: any) => {
      if (error.errors) {
        // Parse field validation errors
        setFieldErrors(error.errors)
        setErrorMessage('Please fix the validation errors below.')
      } else if (error.error) {
        setErrorMessage(error.error)
        setFieldErrors({})
      } else {
        setErrorMessage('Failed to update user. Please try again.')
        setFieldErrors({})
      }
    },
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Failed to delete user')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const resetForm = () => {
    setFormData({
      Username: '',
      Password: '',
      Email: '',
      Name: '',
      Role: '',
      Position: '',
      PositionLevel: 0,
      SupervisorID: undefined,
    })
    setErrorMessage('')
    setFieldErrors({})
  }

  const handleCreateUser = () => {
    if (!formData.Role || !formData.Position) return

    const createData: CreateUserData = {
      Username: formData.Username,
      Password: formData.Password,
      Email: formData.Email,
      SupervisorID: formData.SupervisorID,
      Role: {
        Name: formData.Role,
        Position: formData.Position,
        PositionLevel: formData.PositionLevel,
      },
      UserDetail: {
        Name: formData.Name,
      },
    }

    createUserMutation.mutate(createData)
  }

  const handleEditUser = () => {
    if (!selectedUser) return

    const updateData: Partial<CreateUserData> = {
      Username: formData.Username,
      Email: formData.Email,
      SupervisorID: formData.SupervisorID,
      Role: {
        Name: formData.Role as 'admin' | 'user',
        Position: formData.Position,
        PositionLevel: formData.PositionLevel,
      },
      UserDetail: {
        Name: formData.Name,
      },
    }

    if (formData.Password) {
      updateData.Password = formData.Password
    }

    updateUserMutation.mutate({ id: selectedUser.ID, data: updateData })
  }

  const handleDeleteUser = (id: number) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(id)
    }
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setFormData({
      Username: user.Username,
      Password: '',
      Email: user.Email,
      Name: user.Name,
      Role: user.Role,
      Position: user.Position,
      PositionLevel: user.PositionLevel,
      SupervisorID: user.Supervisor?.SupervisorID,
    })
    setIsEditModalOpen(true)
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['ID', 'Email', 'Role', 'Position', 'Position Level', 'Supervisor']
    const rows = users.map((user) => [
      user.ID,
      user.Email,
      user.Role,
      user.Position,
      user.PositionLevel,
      user.Supervisor?.SupervisorName || 'N/A',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Table columns - Part 1
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'ID',
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-2 font-semibold"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            ID
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
      accessorKey: 'Email',
      header: 'Email',
    },
    {
      accessorKey: 'Role',
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-2 font-semibold"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Role
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
      id: 'supervisor',
      accessorFn: (row) => row.Supervisor?.SupervisorName || 'N/A',
      header: 'Supervisor',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditModal(user)}
              className="bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100 rounded-sm"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteUser(user.ID)}
              className="bg-red-50 border-red-300 text-red-600 hover:bg-red-100 rounded-sm"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">User Management</h1>
        <p className="text-gray-600">Manage user accounts and permissions</p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by email or ID..."
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
            if (open) resetForm() // Clear form when opening modal
          }}>
            <DialogTrigger asChild>
              <Button className="bg-[#428bff] hover:bg-[#3b7ee6] text-white rounded-sm">
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system. Fill in all required fields.
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
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.Username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, Username: e.target.value })}
                    className={fieldErrors.Username ? 'border-red-500 rounded-sm' : 'rounded-sm'}
                  />
                  {fieldErrors.Username && (
                    <p className="text-sm text-red-500">{fieldErrors.Username}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.Password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, Password: e.target.value })}
                    className={fieldErrors.Password ? 'border-red-500 rounded-sm' : 'rounded-sm'}
                  />
                  {fieldErrors.Password && (
                    <p className="text-sm text-red-500">{fieldErrors.Password}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.Email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, Email: e.target.value })}
                    className={fieldErrors.Email ? 'border-red-500 rounded-sm' : 'rounded-sm'}
                  />
                  {fieldErrors.Email && (
                    <p className="text-sm text-red-500">{fieldErrors.Email}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.Name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, Name: e.target.value })}
                    className={fieldErrors.Name ? 'border-red-500 rounded-sm' : 'rounded-sm'}
                  />
                  {fieldErrors.Name && (
                    <p className="text-sm text-red-500">{fieldErrors.Name}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="position">Position *</Label>
                  <Select
                    value={formData.Position}
                    onValueChange={(value) => {
                      const selectedRole = roles.find((r) => r.Position === value)
                      if (selectedRole) {
                        setFormData({
                          ...formData,
                          Position: value,
                          Role: selectedRole.Name,
                          PositionLevel: selectedRole.PositionLevel,
                        })
                      }
                    }}
                  >
                    <SelectTrigger id="position" className="rounded-sm">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent className="rounded-sm">
                      {[...roles].sort((a, b) => a.PositionLevel - b.PositionLevel).map((role) => (
                        <SelectItem key={role.ID} value={role.Position}>
                          {role.Position} - {role.PositionLevel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.PositionLevel > 0 && supervisors.length > 0 && (
                  <div className="grid gap-2">
                    <Label htmlFor="supervisor">Supervisor (Optional)</Label>
                    <Select
                      value={formData.SupervisorID?.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, SupervisorID: parseInt(value) })
                      }
                    >
                      <SelectTrigger id="supervisor" className="rounded-sm">
                        <SelectValue placeholder="Select supervisor" />
                      </SelectTrigger>
                      <SelectContent className="rounded-sm">
                        <SelectItem value="0">None</SelectItem>
                        {supervisors.map((supervisor) => (
                          <SelectItem key={supervisor.ID} value={supervisor.ID.toString()}>
                            {supervisor.Name} - {supervisor.Position} (Level {supervisor.PositionLevel})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    resetForm()
                  }}
                  className="rounded-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                  className="bg-[#428bff] hover:bg-[#3b7ee6] rounded-sm"
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Continuing in next part... */}
      {/* Table */}
      <div className="border rounded-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-6 py-3 text-left text-sm">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 text-sm text-gray-900">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Rows per page:</span>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="w-20 rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-sm">
                {[10, 20, 50].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <div className="flex gap-1">
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
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Leave password empty to keep current password.
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
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={formData.Username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, Username: e.target.value })}
                className={fieldErrors.Username ? 'border-red-500 rounded-sm' : 'rounded-sm'}
              />
              {fieldErrors.Username && (
                <p className="text-sm text-red-500">{fieldErrors.Username}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">Password (leave empty to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.Password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, Password: e.target.value })}
                className={fieldErrors.Password ? 'border-red-500 rounded-sm' : 'rounded-sm'}
              />
              {fieldErrors.Password && (
                <p className="text-sm text-red-500">{fieldErrors.Password}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.Email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, Email: e.target.value })}
                className={fieldErrors.Email ? 'border-red-500 rounded-sm' : 'rounded-sm'}
              />
              {fieldErrors.Email && (
                <p className="text-sm text-red-500">{fieldErrors.Email}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={formData.Name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, Name: e.target.value })}
                className={fieldErrors.Name ? 'border-red-500 rounded-sm' : 'rounded-sm'}
              />
              {fieldErrors.Name && (
                <p className="text-sm text-red-500">{fieldErrors.Name}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-position">Position</Label>
              <Select
                value={formData.Position}
                onValueChange={(value) => {
                  const selectedRole = roles.find((r) => r.Position === value)
                  if (selectedRole) {
                    setFormData({
                      ...formData,
                      Position: value,
                      Role: selectedRole.Name,
                      PositionLevel: selectedRole.PositionLevel,
                    })
                  }
                }}
              >
                <SelectTrigger id="edit-position" className="rounded-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  {[...roles].sort((a, b) => a.PositionLevel - b.PositionLevel).map((role) => (
                    <SelectItem key={role.ID} value={role.Position}>
                      {role.Position} - {role.PositionLevel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.PositionLevel > 0 && supervisors.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="edit-supervisor">Supervisor</Label>
                <Select
                  value={formData.SupervisorID?.toString() || '0'}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      SupervisorID: value === '0' ? undefined : parseInt(value),
                    })
                  }
                >
                  <SelectTrigger id="edit-supervisor" className="rounded-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-sm">
                    <SelectItem value="0">None</SelectItem>
                    {supervisors.map((supervisor) => (
                      <SelectItem key={supervisor.ID} value={supervisor.ID.toString()}>
                        {supervisor.Name} - {supervisor.Position} (Level {supervisor.PositionLevel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false)
                setSelectedUser(null)
                resetForm()
              }}
              className="rounded-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={updateUserMutation.isPending}
              className="bg-[#428bff] hover:bg-[#3b7ee6] rounded-sm"
            >
              {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
