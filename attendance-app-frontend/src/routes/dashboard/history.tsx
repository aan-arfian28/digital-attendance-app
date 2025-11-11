import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { Download, ChevronUp, ChevronDown, ChevronsUpDown, Eye, ExternalLink, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/useDebounce'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

// Types
interface PaginatedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  totalRows: number
  totalPages: number
}

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
  
  // Attendance pagination state
  const [attendancePage, setAttendancePage] = useState(1)
  const [attendancePageSize, setAttendancePageSize] = useState(10)
  const [attendanceSearch, setAttendanceSearch] = useState('')
  const [attendanceSortBy] = useState('check_in_time')
  const [attendanceSortOrder, setAttendanceSortOrder] = useState<'asc' | 'desc'>('desc')
  const debouncedAttendanceSearch = useDebounce(attendanceSearch, 500)
  
  // Leave pagination state
  const [leavePage, setLeavePage] = useState(1)
  const [leavePageSize, setLeavePageSize] = useState(10)
  const [leaveSearch, setLeaveSearch] = useState('')
  const [leaveSortBy] = useState('start_date')
  const [leaveSortOrder, setLeaveSortOrder] = useState<'asc' | 'desc'>('desc')
  const debouncedLeaveSearch = useDebounce(leaveSearch, 500)
  
  const [isExporting, setIsExporting] = useState(false)
  
  // Detail modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | LeaveRequestRecord | null>(null)

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['my-attendance', attendancePage, attendancePageSize, debouncedAttendanceSearch, attendanceSortBy, attendanceSortOrder],
    queryFn: async (): Promise<PaginatedResponse<AttendanceRecord>> => {
      const params = new URLSearchParams({
        page: attendancePage.toString(),
        pageSize: attendancePageSize.toString(),
        sortBy: attendanceSortBy,
        sortOrder: attendanceSortOrder,
        ...(debouncedAttendanceSearch && { search: debouncedAttendanceSearch }),
      })
      const response = await fetch(`${API_BASE_URL}/user/attendance/my-records?${params}`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Failed to fetch attendance records')
      return response.json()
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  const { data: leaveData, isLoading: leaveLoading } = useQuery({
    queryKey: ['my-leave-requests', leavePage, leavePageSize, debouncedLeaveSearch, leaveSortBy, leaveSortOrder],
    queryFn: async (): Promise<PaginatedResponse<LeaveRequestRecord>> => {
      const params = new URLSearchParams({
        page: leavePage.toString(),
        pageSize: leavePageSize.toString(),
        sortBy: leaveSortBy,
        sortOrder: leaveSortOrder,
        ...(debouncedLeaveSearch && { search: debouncedLeaveSearch }),
      })
      const response = await fetch(`${API_BASE_URL}/user/leave/my-requests?${params}`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Failed to fetch leave requests')
      return response.json()
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  const attendanceRecords = attendanceData?.data || []
  const attendanceTotalPages = attendanceData?.totalPages || 1
  const leaveRecords = leaveData?.data || []
  const leaveTotalPages = leaveData?.totalPages || 1

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

  // Export to Excel
  const exportAttendanceToExcel = async () => {
    setIsExporting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/user/attendance/export/excel`, {
        headers: getAuthHeaders(),
      })
      
      if (!response.ok) {
        throw new Error('Failed to export attendance')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my_attendance_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportLeaveToExcel = async () => {
    setIsExporting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/user/leave/export/excel`, {
        headers: getAuthHeaders(),
      })
      
      if (!response.ok) {
        throw new Error('Failed to export leave requests')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my_leave_requests_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Toggle sorting handlers
  const toggleAttendanceSort = () => {
    setAttendanceSortOrder(attendanceSortOrder === 'asc' ? 'desc' : 'asc')
  }

  const toggleLeaveSort = () => {
    setLeaveSortOrder(leaveSortOrder === 'asc' ? 'desc' : 'asc')
  }

  // Get current page data (backend handles pagination)
  const paginatedData = activeTab === 'attendance' ? attendanceRecords : leaveRecords

  return (
    <div className="p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Riwayat Absensi</h1>
        <p className="text-gray-600">Lihat riwayat absensi dan pengajuan izin Anda</p>
      </div>

      {/* Search and Export */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={activeTab === 'attendance' ? 'Cari berdasarkan status atau lokasi...' : 'Cari berdasarkan jenis izin atau status...'}
            value={activeTab === 'attendance' ? attendanceSearch : leaveSearch}
            onChange={(e) => {
              if (activeTab === 'attendance') {
                setAttendanceSearch(e.target.value)
                setAttendancePage(1)
              } else {
                setLeaveSearch(e.target.value)
                setLeavePage(1)
              }
            }}
            className="pl-10 rounded-sm"
          />
        </div>
        
        <Button
          variant="outline"
          onClick={activeTab === 'attendance' ? exportAttendanceToExcel : exportLeaveToExcel}
          disabled={isExporting}
          className="border-gray-300 rounded-sm disabled:opacity-50"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export Excel'}
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Baris per halaman:</span>
                <Select
                  value={attendancePageSize.toString()}
                  onValueChange={(value) => {
                    setAttendancePageSize(Number(value))
                    setAttendancePage(1)
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
                Menampilkan {(attendancePage - 1) * attendancePageSize + 1} ke{' '}
                {Math.min(attendancePage * attendancePageSize, attendanceData?.totalRows || 0)}{' '}
                dari {attendanceData?.totalRows || 0} hasil
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">
                Halaman {attendancePage} dari {attendanceTotalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAttendancePage(p => Math.max(1, p - 1))}
                  disabled={attendancePage === 1}
                  className="rounded-sm"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAttendancePage(p => Math.min(attendanceTotalPages, p + 1))}
                  disabled={attendancePage === attendanceTotalPages}
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Baris per halaman:</span>
                <Select
                  value={leavePageSize.toString()}
                  onValueChange={(value) => {
                    setLeavePageSize(Number(value))
                    setLeavePage(1)
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
                Menampilkan {(leavePage - 1) * leavePageSize + 1} ke{' '}
                {Math.min(leavePage * leavePageSize, leaveData?.totalRows || 0)}{' '}
                dari {leaveData?.totalRows || 0} hasil
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">
                Halaman {leavePage} dari {leaveTotalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLeavePage(p => Math.max(1, p - 1))}
                  disabled={leavePage === 1}
                  className="rounded-sm"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLeavePage(p => Math.min(leaveTotalPages, p + 1))}
                  disabled={leavePage === leaveTotalPages}
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