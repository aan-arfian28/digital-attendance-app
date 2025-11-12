import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { Search, Download, ChevronUp, ChevronDown, ChevronsUpDown, AlertCircle, Edit, Trash2 } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
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

interface PaginatedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  totalRows: number
  totalPages: number
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
  Name: string
  SupervisorID?: number
  Role: {
    Name: 'admin' | 'user'
    Position: string
    PositionLevel: number
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
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  // Debounce search
  const debouncedSearch = useDebounce(search, 500)
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isExporting, setIsExporting] = useState(false)

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

  // Fetch users (both admins and non-admins) with pagination
  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ['users', page, pageSize, debouncedSearch, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
        role: 'all', // Fetch all users (both admin and non-admin)
        ...(debouncedSearch && { search: debouncedSearch }),
      })
      
      // Fetch all users with single endpoint
      const response = await fetch(`${API_BASE_URL}/admin/users?${params}`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Failed to fetch users')
      const data: PaginatedResponse<User> = await response.json()

      return data
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  const users = paginatedData?.data || []
  const totalPages = paginatedData?.totalPages || 1

  // Fetch roles (all for dropdown)
  const { data: rolesResponse } = useQuery({
    queryKey: ['roles-all'],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '100',
        sortBy: 'position_level',
        sortOrder: 'asc',
      })
      const response = await fetch(`${API_BASE_URL}/admin/users/roles?${params}`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Failed to fetch roles')
      return response.json() as Promise<PaginatedResponse<Role>>
    },
    staleTime: 300000, // 5 minutes
  })

  const roles = rolesResponse?.data || []

  // Fetch potential supervisors
  const { data: supervisors = [] } = useQuery({
    queryKey: ['supervisors', formData.PositionLevel],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '1000', // Large page size to get all users
        sortBy: 'name',
        sortOrder: 'asc',
        role: 'all', // Fetch all users
      })
      
      // Fetch all users with single endpoint
      const response = await fetch(`${API_BASE_URL}/admin/users?${params}`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Failed to fetch users')
      const data: PaginatedResponse<User> = await response.json()

      // Handle null responses and filter by position level
      const allUsers = Array.isArray(data.data) ? data.data : []
      return allUsers.filter((user) => user.PositionLevel < formData.PositionLevel)
    },
    enabled: formData.PositionLevel > 0,
    staleTime: 60000,
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      await queryClient.invalidateQueries({ queryKey: ['supervisors'] })
      await queryClient.refetchQueries({ queryKey: ['users'] })
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      await queryClient.invalidateQueries({ queryKey: ['supervisors'] })
      await queryClient.refetchQueries({ queryKey: ['users'] })
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      await queryClient.invalidateQueries({ queryKey: ['supervisors'] })
      await queryClient.refetchQueries({ queryKey: ['users'] })
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
      Name: formData.Name,
      SupervisorID: formData.SupervisorID,
      Role: {
        Name: formData.Role,
        Position: formData.Position,
        PositionLevel: formData.PositionLevel,
      },
    }

    createUserMutation.mutate(createData)
  }

  const handleEditUser = () => {
    if (!selectedUser) return

    const updateData: Partial<CreateUserData> = {
      Username: formData.Username,
      Email: formData.Email,
      Name: formData.Name,
      SupervisorID: formData.SupervisorID,
      Role: {
        Name: formData.Role as 'admin' | 'user',
        Position: formData.Position,
        PositionLevel: formData.PositionLevel,
      },
    }

    if (formData.Password) {
      updateData.Password = formData.Password
    }

    updateUserMutation.mutate({ id: selectedUser.ID, data: updateData })
  }

  const handleDeleteUser = (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus user ini?')) {
      deleteUserMutation.mutate(id)
    }
  }

  const openEditModal = (user: User) => {
    // Clear form data when switching from create to edit modal
    resetForm()
    
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

  // Export to Excel
  const exportToExcel = async () => {
    setIsExporting(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${API_BASE_URL}/admin/users/export/excel`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })

      if (!response.ok) {
        throw new Error('Failed to export users')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export users. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Table columns - Part 1
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'ID',
      header: () => {
        const isActive = sortBy === 'id'
        const isAsc = sortOrder === 'asc'
        
        return (
          <button
            className="flex items-center gap-2 font-semibold"
            onClick={() => {
              if (isActive) {
                setSortOrder(isAsc ? 'desc' : 'asc')
              } else {
                setSortBy('id')
                setSortOrder('asc')
              }
            }}
          >
            ID
            {isActive ? (
              isAsc ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )
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
      header: () => {
        const isActive = sortBy === 'role'
        const isAsc = sortOrder === 'asc'
        
        return (
          <button
            className="flex items-center gap-2 font-semibold"
            onClick={() => {
              if (isActive) {
                setSortOrder(isAsc ? 'desc' : 'asc')
              } else {
                setSortBy('role')
                setSortOrder('asc')
              }
            }}
          >
            Role
            {isActive ? (
              isAsc ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )
            ) : (
              <ChevronsUpDown className="h-4 w-4" />
            )}
          </button>
        )
      },
      cell: ({ row }) => row.original.Role,
    },
    {
      accessorKey: 'Position',
      header: 'Posisi',
    },
    {
      accessorKey: 'PositionLevel',
      header: () => {
        const isActive = sortBy === 'position_level'
        const isAsc = sortOrder === 'asc'
        
        return (
          <button
            className="flex items-center gap-2 font-semibold"
            onClick={() => {
              if (isActive) {
                setSortOrder(isAsc ? 'desc' : 'asc')
              } else {
                setSortBy('position_level')
                setSortOrder('asc')
              }
            }}
          >
            Level Posisi
            {isActive ? (
              isAsc ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )
            ) : (
              <ChevronsUpDown className="h-4 w-4" />
            )}
          </button>
        )
      },
      cell: ({ row }) => row.original.PositionLevel,
    },
    {
      id: 'supervisor',
      accessorFn: (row) => row.Supervisor?.SupervisorName || 'N/A',
      header: 'Supervisor',
    },
    {
      id: 'actions',
      header: 'Aksi',
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
              title="Hapus"
            >
              <Trash2 className="h-4 w-4" />
              Hapus
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
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: totalPages,
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">User Management</h1>
        <p className="text-gray-600">Kelola akun dan hak akses user</p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Cari berdasarkan email, role, atau posisi..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearch(e.target.value)
              setPage(1) // Reset to first page on search
            }}
            className="pl-10 rounded-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={exportToExcel}
            disabled={isExporting}
            className="border-gray-300 rounded-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </Button>
          
          <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
            // Don't auto-close on outside click - only handle explicit close
            if (!open) {
              setIsCreateModalOpen(false)
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                className="bg-[#428bff] hover:bg-[#3b7ee6] text-white rounded-sm"
                onClick={() => {
                  setIsCreateModalOpen(true)
                  // Don't clear form - keep prefilled data if exists
                }}
              >
                Buat User
              </Button>
            </DialogTrigger>
            <DialogContent 
              className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm"
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Buat User Baru</DialogTitle>
                <DialogDescription>
                  Tambahkan user baru ke sistem. Isi semua field yang diperlukan.
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
                  <Label htmlFor="name">Nama Lengkap *</Label>
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
                  <Label htmlFor="position">Posisi *</Label>
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
                      <SelectValue placeholder="Pilih posisi" />
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
                    <Label htmlFor="supervisor">Supervisor (Opsional)</Label>
                    <Select
                      value={formData.SupervisorID?.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, SupervisorID: parseInt(value) })
                      }
                    >
                      <SelectTrigger id="supervisor" className="rounded-sm">
                        <SelectValue placeholder="Pilih supervisor" />
                      </SelectTrigger>
                      <SelectContent className="rounded-sm">
                        <SelectItem value="0">Tidak Ada</SelectItem>
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
                    resetForm() // Clear form data
                    setIsCreateModalOpen(false) // Close modal
                  }}
                  className="rounded-sm"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                  className="bg-[#428bff] hover:bg-[#3b7ee6] rounded-sm"
                >
                  {createUserMutation.isPending ? 'Membuat...' : 'Buat User'}
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
                    Memuat user...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                    Tidak ada user ditemukan
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Baris per halaman:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value))
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-20 rounded-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm text-gray-700">
              Menampilkan {(page - 1) * pageSize + 1} ke{' '}
              {Math.min(page * pageSize, paginatedData?.totalRows || 0)}{' '}
              dari {paginatedData?.totalRows || 0} hasil
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-sm"
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-sm"
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        // Don't auto-close on outside click - only handle explicit close
        if (!open) {
          setIsEditModalOpen(false)
        }
      }}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onCloseAutoFocus={() => {
            // Clear form when X button is clicked (modal closes)
            resetForm()
            setSelectedUser(null)
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Perbarui informasi user. Kosongkan password untuk tetap menggunakan password saat ini.
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
              <Label htmlFor="edit-password">Password (kosongkan untuk tetap menggunakan password saat ini)</Label>
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
              <Label htmlFor="edit-name">Nama Lengkap</Label>
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
              <Label htmlFor="edit-position">Posisi</Label>
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
                    <SelectItem value="0">Tidak Ada</SelectItem>
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
                resetForm() // Clear form data
                setSelectedUser(null)
                setIsEditModalOpen(false) // Close modal
              }}
              className="rounded-sm"
            >
              Batal
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={updateUserMutation.isPending}
              className="bg-[#428bff] hover:bg-[#3b7ee6] rounded-sm"
            >
              {updateUserMutation.isPending ? 'Memperbarui...' : 'Perbarui User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}