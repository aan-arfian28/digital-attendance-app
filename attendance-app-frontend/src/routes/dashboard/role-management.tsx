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

export const Route = createFileRoute('/dashboard/role-management')({
  component: RoleManagement,
})

// Types
interface Role {
  id: number
  role: string
  position: string
  positionLevel: number
}

interface CreateRoleData {
  role: string
  position: string
  positionLevel: number
}

function RoleManagement() {
  return (
    <RoleGuard adminOnly={true}>
      <RoleManagementContent />
    </RoleGuard>
  )
}

function RoleManagementContent() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  
  // Form state
  const [formData, setFormData] = useState<CreateRoleData>({
    role: '',
    position: '',
    positionLevel: 1,
  })
  
  // Error states
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateRoleData, string>>>({})

  // Dummy data for roles
  const [roles, setRoles] = useState<Role[]>([
    {
      id: 1,
      role: 'admin',
      position: 'Admin',
      positionLevel: 1,
    },
    {
      id: 2,
      role: 'user',
      position: 'Headmaster',
      positionLevel: 2,
    },
    {
      id: 3,
      role: 'user',
      position: 'Teacher',
      positionLevel: 3,
    },
    {
      id: 4,
      role: 'user',
      position: 'Student',
      positionLevel: 4,
    },
  ])

  // Form handling functions
  const resetForm = () => {
    setFormData({
      role: '',
      position: '',
      positionLevel: 1,
    })
    setFieldErrors({})
    setErrorMessage('')
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CreateRoleData, string>> = {}
    
    if (!formData.role.trim()) {
      errors.role = 'Role is required'
    }
    if (!formData.position.trim()) {
      errors.position = 'Position is required'
    }
    if (formData.positionLevel < 1) {
      errors.positionLevel = 'Position level must be at least 1'
    }

    // Check for duplicate position
    const isDuplicate = roles.some(role => 
      role.position.toLowerCase() === formData.position.toLowerCase().trim() && 
      (!editingRole || role.id !== editingRole.id)
    )
    if (isDuplicate) {
      errors.position = 'This position already exists'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateRole = () => {
    if (!validateForm()) return

    const newRole: Role = {
      id: Math.max(...roles.map(r => r.id)) + 1,
      role: formData.role,
      position: formData.position.trim(),
      positionLevel: formData.positionLevel,
    }

    setRoles([...roles, newRole])
    setIsCreateModalOpen(false)
    resetForm()
  }

  const openEditModal = (role: Role) => {
    setEditingRole(role)
    setFormData({
      role: role.role,
      position: role.position,
      positionLevel: role.positionLevel,
    })
    setIsEditModalOpen(true)
  }

  const handleUpdateRole = () => {
    if (!validateForm() || !editingRole) return

    setRoles(roles.map(role => 
      role.id === editingRole.id 
        ? { ...role, role: formData.role, position: formData.position.trim(), positionLevel: formData.positionLevel }
        : role
    ))
    setIsEditModalOpen(false)
    setEditingRole(null)
    resetForm()
  }

  const handleDeleteRole = (roleId: number) => {
    if (confirm('Are you sure you want to delete this role?')) {
      setRoles(roles.filter(role => role.id !== roleId))
    }
  }

  const moveRoleUp = (roleId: number) => {
    const roleIndex = roles.findIndex(r => r.id === roleId)
    if (roleIndex <= 0) return

    const newRoles = [...roles]
    const currentRole = newRoles[roleIndex]
    const aboveRole = newRoles[roleIndex - 1]
    
    // Swap position levels
    const tempLevel = currentRole.positionLevel
    currentRole.positionLevel = aboveRole.positionLevel
    aboveRole.positionLevel = tempLevel
    
    setRoles(newRoles)
  }

  const moveRoleDown = (roleId: number) => {
    const roleIndex = roles.findIndex(r => r.id === roleId)
    if (roleIndex >= roles.length - 1) return

    const newRoles = [...roles]
    const currentRole = newRoles[roleIndex]
    const belowRole = newRoles[roleIndex + 1]
    
    // Swap position levels
    const tempLevel = currentRole.positionLevel
    currentRole.positionLevel = belowRole.positionLevel
    belowRole.positionLevel = tempLevel
    
    setRoles(newRoles)
  }

  // Export to CSV function
  const exportToCSV = () => {
    const csvContent = [
      ['Role', 'Position', 'Position Level'],
      ...roles.map(role => [role.role, role.position, role.positionLevel.toString()])
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
      accessorKey: 'role',
      header: 'Role',
      enableSorting: false,
    },
    {
      accessorKey: 'position',
      header: 'Position',
      enableSorting: false,
    },
    {
      accessorKey: 'positionLevel',
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
        const roleIndex = roles.findIndex(r => r.id === role.id)
        
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
              onClick={() => moveRoleUp(role.id)}
              disabled={roleIndex === 0}
              className="bg-green-50 border-green-300 text-green-600 hover:bg-green-100 rounded-sm"
              title="Change up"
            >
              <ArrowUp className="h-4 w-4" />
              Change up
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => moveRoleDown(role.id)}
              disabled={roleIndex === roles.length - 1}
              className="bg-yellow-50 border-yellow-300 text-yellow-600 hover:bg-yellow-100 rounded-sm"
              title="Change down"
            >
              <ArrowDown className="h-4 w-4" />
              Change down
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteRole(role.id)}
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
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger className="rounded-sm">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-sm">
                      <SelectItem value="admin">admin</SelectItem>
                      <SelectItem value="user">user</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldErrors.role && (
                    <p className="text-sm text-red-500">{fieldErrors.role}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, position: e.target.value })}
                    className={fieldErrors.position ? 'border-red-500 rounded-sm' : 'rounded-sm'}
                    placeholder="e.g., Teacher, Manager"
                  />
                  {fieldErrors.position && (
                    <p className="text-sm text-red-500">{fieldErrors.position}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="positionLevel">Position Level *</Label>
                  <Input
                    id="positionLevel"
                    type="number"
                    min="1"
                    value={formData.positionLevel}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, positionLevel: parseInt(e.target.value) || 1 })}
                    className={fieldErrors.positionLevel ? 'border-red-500 rounded-sm' : 'rounded-sm'}
                  />
                  {fieldErrors.positionLevel && (
                    <p className="text-sm text-red-500">{fieldErrors.positionLevel}</p>
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
                  className="bg-[#428bff] hover:bg-[#3b7ee6] text-white rounded-sm"
                >
                  Create Role
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
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger className="rounded-sm">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="user">user</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.role && (
                <p className="text-sm text-red-500">{fieldErrors.role}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-position">Position *</Label>
              <Input
                id="edit-position"
                value={formData.position}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, position: e.target.value })}
                className={fieldErrors.position ? 'border-red-500 rounded-sm' : 'rounded-sm'}
                placeholder="e.g., Teacher, Manager"
              />
              {fieldErrors.position && (
                <p className="text-sm text-red-500">{fieldErrors.position}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-positionLevel">Position Level *</Label>
              <Input
                id="edit-positionLevel"
                type="number"
                min="1"
                value={formData.positionLevel}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, positionLevel: parseInt(e.target.value) || 1 })}
                className={fieldErrors.positionLevel ? 'border-red-500 rounded-sm' : 'rounded-sm'}
              />
              {fieldErrors.positionLevel && (
                <p className="text-sm text-red-500">{fieldErrors.positionLevel}</p>
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
              className="bg-[#428bff] hover:bg-[#3b7ee6] text-white rounded-sm"
            >
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}