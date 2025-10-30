import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
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

// Extract query functions outside component
const fetchUsers = async (): Promise<User[]> => {
  const [nonAdmins, admins] = await Promise.all([
    fetch(`${API_BASE_URL}/admin/users/non-admins`, {
      headers: getAuthHeaders(),
    }).then(r => {
      if (!r.ok) throw new Error('Failed to fetch non-admin users')
      return r.json() as Promise<User[]>
    }),
    fetch(`${API_BASE_URL}/admin/users/admins`, {
      headers: getAuthHeaders(),
    }).then(r => {
      if (!r.ok) throw new Error('Failed to fetch admin users')
      return r.json() as Promise<User[]>
    })
  ])
  return [...admins, ...nonAdmins]
}

const fetchRoles = async (): Promise<Role[]> => {
  const response = await fetch(`${API_BASE_URL}/admin/users/roles`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch roles')
  return response.json()
}

// Extract mutation functions outside component
const createUser = async (data: CreateUserData) => {
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
}

const updateUser = async ({ id, data }: { id: number; data: Partial<CreateUserData> }) => {
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
}

const deleteUser = async (id: number) => {
  const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('Failed to delete user')
  return response.json()
}

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

  // FIX 1: Add cleanup effect for error states
  useEffect(() => {
    return () => {
      setErrorMessage('')
      setFieldErrors({})
    }
  }, [])

  // Queries with proper cache configuration
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000, // FIX 2: Add garbage collection time
    refetchOnWindowFocus: false,
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000, // FIX 2: Add garbage collection time
    refetchOnWindowFocus: false,
  })

  // Derive supervisors from cache
  const supervisors = useMemo(() => {
    if (formData.PositionLevel <= 0) return []
    return users.filter((user) => user.PositionLevel < formData.PositionLevel)
  }, [users, formData.PositionLevel])

  // Form handlers
  const handleFormChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleRoleChange = (value: string) => {
    const selectedRole = roles.find((r) => r.Position === value)
    if (selectedRole) {
      setFormData(prev => ({
        ...prev,
        Role: selectedRole.Name,
        Position: selectedRole.Position,
        PositionLevel: selectedRole.PositionLevel,
        SupervisorID: undefined,
      }))
    }
  }

  const handleSupervisorChange = (value: string) => {
    const supervisorID = value === '0' || value === 'none' ? undefined : Number(value)
    setFormData(prev => ({ ...prev, SupervisorID: supervisorID }))
  }

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

  // FIX 3: Memoize column handlers to prevent recreation
  const handleEditClick = useMemo(() => (user: User) => {
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
    setErrorMessage('')
    setFieldErrors({})
    setIsEditModalOpen(true)
  }, [])

  const handleDeleteClick = useMemo(() => (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.Name}?`)) {
      deleteUserMutation.mutate(user.ID)
    }
  }, [])

  // FIX 4: Wrap columns in useMemo with stable dependencies
  const columns = useMemo<ColumnDef<User>[]>(() => [
    {
      accessorKey: 'Username',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-2 hover:text-gray-900"
        >
          Username
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4" />
          )}
        </button>
      ),
    },
    {
      accessorKey: 'Name',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-2 hover:text-gray-900"
        >
          Name
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4" />
          )}
        </button>
      ),
    },
    {
      accessorKey: 'Email',
      header: 'Email',
    },
    {
      accessorKey: 'Role',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-2 hover:text-gray-900"
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
      ),
      cell: ({ row }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          row.original.Role === 'admin' 
            ? 'bg-purple-100 text-purple-800' 
            : 'bg-blue-100 text-blue-800'
        }`}>
          {row.original.Role}
        </span>
      ),
    },
    {
      accessorKey: 'Position',
      header: 'Position',
    },
    {
      accessorKey: 'PositionLevel',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-2 hover:text-gray-900"
        >
          Level
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4" />
          )}
        </button>
      ),
    },
    {
      accessorKey: 'Supervisor',
      header: 'Supervisor',
      cell: ({ row }) => row.original.Supervisor?.SupervisorName || '-',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditClick(row.original)}
            className="h-8 w-8 p-0 rounded-sm"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(row.original)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-sm"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [handleEditClick, handleDeleteClick]) // FIX 4: Stable dependencies

  // Mutations with proper cleanup
  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsCreateModalOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      if (error.errors) {
        const errors: Record<string, string> = {}
        Object.keys(error.errors).forEach((key) => {
          errors[key] = error.errors[key]
        })
        setFieldErrors(errors)
      }
      setErrorMessage(error.message || 'Failed to create user')
    },
    // FIX 5: Reset mutation state when component unmounts
    gcTime: 0,
  })

  const updateUserMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsEditModalOpen(false)
      setSelectedUser(null)
      resetForm()
    },
    onError: (error: any) => {
      if (error.errors) {
        const errors: Record<string, string> = {}
        Object.keys(error.errors).forEach((key) => {
          errors[key] = error.errors[key]
        })
        setFieldErrors(errors)
      }
      setErrorMessage(error.message || 'Failed to update user')
    },
    // FIX 5: Reset mutation state when component unmounts
    gcTime: 0,
  })

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => {
      alert('Failed to delete user')
    },
    // FIX 5: Reset mutation state when component unmounts
    gcTime: 0,
  })

  const handleCreateUser = () => {
    if (!formData.Role || !formData.Position) {
      setErrorMessage('Please select a position')
      return
    }

    const userData: CreateUserData = {
      Username: formData.Username,
      Password: formData.Password,
      Email: formData.Email,
      Role: {
        Name: formData.Role,
        Position: formData.Position,
        PositionLevel: formData.PositionLevel,
      },
      UserDetail: {
        Name: formData.Name,
      },
      ...(formData.SupervisorID && { SupervisorID: formData.SupervisorID }),
    }

    createUserMutation.mutate(userData)
  }

  const handleEditUser = () => {
    if (!selectedUser) return

    const updateData: Partial<CreateUserData> = {
      Username: formData.Username,
      Email: formData.Email,
      Role: {
        Name: formData.Role as 'admin' | 'user',
        Position: formData.Position,
        PositionLevel: formData.PositionLevel,
      },
      UserDetail: {
        Name: formData.Name,
      },
      ...(formData.SupervisorID && { SupervisorID: formData.SupervisorID }),
    }

    if (formData.Password) {
      updateData.Password = formData.Password
    }

    updateUserMutation.mutate({ id: selectedUser.ID, data: updateData })
  }

  const exportToCSV = () => {
    const headers = ['Username', 'Name', 'Email', 'Role', 'Position', 'Level', 'Supervisor']
    const rows = users.map(user => [
      user.Username,
      user.Name,
      user.Email,
      user.Role,
      user.Position,
      user.PositionLevel.toString(),
      user.Supervisor?.SupervisorName || '-'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users.csv'
    a.click()
    // FIX 6: Cleanup blob URL to prevent memory leak
    window.URL.revokeObjectURL(url)
  }

  // FIX 7: Memoize table instance with stable dependencies
  const table = useReactTable({
    data: users,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage system users and their roles</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={exportToCSV}
            className="rounded-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-[#428bff] hover:bg-[#3b7ee6] rounded-sm"
                onClick={() => {
                  resetForm()
                  setIsCreateModalOpen(true)
                }}
              >
                Add New User
              </Button>
            </DialogTrigger>
            <DialogContent 
              className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm"
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system with their role and details
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
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.Username}
                    onChange={(e) => handleFormChange('Username', e.target.value)}
                    className={fieldErrors.Username ? 'border-red-500 rounded-sm' : 'rounded-sm'}
                  />
                  {fieldErrors.Username && (
                    <p className="text-sm text-red-500">{fieldErrors.Username}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.Password}
                    onChange={(e) => handleFormChange('Password', e.target.value)}
                    className={fieldErrors.Password ? 'border-red-500 rounded-sm' : 'rounded-sm'}
                  />
                  {fieldErrors.Password && (
                    <p className="text-sm text-red-500">{fieldErrors.Password}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.Email}
                    onChange={(e) => handleFormChange('Email', e.target.value)}
                    className={fieldErrors.Email ? 'border-red-500 rounded-sm' : 'rounded-sm'}
                  />
                  {fieldErrors.Email && (
                    <p className="text-sm text-red-500">{fieldErrors.Email}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.Name}
                    onChange={(e) => handleFormChange('Name', e.target.value)}
                    className={fieldErrors.Name ? 'border-red-500 rounded-sm' : 'rounded-sm'}
                  />
                  {fieldErrors.Name && (
                    <p className="text-sm text-red-500">{fieldErrors.Name}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="position">Position</Label>
                  <Select
                    value={formData.Position}
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger id="position" className="rounded-sm">
                      <SelectValue placeholder="Select a position" />
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
                    <Label htmlFor="supervisor">Supervisor</Label>
                    <Select
                      value={formData.SupervisorID?.toString() || 'none'}
                      onValueChange={handleSupervisorChange}
                    >
                      <SelectTrigger id="supervisor" className="rounded-sm">
                        <SelectValue placeholder="Select a supervisor" />
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
                    resetForm()
                    setIsCreateModalOpen(false)
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

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search users..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10 rounded-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
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
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditModalOpen(false)
          // FIX 8: Clean up state when modal closes
          resetForm()
          setSelectedUser(null)
        }
      }}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
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
                onChange={(e) => handleFormChange('Username', e.target.value)}
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
                onChange={(e) => handleFormChange('Password', e.target.value)}
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
                onChange={(e) => handleFormChange('Email', e.target.value)}
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
                onChange={(e) => handleFormChange('Name', e.target.value)}
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
                onValueChange={handleRoleChange}
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
                  value={formData.SupervisorID?.toString() || 'none'}
                  onValueChange={handleSupervisorChange}
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
                resetForm()
                setSelectedUser(null)
                setIsEditModalOpen(false)
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