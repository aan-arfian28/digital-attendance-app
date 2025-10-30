import { createFileRoute } from '@tanstack/react-router'
import { useUserData } from '@/hooks/useUserData'
import { LogIn, LogOut, FileText, Calendar, Users, Shield, Settings } from 'lucide-react'
import { useState } from 'react'
import { AttendanceModal, type AttendanceData } from '@/components/AttendanceModal'
import { LeaveModal, type LeaveRequestData } from '@/components/LeaveModal'
import { authService } from '@/services/auth'
import { useQuery } from '@tanstack/react-query'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

// Helper to get auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

// OPTIMIZATION: Extract query functions outside component to prevent recreation
const fetchMyAttendanceRecords = async () => {
  const response = await fetch(`${API_BASE_URL}/user/attendance/my-records`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch attendance records')
  return response.json()
}

const fetchMyLeaveRequests = async () => {
  const response = await fetch(`${API_BASE_URL}/user/leave/my-requests`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch leave requests')
  return response.json()
}

const fetchSubordinateAttendanceDashboard = async () => {
  const response = await fetch(`${API_BASE_URL}/user/attendance/subordinates`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch subordinate attendance')
  return response.json()
}

interface AttendanceRecord {
  ID: number
  UserID: number
  CheckInTime: string | null
  CheckOutTime: string | null
  Status: string
  ValidationStatus: string
  CreatedAt: string
  UpdatedAt: string
}

interface LeaveRequestRecord {
  ID: number
  UserID: number
  LeaveType: string
  StartDate: string
  EndDate: string
  Reason: string
  Status: string
  CreatedAt: string
  UpdatedAt: string
}

type ActivityItem = {
  time: string
  activity: string
  timestamp: Date
}

export const Route = createFileRoute('/dashboard/')({
  component: DashboardHome,
})

function DashboardHome() {
  const { displayName, roleName, rolePosition, isAdmin } = useUserData()
  const [attendanceModal, setAttendanceModal] = useState<{ isOpen: boolean; type: 'check-in' | 'check-out' }>({ isOpen: false, type: 'check-in' })
  const [leaveModal, setLeaveModal] = useState(false)
  const currentDate = new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  const currentTime = new Date().toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit'
  })

  // OPTIMIZED: Use extracted query functions + disable aggressive refetching
  const { data: attendanceRecords = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['my-attendance-records'],
    queryFn: fetchMyAttendanceRecords,
    enabled: !isAdmin,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  })

  // Fetch leave requests for non-admin users
  const { data: leaveRequests = [] } = useQuery<LeaveRequestRecord[]>({
    queryKey: ['my-leave-requests'],
    queryFn: fetchMyLeaveRequests,
    enabled: !isAdmin,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  })

  // Fetch subordinate attendance for admin/supervisor users
  const { data: subordinateAttendance = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['subordinate-attendance-dashboard'],
    queryFn: fetchSubordinateAttendanceDashboard,
    enabled: isAdmin,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  })

  // Helper functions
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return `${diffInMinutes} menit yang lalu`
    }
    if (diffInHours < 24) {
      return formatTime(dateString)
    }
    if (diffInHours < 48) {
      return 'Yesterday'
    }
    return formatDate(dateString)
  }

  const formatLeaveType = (leaveType: string) => {
    switch (leaveType) {
      case 'SICK':
        return 'Sakit'
      case 'PERMIT':
        return 'Izin'
      default:
        return leaveType
    }
  }

  const formatValidationStatus = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'pending validation'
      case 'PRESENT':
        return 'validated as present'
      case 'ABSENT':
        return 'validated as absent'
      case 'LEAVE':
        return 'validated as leave'
      case 'REJECTED':
        return 'rejected'
      default:
        return status.toLowerCase()
    }
  }

  const formatLeaveStatus = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'pending approval'
      case 'APPROVED':
        return 'approved'
      case 'REJECTED':
        return 'rejected'
      default:
        return status.toLowerCase()
    }
  }

  // Generate activity items from API data
  const getRecentActivities = (): ActivityItem[] => {
    const activities: ActivityItem[] = []

    if (isAdmin) {
      // For admin, show recent subordinate activities
      subordinateAttendance.slice(0, 10).forEach((record) => {
        if (record.CheckInTime) {
          activities.push({
            time: getRelativeTime(record.CheckInTime),
            activity: `Attendance record ${formatValidationStatus(record.ValidationStatus)}`,
            timestamp: new Date(record.CheckInTime),
          })
        }
      })
    } else {
      // For non-admin users, show their own attendance and leave activities
      attendanceRecords.forEach((record) => {
        if (record.CheckInTime) {
          activities.push({
            time: getRelativeTime(record.CheckInTime),
            activity: `You checked in`,
            timestamp: new Date(record.CheckInTime),
          })
        }
        if (record.CheckOutTime) {
          activities.push({
            time: getRelativeTime(record.CheckOutTime),
            activity: `You checked out`,
            timestamp: new Date(record.CheckOutTime),
          })
        }
        if (record.ValidationStatus !== 'PENDING') {
          activities.push({
            time: getRelativeTime(record.UpdatedAt),
            activity: `Attendance ${formatValidationStatus(record.ValidationStatus)}`,
            timestamp: new Date(record.UpdatedAt),
          })
        }
      })

      leaveRequests.forEach((request) => {
        activities.push({
          time: getRelativeTime(request.CreatedAt),
          activity: `Leave request (${formatLeaveType(request.LeaveType)}) ${formatLeaveStatus(request.Status)}`,
          timestamp: new Date(request.CreatedAt),
        })
      })
    }

    // Sort by timestamp descending and limit to 5 most recent
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5)
  }

  const recentActivities = getRecentActivities()

  const handleAttendanceSubmit = async (data: AttendanceData) => {
    try {
      await authService.submitAttendance(data)
    } catch (error) {
      console.error('Attendance submission error:', error)
      throw error
    }
  }

  const handleLeaveSubmit = async (data: LeaveRequestData) => {
    try {
      await authService.submitLeaveRequest(data)
    } catch (error) {
      console.error('Leave request submission error:', error)
      throw error
    }
  }

  return (
    <>
    <div className="p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome to your attendance dashboard</p>
      </div>

      {/* User Information Section */}
      <div className="mb-8">
        <div className="bg-white border border-gray-300 rounded-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Pengguna</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 w-24">Nama:</span>
              <span className="font-medium text-gray-900">{displayName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 w-24">Posisi:</span>
              <span className="font-medium text-gray-900 capitalize">{rolePosition || roleName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date and Time */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Tanggal dan Waktu</h2>
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>{currentDate}</span>
          <span className="mx-2">•</span>
          <span>{currentTime}</span>
        </div>
      </div>

      {/* Main Action Buttons - Non-Admin Users */}
      {!isAdmin && (
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Check In Button */}
            <button 
              onClick={() => setAttendanceModal({ isOpen: true, type: 'check-in' })}
              className="bg-white border border-gray-300 rounded-sm p-6 hover:bg-gray-50 transition-colors text-left group">
              <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-green-100 p-4 rounded-sm mb-4 group-hover:bg-green-200 transition-colors">
                  <LogIn className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Absen Pagi</h3>
                <p className="text-sm text-gray-600 mt-1">Check In</p>
              </div>
            </button>

            {/* Check Out Button */}
            <button 
              onClick={() => setAttendanceModal({ isOpen: true, type: 'check-out' })}
              className="bg-white border border-gray-300 rounded-sm p-6 hover:bg-gray-50 transition-colors text-left group">
              <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-red-100 p-4 rounded-sm mb-4 group-hover:bg-red-200 transition-colors">
                  <LogOut className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Absen Sore</h3>
                <p className="text-sm text-gray-600 mt-1">Check Out</p>
              </div>
            </button>

            {/* Leave Request Button */}
            <button 
              onClick={() => setLeaveModal(true)}
              className="bg-white border border-gray-300 rounded-sm p-6 hover:bg-gray-50 transition-colors text-left group">
              <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-blue-100 p-4 rounded-sm mb-4 group-hover:bg-blue-200 transition-colors">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Izin</h3>
                <p className="text-sm text-gray-600 mt-1">Leave Request</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Admin Dashboard - Stats Cards */}
      {isAdmin && (
        <>
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-300 rounded-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Total Users</h3>
                  <Users className="h-5 w-5 text-[#428bff]" />
                </div>
                <p className="text-2xl font-bold text-[#428bff]">150</p>
                <p className="text-sm text-gray-600 mt-1">Active system users</p>
              </div>
              
              <div className="bg-white border border-gray-300 rounded-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Total Roles</h3>
                  <Shield className="h-5 w-5 text-[#428bff]" />
                </div>
                <p className="text-2xl font-bold text-[#428bff]">4</p>
                <p className="text-sm text-gray-600 mt-1">System roles configured</p>
              </div>
              
              <div className="bg-white border border-gray-300 rounded-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">System Status</h3>
                  <Settings className="h-5 w-5 text-[#428bff]" />
                </div>
                <p className="text-2xl font-bold text-green-600">Active</p>
                <p className="text-sm text-gray-600 mt-1">All systems operational</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Recent Activity Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="bg-white border border-gray-300 rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-900">Time</th>
                <th className="text-left p-4 font-semibold text-gray-900">Activity</th>
              </tr>
            </thead>
            <tbody>
              {recentActivities.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-4 text-center text-gray-600">
                    No recent activity
                  </td>
                </tr>
              ) : (
                recentActivities.map((activity, index) => (
                  <tr 
                    key={index} 
                    className={`${index !== recentActivities.length - 1 ? 'border-b border-gray-200' : ''} hover:bg-gray-50`}
                  >
                    <td className="p-4 text-gray-600">{activity.time}</td>
                    <td className="p-4 text-gray-900">{activity.activity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <AttendanceModal
      isOpen={attendanceModal.isOpen}
      type={attendanceModal.type}
      onClose={() => setAttendanceModal({ ...attendanceModal, isOpen: false })}
      onSubmit={handleAttendanceSubmit}
    />

    <LeaveModal
      isOpen={leaveModal}
      onClose={() => setLeaveModal(false)}
      onSubmit={handleLeaveSubmit}
    />
    </>
  )
}