import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { Download, ChevronUp, ChevronDown, ChevronsUpDown, Eye, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
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
  CheckInLatitude: number
  CheckInLongitude: number
  CheckOutLatitude: number
  CheckOutLongitude: number
  CheckInPhotoURL: string
  CheckOutPhotoURL: string
  Status: string
  ValidationStatus: string
  Notes: string
}

interface LeaveRequestRecord {
  ID: number
  LeaveType: string
  StartDate: string
  EndDate: string
  Reason: string
  AttachmentURL: string
  Status: string
  ApproverNotes: string
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
  const [attendanceSortOrder, setAttendanceSortOrder] = useState<'asc' | 'desc' | null>('desc') // Default: newest first
  const [leaveSortOrder, setLeaveSortOrder] = useState<'asc' | 'desc' | null>('desc') // Default: newest first
  
  // Detail modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | LeaveRequestRecord | null>(null)

  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['my-attendance'],
    queryFn: fetchMyAttendanceHistory,
    staleTime: 0,
    refetchInterval: 3000, // Refetch every 3 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const { data: leaveRecords = [], isLoading: leaveLoading } = useQuery({
    queryKey: ['my-leave-requests'],
    queryFn: fetchMyLeaveHistory,
    staleTime: 0,
    refetchInterval: 3000, // Refetch every 3 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const datePart = dateString.split('T')[0]
    const [year, month, day] = datePart.split('-')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    return `${day} ${monthNames[parseInt(month) - 1]} ${year}`
  }

  const formatTime = (dateString: string) => {
    if (!dateString) return '-'
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

  const openDetailModal = useCallback((record: AttendanceRecord | LeaveRequestRecord) => {
    setSelectedRecord(record)
    setIsDetailModalOpen(true)
  }, [])

  // Export to CSV
  const exportAttendanceToCSV = () => {
    const headers = ['Tanggal', 'Check In', 'Check Out', 'Durasi', 'Status', 'Validasi']
    const rows = attendanceRecords.map((record: AttendanceRecord) => [
      formatDate(record.CheckInTime),
      formatTime(record.CheckInTime),
      record.CheckOutTime ? formatTime(record.CheckOutTime) : '-',
      calculateDuration(record.CheckInTime, record.CheckOutTime),
      record.Status === 'ON_TIME' ? 'Tepat Waktu' : record.Status === 'LATE' ? 'Terlambat' : record.Status,
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
    const headers = ['Periode', 'Tipe', 'Alasan', 'Status']
    const rows = leaveRecords.map((record: LeaveRequestRecord) => [
      `${formatDate(record.StartDate)} - ${formatDate(record.EndDate)}`,
      record.LeaveType === 'SICK' ? 'Sakit' : 'Izin',
      record.Reason,
      record.Status === 'APPROVED' ? 'Disetujui' : record.Status === 'REJECTED' ? 'Ditolak' : 'Menunggu',
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
    if (attendanceSortOrder === 'desc') {
      setAttendanceSortOrder('asc')
    } else if (attendanceSortOrder === 'asc') {
      setAttendanceSortOrder('desc')
    } else {
      setAttendanceSortOrder('desc')
    }
  }

  const toggleLeaveSort = () => {
    if (leaveSortOrder === 'desc') {
      setLeaveSortOrder('asc')
    } else if (leaveSortOrder === 'asc') {
      setLeaveSortOrder('desc')
    } else {
      setLeaveSortOrder('desc')
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Riwayat Absensi</h1>
        <p className="text-gray-600">Lihat riwayat absensi dan pengajuan izin Anda</p>
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
          Absensi
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'leave'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pengajuan Izin
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
                      Tanggal
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
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Durasi</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Validasi</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attendanceLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Memuat data...
                    </td>
                  </tr>
                ) : attendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Tidak ada catatan absensi
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
                          {record.Status === 'ON_TIME' ? 'Tepat Waktu' : record.Status === 'LATE' ? 'Terlambat' : record.Status}
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
                          {record.ValidationStatus === 'PRESENT' ? 'Hadir'
                            : record.ValidationStatus === 'ABSENT' ? 'Tidak Hadir'
                          : record.ValidationStatus === 'PENDING' ? 'Menunggu'
                          : record.ValidationStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailModal(record)}
                          className="bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100 rounded-sm"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Detail
                        </Button>
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
              <span className="text-sm text-gray-700">Baris per halaman:</span>
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
                Halaman {getCurrentPage() + 1} dari {getTotalPages() || 1}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(getCurrentPage() - 1)}
                  disabled={getCurrentPage() === 0}
                  className="rounded-sm"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(getCurrentPage() + 1)}
                  disabled={getCurrentPage() >= getTotalPages() - 1}
                  className="rounded-sm"
                >
                  Selanjutnya
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
                      Periode
                      {leaveSortOrder === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : leaveSortOrder === 'desc' ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronsUpDown className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tipe</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Alasan</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leaveLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Memuat data...
                    </td>
                  </tr>
                ) : leaveRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Tidak ada pengajuan izin
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
                          {record.Status === 'APPROVED' ? 'Disetujui' : record.Status === 'REJECTED' ? 'Ditolak' : 'Menunggu'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailModal(record)}
                          className="bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100 rounded-sm"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Detail
                        </Button>
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
              <span className="text-sm text-gray-700">Baris per halaman:</span>
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
                Halaman {getCurrentPage() + 1} dari {getTotalPages() || 1}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(getCurrentPage() - 1)}
                  disabled={getCurrentPage() === 0}
                  className="rounded-sm"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(getCurrentPage() + 1)}
                  disabled={getCurrentPage() >= getTotalPages() - 1}
                  className="rounded-sm"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDetailModalOpen(false)
        }
      }}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-sm"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {selectedRecord && 'CheckInTime' in selectedRecord ? 'Detail Catatan Absensi' : 'Detail Pengajuan Izin'}
            </DialogTitle>
            <DialogDescription>
              Lihat detail lengkap {selectedRecord && 'CheckInTime' in selectedRecord ? 'catatan absensi' : 'pengajuan izin'}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Record Details */}
            <div className="p-4 bg-gray-50 rounded-sm border">
              <h3 className="font-semibold text-gray-900 mb-3">Detail</h3>
              {selectedRecord && 'CheckInTime' in selectedRecord ? (
                // Attendance Record
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Tanggal:</span>
                    <span className="font-medium text-gray-900">{formatDate(selectedRecord.CheckInTime)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Check In:</span>
                    <span className="font-medium text-gray-900">{formatTime(selectedRecord.CheckInTime)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Check Out:</span>
                    <span className="font-medium text-gray-900">
                      {selectedRecord.CheckOutTime ? formatTime(selectedRecord.CheckOutTime) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Durasi:</span>
                    <span className="font-medium text-gray-900">
                      {calculateDuration(selectedRecord.CheckInTime, selectedRecord.CheckOutTime)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-gray-900">
                      {selectedRecord.Status === 'ON_TIME' ? 'Tepat Waktu' : selectedRecord.Status === 'LATE' ? 'Terlambat' : selectedRecord.Status}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Validasi:</span>
                    <span className="font-medium text-gray-900">
                      {selectedRecord.ValidationStatus === 'PRESENT' ? 'Hadir'
                        : selectedRecord.ValidationStatus === 'ABSENT' ? 'Tidak Hadir'
                        : selectedRecord.ValidationStatus === 'LEAVE' ? 'Izin'
                        : selectedRecord.ValidationStatus === 'PENDING' ? 'Menunggu'
                        : selectedRecord.ValidationStatus}
                    </span>
                  </div>
                  {selectedRecord.Notes && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Catatan:</span>
                      <span className="font-medium text-gray-900">{selectedRecord.Notes}</span>
                    </div>
                  )}
                </div>
              ) : selectedRecord && 'LeaveType' in selectedRecord ? (
                // Leave Request
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Tipe Izin:</span>
                    <span className="font-medium text-gray-900">
                      {selectedRecord.LeaveType === 'SICK' ? 'Sakit' : 'Izin'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Periode:</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(selectedRecord.StartDate)} - {formatDate(selectedRecord.EndDate)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Alasan:</span>
                    <span className="font-medium text-gray-900">{selectedRecord.Reason}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-gray-900">
                      {selectedRecord.Status === 'APPROVED' ? 'Disetujui' : selectedRecord.Status === 'REJECTED' ? 'Ditolak' : 'Menunggu'}
                    </span>
                  </div>
                  {selectedRecord.ApproverNotes && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Catatan Approver:</span>
                      <span className="font-medium text-gray-900">{selectedRecord.ApproverNotes}</span>
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
                    <h3 className="font-semibold text-gray-900">Foto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedRecord.CheckInPhotoURL && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Foto Check In</p>
                          <div className="border rounded-sm overflow-hidden bg-gray-100">
                            <img
                              src={getFullFileURL(selectedRecord.CheckInPhotoURL)}
                              alt="Check In Photo"
                              className="w-full h-auto object-contain max-h-96"
                            />
                          </div>
                          <a
                            href={getFullFileURL(selectedRecord.CheckInPhotoURL)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            Lihat ukuran penuh
                          </a>
                        </div>
                      )}
                      {selectedRecord.CheckOutPhotoURL && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Foto Check Out</p>
                          <div className="border rounded-sm overflow-hidden bg-gray-100">
                            <img
                              src={getFullFileURL(selectedRecord.CheckOutPhotoURL)}
                              alt="Check Out Photo"
                              className="w-full h-auto object-contain max-h-96"
                            />
                          </div>
                          <a
                            href={getFullFileURL(selectedRecord.CheckOutPhotoURL)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            Lihat ukuran penuh
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Leave Attachment Preview */}
                {'AttachmentURL' in selectedRecord && selectedRecord.AttachmentURL && (
                  <div className="grid gap-3">
                    <h3 className="font-semibold text-gray-900">Lampiran</h3>
                    <div className="border rounded-sm overflow-hidden bg-gray-50">
                      {isPDF(selectedRecord.AttachmentURL) ? (
                        // PDF Preview
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-gray-700">Dokumen PDF</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(getFullFileURL(selectedRecord.AttachmentURL), '_blank')}
                              className="rounded-sm"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Buka di Tab Baru
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
                              target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="16" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EGambar tidak tersedia%3C/text%3E%3C/svg%3E'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRecord(null)
                setIsDetailModalOpen(false)
              }}
              className="rounded-sm"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}