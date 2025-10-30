import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Download, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import RoleGuard from '@/components/RoleGuard'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/dashboard/history')({
  component: AttendanceHistory,
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

// OPTIMIZATION: Extract query functions outside component to prevent recreation
const fetchMyAttendanceHistory = async () => {
  const response = await fetch(`${API_BASE_URL}/user/attendance/my-records`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch attendance records')
  const data = await response.json()
  return Array.isArray(data) ? data : []
}

const fetchMyLeaveHistory = async () => {
  const response = await fetch(`${API_BASE_URL}/user/leave/my-requests`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch leave requests')
  const data = await response.json()
  return Array.isArray(data) ? data : []
}

// Types
interface AttendanceRecord {
  ID: number
  CheckInTime: string
  CheckOutTime: string | null
  Status: string
  ValidationStatus: string
}

interface LeaveRequestRecord {
  ID: number
  LeaveType: string
  StartDate: string
  EndDate: string
  Reason: string
  Status: string
}

function AttendanceHistory() {
  return (
    <RoleGuard userOnly={true}>
      <AttendanceHistoryContent />
    </RoleGuard>
  )
}

function AttendanceHistoryContent() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave'>('attendance')
  const [attendancePage, setAttendancePage] = useState(0)
  const [attendancePageSize, setAttendancePageSize] = useState(10)
  const [leavePage, setLeavePage] = useState(0)
  const [leavePageSize, setLeavePageSize] = useState(10)
  const [attendanceSortOrder, setAttendanceSortOrder] = useState<'asc' | 'desc' | null>(null)
  const [leaveSortOrder, setLeaveSortOrder] = useState<'asc' | 'desc' | null>(null)

  // OPTIMIZED: Use extracted query functions + disable aggressive refetching
  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['my-attendance'],
    queryFn: fetchMyAttendanceHistory,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  })

  // Fetch leave requests
  const { data: leaveRecords = [], isLoading: leaveLoading } = useQuery({
    queryKey: ['my-leave-requests'],
    queryFn: fetchMyLeaveHistory,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  })

  // Simple date formatting - extract date part directly from string
  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    // Extract date part: "2025-10-20T06:11:29.111+07:00" → "2025-10-20"
    const datePart = dateString.split('T')[0]
    const [year, month, day] = datePart.split('-')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    return `${day} ${monthNames[parseInt(month) - 1]} ${year}`
  }

  const formatTime = (dateString: string) => {
    if (!dateString) return '-'
    // Extract time part: "2025-10-20T06:11:29.111+07:00" → "06:11"
    const timePart = dateString.split('T')[1]?.split('.')[0]
    if (!timePart) return '-'
    const [hours, minutes] = timePart.split(':')
    return `${hours}.${minutes}`
  }

  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return '-'
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const diff = end.getTime() - start.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  // Export to CSV
  const exportAttendanceToCSV = () => {
    const headers = ['Date', 'Check In', 'Check Out', 'Duration', 'Status', 'Validation']
    const rows = attendanceRecords.map((record: AttendanceRecord) => [
      formatDate(record.CheckInTime),
      formatTime(record.CheckInTime),
      record.CheckOutTime ? formatTime(record.CheckOutTime) : '-',
      calculateDuration(record.CheckInTime, record.CheckOutTime),
      record.Status === 'ON_TIME' ? 'On Time' : record.Status === 'LATE' ? 'Late' : record.Status,
      record.ValidationStatus,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_history_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportLeaveToCSV = () => {
    const headers = ['Period', 'Type', 'Reason', 'Status']
    const rows = leaveRecords.map((record: LeaveRequestRecord) => [
      `${formatDate(record.StartDate)} - ${formatDate(record.EndDate)}`,
      record.LeaveType === 'SICK' ? 'Sakit' : 'Izin',
      record.Reason,
      record.Status === 'APPROVED' ? 'Approved' : record.Status === 'REJECTED' ? 'Rejected' : 'Pending',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leave_history_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Sorting helpers
  const sortAttendanceData = (data: AttendanceRecord[]) => {
    if (!attendanceSortOrder) return data
    
    return [...data].sort((a, b) => {
      const dateA = new Date(a.CheckInTime).getTime()
      const dateB = new Date(b.CheckInTime).getTime()
      
      if (attendanceSortOrder === 'asc') {
        return dateA - dateB
      } else {
        return dateB - dateA
      }
    })
  }

  const sortLeaveData = (data: LeaveRequestRecord[]) => {
    if (!leaveSortOrder) return data
    
    return [...data].sort((a, b) => {
      const dateA = new Date(a.StartDate).getTime()
      const dateB = new Date(b.StartDate).getTime()
      
      if (leaveSortOrder === 'asc') {
        return dateA - dateB
      } else {
        return dateB - dateA
      }
    })
  }

  const toggleAttendanceSort = () => {
    if (!attendanceSortOrder) {
      setAttendanceSortOrder('asc')
    } else if (attendanceSortOrder === 'asc') {
      setAttendanceSortOrder('desc')
    } else {
      setAttendanceSortOrder(null)
    }
  }

  const toggleLeaveSort = () => {
    if (!leaveSortOrder) {
      setLeaveSortOrder('asc')
    } else if (leaveSortOrder === 'asc') {
      setLeaveSortOrder('desc')
    } else {
      setLeaveSortOrder(null)
    }
  }

  // Pagination helpers
  const getCurrentPageData = () => {
    if (activeTab === 'attendance') {
      const sortedData = sortAttendanceData(attendanceRecords)
      const start = attendancePage * attendancePageSize
      const end = start + attendancePageSize
      return sortedData.slice(start, end)
    } else {
      const sortedData = sortLeaveData(leaveRecords)
      const start = leavePage * leavePageSize
      const end = start + leavePageSize
      return sortedData.slice(start, end)
    }
  }

  const getTotalPages = () => {
    if (activeTab === 'attendance') {
      return Math.ceil(attendanceRecords.length / attendancePageSize)
    } else {
      return Math.ceil(leaveRecords.length / leavePageSize)
    }
  }

  const getCurrentPage = () => {
    return activeTab === 'attendance' ? attendancePage : leavePage
  }

  const setCurrentPage = (page: number) => {
    if (activeTab === 'attendance') {
      setAttendancePage(page)
    } else {
      setLeavePage(page)
    }
  }

  const setCurrentPageSize = (size: number) => {
    if (activeTab === 'attendance') {
      setAttendancePageSize(size)
      setAttendancePage(0)
    } else {
      setLeavePageSize(size)
      setLeavePage(0)
    }
  }

  const paginatedData = getCurrentPageData()

  return (
    <div className="p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">History</h1>
        <p className="text-gray-600">View your attendance and leave request history</p>
      </div>

      {/* Export Button */}
      <div className="flex justify-start mb-6">
        <Button
          variant="outline"
          onClick={activeTab === 'attendance' ? exportAttendanceToCSV : exportLeaveToCSV}
          className="border-gray-300 rounded-sm"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-300">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'attendance'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Attendance
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'leave'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
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
                  <th className="px-6 py-3 text-left text-sm">
                    <button
                      className="flex items-center gap-2 font-semibold text-gray-900"
                      onClick={toggleAttendanceSort}
                    >
                      Date
                      {attendanceSortOrder === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : attendanceSortOrder === 'desc' ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronsUpDown className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Check In</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Check Out</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Duration</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attendanceLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Loading records...
                    </td>
                  </tr>
                ) : attendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No attendance records found
                    </td>
                  </tr>
                ) : (
                  (paginatedData as AttendanceRecord[]).map((record: AttendanceRecord) => (
                    <tr key={record.ID} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDate(record.CheckInTime)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatTime(record.CheckInTime)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.CheckOutTime ? formatTime(record.CheckOutTime) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {calculateDuration(record.CheckInTime, record.CheckOutTime)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 text-xs border rounded-sm ${
                            record.Status === 'ON_TIME'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : record.Status === 'LATE'
                              ? 'bg-orange-100 text-orange-800 border-orange-200'
                              : 'bg-gray-100 text-gray-800 border-gray-200'
                          }`}
                        >
                          {record.Status === 'ON_TIME' ? 'On Time' : record.Status === 'LATE' ? 'Late' : record.Status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 text-xs border rounded-sm ${
                            record.ValidationStatus === 'PRESENT'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : record.ValidationStatus === 'ABSENT'
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : record.ValidationStatus === 'LEAVE'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : 'bg-gray-100 text-gray-800 border-gray-200'
                          }`}
                        >
                          {record.ValidationStatus}
                        </span>
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

      {/* Leave Table */}
      {activeTab === 'leave' && (
        <div className="border rounded-sm overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm">
                    <button
                      className="flex items-center gap-2 font-semibold text-gray-900"
                      onClick={toggleLeaveSort}
                    >
                      Period
                      {leaveSortOrder === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : leaveSortOrder === 'desc' ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronsUpDown className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Reason</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leaveLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      Loading records...
                    </td>
                  </tr>
                ) : leaveRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No leave requests found
                    </td>
                  </tr>
                ) : (
                  (paginatedData as LeaveRequestRecord[]).map((record: LeaveRequestRecord) => (
                    <tr key={record.ID} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDate(record.StartDate)} - {formatDate(record.EndDate)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 text-xs border rounded-sm bg-blue-100 text-blue-800 border-blue-200">
                          {record.LeaveType === 'SICK' ? 'Sakit' : 'Izin'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{record.Reason}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 text-xs border rounded-sm ${
                            record.Status === 'APPROVED'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : record.Status === 'REJECTED'
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          }`}
                        >
                          {record.Status === 'APPROVED' ? 'Approved' : record.Status === 'REJECTED' ? 'Rejected' : 'Pending'}
                        </span>
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
    </div>
  )
}