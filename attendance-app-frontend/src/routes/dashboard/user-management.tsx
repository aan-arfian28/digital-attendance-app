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
import { Search, Download, ChevronUp, ChevronDown, ChevronsUpDown, AlertCircle, Trash2, Edit } from 'lucide-react'
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

interface User {
  ID: number
  Username: string
  Name: string
  Email: string
  Role: string
  Position: string
  PositionLevel: number
  Supervisor: {
    SupervisorID: number
    SupervisorName: string
  } | null
}

interface CreateUserData {
  Username: string
  Password: string
  Email: string
  SupervisorID?: number
  Role: {
    Name: string
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
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  
  const [formData, setFormData] = useState<CreateUserData>({
    Username: '',
    Password: '',
    Email: '',
    Role: {
      Name: '',
      Position: '',
      PositionLevel: 1,
    },
    UserDetail: {
      Name: '',
    },
  })
  
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateUserData, string>>>({})

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<User[]> => {
      const [nonAdminsRes, adminsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/users/non-admins`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/admin/users/admins`, { headers: getAuthHeaders() }),
      ])
      
      if (!nonAdminsRes.ok || !adminsRes.ok) {
        throw new Error('Failed to fetch users')
      }
      
      const nonAdminsData = await nonAdminsRes.json()
      const adminsData = await adminsRes.json()
      
      // CRITICAL FIX: Handle null responses from API
      const nonAdmins = Array.isArray(nonAdminsData) ? nonAdminsData : []
      const admins = Array.isArray(adminsData) ? adminsData : []
      
      const allUsers = [...nonAdmins, ...admins].sort((a: User, b: User) => a.PositionLevel - b.PositionLevel)
      return allUsers
    },
  })

  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserData): Promise<User> => {
      const response = await fetch(`${API_BASE_URL}/admin/users/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create user')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsCreateModalOpen(false)
      resetForm()
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number; userData: CreateUserData }): Promise<User> => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update user')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsEditModalOpen(false)
      setEditingUser(null)
      resetForm()
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete user')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
    },
  })

  const validateField = (name: keyof CreateUserData, value: any): string => {
    if (name === 'Username' && !value.trim()) return 'Username is required'
    if (name === 'Password' && !editingUser && !value.trim()) return 'Password is required'
    if (name === 'Email' && !value.trim()) return 'Email is required'
    if (name === 'UserDetail' && !value.Name?.trim()) return 'Name is required'
    if (name === 'Role' && !value.Position?.trim()) return 'Position is required'
    return ''
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CreateUserData, string>> = {}
    
    Object.keys(formData).forEach((key) => {
      const error = validateField(key as keyof CreateUserData, formData[key as keyof CreateUserData])
      if (error) {
        errors[key as keyof CreateUserData] = error
      }
    })

    const isDuplicate = users.some((user) =>
      user.Username.toLowerCase() === formData.Username.toLowerCase() &&
      (!editingUser || user.ID !== editingUser.ID)
    )
    
    if (isDuplicate) {
      errors.Username = 'Username already exists'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const resetForm = () => {
    setFormData({
      Username: '',
      Password: '',
      Email: '',
      Role: {
        Name: '',
        Position: '',
        PositionLevel: 1,
      },
      UserDetail: {
        Name: '',
      },
    })
    setFieldErrors({})
    setErrorMessage('')
  }

  const handleOpenCreateModal = () => {
    resetForm()
    setEditingUser(null)
    setIsCreateModalOpen(true)
  }

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user)
    setFormData({
      Username: user.Username,
      Password: '',
      Email: user.Email,
      SupervisorID: user.Supervisor?.SupervisorID,
      Role: {
        Name: user.Role,
        Position: user.Position,
        PositionLevel: user.PositionLevel,
      },
      UserDetail: {
        Name: user.Name,
      },
    })
    setFieldErrors({})
    setErrorMessage('')
    setIsEditModalOpen(true)
  }

  const handleCreateUser = () => {
    if (!validateForm()) return
    createUserMutation.mutate(formData)
  }

  const handleUpdateUser = () => {
    if (!editingUser) return
    if (!validateForm()) return
    updateUserMutation.mutate({ id: editingUser.ID, userData: formData })
  }

  const handleDeleteUser = (user: User) => {
    if (confirm(`Delete user ${user.Username}?`)) {
      deleteUserMutation.mutate(user.ID)
    }
  }

  const exportToCSV = () => {
    const headers = ['ID', 'Username', 'Name', 'Email', 'Role', 'Position', 'Level', 'Supervisor']
    const csvData = [
      headers,
      ...users.map(user => [
        user.ID.toString(),
        user.Username,
        user.Name,
        user.Email,
        user.Role,
        user.Position,
        user.PositionLevel.toString(),
        user.Supervisor?.SupervisorName || 'None'
      ])
    ]
    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Define columns - IMPORTANT: This must be stable across renders
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'Username',
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Username
            {column.getIsSorted() === 'asc' ? <ChevronUp className="ml-2 h-4 w-4" /> :
             column.getIsSorted() === 'desc' ? <ChevronDown className="ml-2 h-4 w-4" /> :
             <ChevronsUpDown className="ml-2 h-4 w-4" />}
          </Button>
        )
      },
    },
    {
      accessorKey: 'Name',
      header: 'Name',
    },
    {
      accessorKey: 'Email',
      header: 'Email',
    },
    {
      accessorKey: 'Position',
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Position
            {column.getIsSorted() === 'asc' ? <ChevronUp className="ml-2 h-4 w-4" /> :
             column.getIsSorted() === 'desc' ? <ChevronDown className="ml-2 h-4 w-4" /> :
             <ChevronsUpDown className="ml-2 h-4 w-4" />}
          </Button>
        )
      },
    },
    {
      accessorKey: 'PositionLevel',
      header: 'Level',
    },
    {
      id: 'supervisor',
      header: 'Supervisor',
      cell: ({ row }) => {
        return row.original.Supervisor?.SupervisorName || 'None'
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        return (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(row.original)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(row.original)}>
              <Trash2 className="h-4 w-4" />
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
    return <div className="p-6">Loading users...</div>
  }
  
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error: {error.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreateModal}>Add User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>Add a new user to the system</DialogDescription>
            </DialogHeader>
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.Username}
                  onChange={(e) => setFormData({ ...formData, Username: e.target.value })}
                />
                {fieldErrors.Username && <span className="text-sm text-red-500">{fieldErrors.Username}</span>}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.Password}
                  onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
                />
                {fieldErrors.Password && <span className="text-sm text-red-500">{fieldErrors.Password}</span>}
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.UserDetail.Name}
                  onChange={(e) => setFormData({ ...formData, UserDetail: { Name: e.target.value } })}
                />
                {fieldErrors.UserDetail && <span className="text-sm text-red-500">{fieldErrors.UserDetail}</span>}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={formData.Email}
                  onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                />
                {fieldErrors.Email && <span className="text-sm text-red-500">{fieldErrors.Email}</span>}
              </div>
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={formData.Role.Position}
                  onChange={(e) => setFormData({ ...formData, Role: { ...formData.Role, Position: e.target.value } })}
                />
                {fieldErrors.Role && <span className="text-sm text-red-500">{fieldErrors.Role}</span>}
              </div>
              <div>
                <Label htmlFor="level">Level</Label>
                <Select
                  value={formData.Role.PositionLevel.toString()}
                  onValueChange={(value) => setFormData({ ...formData, Role: { ...formData.Role, PositionLevel: parseInt(value) } })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <SelectItem key={level} value={level.toString()}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateUser}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error loading users</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left font-medium">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={formData.Username}
                onChange={(e) => setFormData({ ...formData, Username: e.target.value })}
              />
              {fieldErrors.Username && <span className="text-sm text-red-500">{fieldErrors.Username}</span>}
            </div>
            <div>
              <Label htmlFor="edit-password">Password (leave blank to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.Password}
                onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.UserDetail.Name}
                onChange={(e) => setFormData({ ...formData, UserDetail: { Name: e.target.value } })}
              />
              {fieldErrors.UserDetail && <span className="text-sm text-red-500">{fieldErrors.UserDetail}</span>}
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                value={formData.Email}
                onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
              />
              {fieldErrors.Email && <span className="text-sm text-red-500">{fieldErrors.Email}</span>}
            </div>
            <div>
              <Label htmlFor="edit-position">Position</Label>
              <Input
                id="edit-position"
                value={formData.Role.Position}
                onChange={(e) => setFormData({ ...formData, Role: { ...formData.Role, Position: e.target.value } })}
              />
              {fieldErrors.Role && <span className="text-sm text-red-500">{fieldErrors.Role}</span>}
            </div>
            <div>
              <Label htmlFor="edit-level">Level</Label>
              <Select
                value={formData.Role.PositionLevel.toString()}
                onValueChange={(value) => setFormData({ ...formData, Role: { ...formData.Role, PositionLevel: parseInt(value) } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <SelectItem key={level} value={level.toString()}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateUser}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
