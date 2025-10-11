import { createFileRoute } from '@tanstack/react-router'
import { Clock, Calendar, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/dashboard/attendance')({
  component: Attendance,
})

function Attendance() {
  const todayAttendance = [
    { 
      id: 1, 
      name: 'John Doe', 
      checkIn: '08:30', 
      checkOut: '-', 
      status: 'Present', 
      location: 'Office Main' 
    },
    { 
      id: 2, 
      name: 'Sarah Johnson', 
      checkIn: '09:15', 
      checkOut: '17:30', 
      status: 'Present', 
      location: 'Office Main' 
    },
    { 
      id: 3, 
      name: 'Mike Wilson', 
      checkIn: '-', 
      checkOut: '-', 
      status: 'Absent', 
      location: '-' 
    },
    { 
      id: 4, 
      name: 'Emily Davis', 
      checkIn: '08:45', 
      checkOut: '-', 
      status: 'Present', 
      location: 'Office Branch' 
    },
  ]

  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-[#428bff]" />
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        </div>
        <div className="flex gap-3">
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Check In
          </Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <XCircle className="h-4 w-4 mr-2" />
            Check Out
          </Button>
        </div>
      </div>

      <p className="text-gray-600 mb-6">
        Record and manage daily attendance. Current time: <span className="font-semibold">{currentTime}</span>
      </p>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 border border-gray-300 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-1">Present Today</h3>
          <p className="text-2xl font-bold text-green-600">
            {todayAttendance.filter(a => a.status === 'Present').length}
          </p>
        </div>
        <div className="p-4 border border-gray-300 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-1">Absent Today</h3>
          <p className="text-2xl font-bold text-red-600">
            {todayAttendance.filter(a => a.status === 'Absent').length}
          </p>
        </div>
        <div className="p-4 border border-gray-300 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-1">Total Employees</h3>
          <p className="text-2xl font-bold text-[#428bff]">{todayAttendance.length}</p>
        </div>
        <div className="p-4 border border-gray-300 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-1">Attendance Rate</h3>
          <p className="text-2xl font-bold text-purple-600">
            {Math.round((todayAttendance.filter(a => a.status === 'Present').length / todayAttendance.length) * 100)}%
          </p>
        </div>
      </div>

      {/* Today's Attendance Table */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-[#428bff]" />
          <h2 className="text-xl font-semibold text-gray-900">Today's Attendance</h2>
          <span className="text-gray-500">- {new Date().toLocaleDateString()}</span>
        </div>

        <div className="border border-gray-300 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50">
                  <th className="text-left p-3 font-semibold text-gray-900">Employee</th>
                  <th className="text-left p-3 font-semibold text-gray-900">Check In</th>
                  <th className="text-left p-3 font-semibold text-gray-900">Check Out</th>
                  <th className="text-left p-3 font-semibold text-gray-900">Status</th>
                  <th className="text-left p-3 font-semibold text-gray-900">Location</th>
                </tr>
              </thead>
              <tbody>
                {todayAttendance.map((record) => (
                  <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-3 text-gray-900 font-medium">{record.name}</td>
                    <td className="p-3 text-gray-600">{record.checkIn}</td>
                    <td className="p-3 text-gray-600">{record.checkOut}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 text-xs border ${
                        record.status === 'Present' 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600">{record.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manual Check-in Form */}
      <div className="border border-gray-300 bg-gray-50 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Manual Attendance Entry</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select className="w-full p-2 border border-gray-300 bg-white">
              <option>Select Employee</option>
              {todayAttendance.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check In Time</label>
            <input 
              type="time" 
              className="w-full p-2 border border-gray-300 bg-white"
              defaultValue={currentTime}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select className="w-full p-2 border border-gray-300 bg-white">
              <option>Office Main</option>
              <option>Office Branch</option>
              <option>Remote</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button className="w-full bg-[#428bff] hover:bg-[#3b7ee6] text-white">
              Record Attendance
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}