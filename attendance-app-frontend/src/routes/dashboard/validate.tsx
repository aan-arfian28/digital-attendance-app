import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ExternalLink } from 'lucide-react'
import RoleGuard from '@/components/RoleGuard'
import SubordinateGuard from '@/components/SubordinateGuard'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/dashboard/validate')({
  component: ValidateAttendance,
})

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// Helper to get auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

// Types
interface User {
  ID: number
  Username: string
  Email: string
}

interface AttendanceRecord {
  ID: number
  UserID: number
  User: User
  CheckInTime: string | null
  CheckOutTime: string | null
  CheckInLatitude: number
  CheckInLongitude: number
  CheckOutLatitude: number
  CheckOutLongitude: number
  CheckInPhotoURL: string
  CheckOutPhotoURL: string
  Status: string
  ValidationStatus: string
  ValidatorID: number | null
  Notes: string
}

interface LeaveRequestRecord {
  ID: number
  UserID: number
  User: User
  LeaveType: string
  StartDate: string
  EndDate: string
  Reason: string
  AttachmentURL: string
  Status: string
  ApproverID: number | null
  ApproverNotes: string
}

interface AttendanceValidationPayload {
  validationStatus: string
  notes: string
}

interface LeaveValidationPayload {
  status: string
  approverNotes: string
}

function ValidateAttendance() {
  return (
    <RoleGuard userOnly={true}>
      <SubordinateGuard>
        <ValidateAttendanceContent />
      </SubordinateGuard>
    </RoleGuard>
  )
}

function ValidateAttendanceContent() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave'>('attendance')
  
  // OPTIMIZED: Group modal-related state untuk atomic updates
  const [isValidateModalOpen, setIsValidateModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | LeaveRequestRecord | null>(null)
  const [validationAction, setValidationAction] = useState<'approve' | 'reject'>('approve')
  const [validationStatus, setValidationStatus] = useState<string>('')
  const [validationNote, setValidationNote] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  
  // OPTIMIZED: Group pagination state untuk atomic updates
  const [attendancePage, setAttendancePage] = useState(0)
  const [attendancePageSize, setAttendancePageSize] = useState(10)
  const [leavePage, setLeavePage] = useState(0)
  const [leavePageSize, setLeavePageSize] = useState(10)

  // Fetch subordinate attendance records
  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['subordinate-attendance'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/user/attendance/subordinates`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Failed to fetch attendance records')
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  // Fetch subordinate leave requests
  const { data: leaveRequests = [], isLoading: leaveLoading } = useQuery({
    queryKey: ['subordinate-leave-requests'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/user/leave/subordinates`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Failed to fetch leave requests')
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  // Validate attendance mutation
  const validateAttendanceMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: AttendanceValidationPayload }) => {
      const response = await fetch(`${API_BASE_URL}/user/attendance/update/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to validate attendance')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subordinate-attendance'] })
      setIsValidateModalOpen(false)
      setSelectedRecord(null)
      setValidationNote('')
      setValidationStatus('')
      setErrorMessage('')
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
    },
  })

  // Validate leave request mutation - OPTIMIZED: Conditional invalidation
  const validateLeaveMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: LeaveValidationPayload }) => {
      const response = await fetch(`${API_BASE_URL}/user/leave/validate/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to validate leave request')
      }
      return response.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subordinate-leave-requests'] })
      // OPTIMIZED: Hanya invalidate attendance jika leave APPROVED (affects attendance records)
      if (variables.payload.status === 'APPROVED') {
        queryClient.invalidateQueries({ queryKey: ['subordinate-attendance'] })
      }
      setIsValidateModalOpen(false)
      setSelectedRecord(null)
      setValidationNote('')
      setValidationStatus('')
      setErrorMessage('')
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
    },
  })

  // Helper functions
  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const datePart = dateString.split('T')[0]
    const [year, month, day] = datePart.split('-')
    return `${day} ${monthNames[parseInt(month) - 1]} ${year}`
  }

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-'
    const timePart = dateString.split('T')[1]?.split('.')[0] || dateString.split('T')[1]?.split('+')[0]
    if (!timePart) return '-'
    const [hours, minutes] = timePart.split(':')
    return `${hours}.${minutes}`
  }

  const calculateDuration = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return '-'
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const diff = end.getTime() - start.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ON_TIME':
      case 'PRESENT':
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'LATE':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'ABSENT':
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'LEAVE':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'DIDNT_CHECKOUT':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const formatStatusText = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ON_TIME':
        return 'On Time'
      case 'DIDNT_CHECKOUT':
        return "Didn't Checkout"
      default:
        return status.charAt(0) + status.slice(1).toLowerCase()
    }
  }

  const formatLeaveType = (leaveType: string) => {
    switch (leaveType.toUpperCase()) {
      case 'SICK':
        return 'Sakit'
      case 'PERMIT':
        return 'Izin'
      default:
        return leaveType
    }
  }

  // Helper to check if URL is a PDF
  const isPDF = (url: string) => {
    return url?.toLowerCase().endsWith('.pdf')
  }

  // Helper to get full URL for uploaded files
  const getFullFileURL = (relativePath: string) => {
    if (!relativePath) return ''
    // If it's already a full URL, return as is
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath
    }
    // Otherwise, prepend the backend base URL (without /api)
    const baseURL = API_BASE_URL.replace('/api', '')
    return `${baseURL}${relativePath}`
  }

  const openValidateModal = useCallback((record: AttendanceRecord | LeaveRequestRecord, action: 'approve' | 'reject') => {
    // Only reset form if it's a different record or different action
    // This allows X button to preserve form data when reopening same validation
    const isSameValidation = 
      selectedRecord?.ID === record.ID && 
      validationAction === action

    if (!isSameValidation) {
      setValidationNote('')
      setErrorMessage('')
    }
    
    setSelectedRecord(record)
    setValidationAction(action)
    
    // Set default validation status based on action and record type
    if ('CheckInTime' in record) {
      // Attendance record
      setValidationStatus(action === 'approve' ? 'PRESENT' : 'REJECTED')
    } else {
      // Leave request
      setValidationStatus(action === 'approve' ? 'APPROVED' : 'REJECTED')
    }
    
    setIsValidateModalOpen(true)
  }, [selectedRecord, validationAction])

  const handleValidate = useCallback(() => {
    if (!selectedRecord) return

    // Validate rejection requires a note
    if (validationAction === 'reject' && !validationNote.trim()) {
      setErrorMessage('Please provide a reason for rejection')
      return
    }

    if ('CheckInTime' in selectedRecord) {
      // Attendance validation
      const payload: AttendanceValidationPayload = {
        validationStatus: validationStatus,
        notes: validationNote,
      }
      validateAttendanceMutation.mutate({ id: selectedRecord.ID, payload })
    } else {
      // Leave request validation
      const payload: LeaveValidationPayload = {
        status: validationStatus,
        approverNotes: validationNote,
      }
      validateLeaveMutation.mutate({ id: selectedRecord.ID, payload })
    }
  }, [selectedRecord, validationAction, validationNote, validationStatus, validateAttendanceMutation, validateLeaveMutation])

  const setCurrentPage = useCallback((page: number) => {
    if (activeTab === 'attendance') {
      setAttendancePage(page)
    } else {
      setLeavePage(page)
    }
  }, [activeTab])

  const setCurrentPageSize = useCallback((size: number) => {
    if (activeTab === 'attendance') {
      setAttendancePageSize(size)
      setAttendancePage(0)
    } else {
      setLeavePageSize(size)
      setLeavePage(0)
    }
  }, [activeTab])

  // OPTIMIZED: Memoize pagination data untuk prevent recalculation
  const paginatedAttendance = useMemo(() => {
    const start = attendancePage * attendancePageSize
    const end = start + attendancePageSize
    return attendanceRecords.slice(start, end)
  }, [attendanceRecords, attendancePage, attendancePageSize])

  const paginatedLeave = useMemo(() => {
    const start = leavePage * leavePageSize
    const end = start + leavePageSize
    return leaveRequests.slice(start, end)
  }, [leaveRequests, leavePage, leavePageSize])

  const totalAttendancePages = useMemo(() => 
    Math.ceil(attendanceRecords.length / attendancePageSize),
    [attendanceRecords.length, attendancePageSize]
  )

  const totalLeavePages = useMemo(() =>
    Math.ceil(leaveRequests.length / leavePageSize),
    [leaveRequests.length, leavePageSize]
  )

  // Pagination helpers
  const getCurrentPageData = () => {
    return activeTab === 'attendance' ? paginatedAttendance : paginatedLeave
  }

  const getTotalPages = () => {
    return activeTab === 'attendance' ? totalAttendancePages : totalLeavePages
  }

  const getCurrentPage = () => {
    return activeTab === 'attendance' ? attendancePage : leavePage
  }

  const paginatedData = getCurrentPageData()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Validate Subordinates</h1>
        <p className="text-gray-600">Review and validate attendance records and leave requests from your subordinates</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'attendance'
              ? 'border-[#428bff] text-[#428bff]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Attendance Records
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'leave'
              ? 'border-[#428bff] text-[#428bff]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Leave Requests
        </button>
      </div>

      {/* Attendance Table */}
      {activeTab === 'attendance' && (
        <div className="border rounded-sm overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Employee</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Check In</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Check Out</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Duration</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Validation</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attendanceLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Loading records...
                    </td>
                  </tr>
                ) : attendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No pending attendance records to validate
                    </td>
                  </tr>
                ) : (
                  (paginatedData as AttendanceRecord[]).map((record: AttendanceRecord) => (
                    <tr key={record.ID} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{record.User.Username}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatDate(record.CheckInTime || '')}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatTime(record.CheckInTime)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatTime(record.CheckOutTime)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {calculateDuration(record.CheckInTime, record.CheckOutTime)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium border ${getStatusBadgeClass(record.Status)}`}>
                          {formatStatusText(record.Status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium border ${getStatusBadgeClass(record.ValidationStatus)}`}>
                          {formatStatusText(record.ValidationStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openValidateModal(record, 'reject')}
                            className="bg-red-50 border-red-300 text-red-600 hover:bg-red-100 rounded-sm"
                            title="Reject"
                            disabled={record.ValidationStatus !== 'PENDING'}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openValidateModal(record, 'approve')}
                            className="bg-green-50 border-green-300 text-green-600 hover:bg-green-100 rounded-sm"
                            title="Approve"
                            disabled={record.ValidationStatus !== 'PENDING'}
                          >
                            Approve
                          </Button>
                        </div>
                      </td>
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
                value={attendancePageSize.toString()}
                onValueChange={(value) => setCurrentPageSize(Number(value))}
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
                Page {getCurrentPage() + 1} of {getTotalPages() || 1}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(getCurrentPage() - 1)}
                  disabled={getCurrentPage() === 0}
                  className="rounded-sm"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(getCurrentPage() + 1)}
                  disabled={getCurrentPage() >= getTotalPages() - 1}
                  className="rounded-sm"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Requests Table */}
      {activeTab === 'leave' && (
        <div className="border rounded-sm overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Employee</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Leave Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Period</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Reason</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leaveLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Loading records...
                    </td>
                  </tr>
                ) : leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No pending leave requests to validate
                    </td>
                  </tr>
                ) : (
                  (paginatedData as LeaveRequestRecord[]).map((request: LeaveRequestRecord) => (
                    <tr key={request.ID} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{request.User.Username}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium border bg-purple-100 text-purple-800 border-purple-300">
                          {formatLeaveType(request.LeaveType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDate(request.StartDate)} - {formatDate(request.EndDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{request.Reason}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium border ${getStatusBadgeClass(request.Status)}`}>
                          {formatStatusText(request.Status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openValidateModal(request, 'reject')}
                            className="bg-red-50 border-red-300 text-red-600 hover:bg-red-100 rounded-sm"
                            title="Reject"
                            disabled={request.Status !== 'PENDING'}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openValidateModal(request, 'approve')}
                            className="bg-green-50 border-green-300 text-green-600 hover:bg-green-100 rounded-sm"
                            title="Approve"
                            disabled={request.Status !== 'PENDING'}
                          >
                            Approve
                          </Button>
                        </div>
                      </td>
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
                value={leavePageSize.toString()}
                onValueChange={(value) => setCurrentPageSize(Number(value))}
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
                Page {getCurrentPage() + 1} of {getTotalPages() || 1}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(getCurrentPage() - 1)}
                  disabled={getCurrentPage() === 0}
                  className="rounded-sm"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(getCurrentPage() + 1)}
                  disabled={getCurrentPage() >= getTotalPages() - 1}
                  className="rounded-sm"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      <Dialog open={isValidateModalOpen} onOpenChange={(open) => {
        // Don't auto-close on outside click - only handle explicit close
        if (!open) {
          setIsValidateModalOpen(false)
        }
      }}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-sm"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {validationAction === 'approve' ? 'Approve' : 'Reject'}{' '}
              {activeTab === 'attendance' ? 'Attendance Record' : 'Leave Request'}
            </DialogTitle>
            <DialogDescription>
              {validationAction === 'approve'
                ? 'Confirm approval and add optional notes.'
                : 'Provide a reason for rejection.'}
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <Alert variant="destructive" className="rounded-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-4">
            {/* Record Details */}
            <div className="p-4 bg-gray-50 rounded-sm border">
              <h3 className="font-semibold text-gray-900 mb-3">Details</h3>
              {selectedRecord && 'CheckInTime' in selectedRecord ? (
                // Attendance Record
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Employee:</span>
                    <span className="font-medium text-gray-900">{selectedRecord.User.Username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium text-gray-900">{formatDate(selectedRecord.CheckInTime || '')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check In:</span>
                    <span className="font-medium text-gray-900">{formatTime(selectedRecord.CheckInTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check Out:</span>
                    <span className="font-medium text-gray-900">{formatTime(selectedRecord.CheckOutTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium text-gray-900">
                      {calculateDuration(selectedRecord.CheckInTime, selectedRecord.CheckOutTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium border ${getStatusBadgeClass(selectedRecord.Status)}`}>
                      {formatStatusText(selectedRecord.Status)}
                    </span>
                  </div>
                </div>
              ) : selectedRecord && 'LeaveType' in selectedRecord ? (
                // Leave Request
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Employee:</span>
                    <span className="font-medium text-gray-900">{selectedRecord.User.Username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Leave Type:</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium border bg-purple-100 text-purple-800 border-purple-300">
                      {formatLeaveType(selectedRecord.LeaveType)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Period:</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(selectedRecord.StartDate)} - {formatDate(selectedRecord.EndDate)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-600">Reason:</span>
                    <span className="font-medium text-gray-900">{selectedRecord.Reason}</span>
                  </div>
                  {selectedRecord.AttachmentURL && (
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-600">Attachment:</span>
                      <a 
                        href={selectedRecord.AttachmentURL} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-sm flex items-center gap-1"
                      >
                        View Attachment <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Image/PDF Preview Section */}
            {selectedRecord && (
              <div className="grid gap-4">
                {/* Attendance Photos Preview */}
                {'CheckInPhotoURL' in selectedRecord && (selectedRecord.CheckInPhotoURL || selectedRecord.CheckOutPhotoURL) && (
                  <div className="grid gap-3">
                    <h3 className="font-semibold text-gray-900">Photos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Check-in Photo */}
                      {selectedRecord.CheckInPhotoURL && (
                        <div className="border rounded-sm overflow-hidden bg-gray-50">
                          <div className="bg-gray-100 px-3 py-2 border-b">
                            <p className="text-sm font-medium text-gray-700">Check-in Photo</p>
                          </div>
                          <div className="p-2">
                            <img 
                              src={getFullFileURL(selectedRecord.CheckInPhotoURL)} 
                              alt="Check-in"
                              loading="lazy"
                              decoding="async"
                              className="w-full h-auto rounded-sm cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(getFullFileURL(selectedRecord.CheckInPhotoURL), '_blank')}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.onerror = null
                                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="16" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage not available%3C/text%3E%3C/svg%3E'
                              }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Check-out Photo */}
                      {selectedRecord.CheckOutPhotoURL && (
                        <div className="border rounded-sm overflow-hidden bg-gray-50">
                          <div className="bg-gray-100 px-3 py-2 border-b">
                            <p className="text-sm font-medium text-gray-700">Check-out Photo</p>
                          </div>
                          <div className="p-2">
                            <img 
                              src={getFullFileURL(selectedRecord.CheckOutPhotoURL)} 
                              alt="Check-out"
                              loading="lazy"
                              decoding="async"
                              className="w-full h-auto rounded-sm cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(getFullFileURL(selectedRecord.CheckOutPhotoURL), '_blank')}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.onerror = null
                                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="16" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage not available%3C/text%3E%3C/svg%3E'
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Leave Attachment Preview */}
                {'AttachmentURL' in selectedRecord && selectedRecord.AttachmentURL && (
                  <div className="grid gap-3">
                    <h3 className="font-semibold text-gray-900">Attachment</h3>
                    <div className="border rounded-sm overflow-hidden bg-gray-50">
                      {isPDF(selectedRecord.AttachmentURL) ? (
                        // PDF Preview
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-gray-700">PDF Document</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(getFullFileURL(selectedRecord.AttachmentURL), '_blank')}
                              className="rounded-sm"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Open in New Tab
                            </Button>
                          </div>
                          <iframe
                            src={getFullFileURL(selectedRecord.AttachmentURL)}
                            className="w-full h-96 rounded-sm border"
                            title="PDF Preview"
                          />
                        </div>
                      ) : (
                        // Image Preview
                        <div className="p-2">
                          <img 
                            src={getFullFileURL(selectedRecord.AttachmentURL)} 
                            alt="Leave Attachment"
                            loading="lazy"
                            decoding="async"
                            className="w-full h-auto rounded-sm cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(getFullFileURL(selectedRecord.AttachmentURL), '_blank')}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.onerror = null
                              target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="16" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage not available%3C/text%3E%3C/svg%3E'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Validation Status */}
            {selectedRecord && 'CheckInTime' in selectedRecord && (
              <div className="grid gap-2">
                <Label htmlFor="validation-status">Validation Status *</Label>
                <Select value={validationStatus} onValueChange={setValidationStatus}>
                  <SelectTrigger className="rounded-sm">
                    <SelectValue placeholder="Select validation status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-sm">
                    <SelectItem value="PRESENT">Present</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                    <SelectItem value="LEAVE">Leave</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Validation Note */}
            <div className="grid gap-2">
              <Label htmlFor="validation-note">
                {validationAction === 'approve' ? 'Notes (Optional)' : 'Rejection Reason *'}
              </Label>
              <Textarea
                id="validation-note"
                value={validationNote}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setValidationNote(e.target.value)}
                placeholder={
                  validationAction === 'approve'
                    ? 'Add any additional notes...'
                    : 'Please provide a reason for rejection...'
                }
                className="rounded-sm"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                // Clear form data
                setSelectedRecord(null)
                setValidationNote('')
                setValidationStatus('')
                setErrorMessage('')
                // Close modal
                setIsValidateModalOpen(false)
              }}
              className="rounded-sm"
              disabled={validateAttendanceMutation.isPending || validateLeaveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleValidate}
              disabled={validateAttendanceMutation.isPending || validateLeaveMutation.isPending}
              className={
                validationAction === 'approve'
                  ? 'bg-green-600 hover:bg-green-700 text-white rounded-sm'
                  : 'bg-red-600 hover:bg-red-700 text-white rounded-sm'
              }
            >
              {validateAttendanceMutation.isPending || validateLeaveMutation.isPending
                ? 'Processing...'
                : validationAction === 'approve'
                ? 'Approve'
                : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}