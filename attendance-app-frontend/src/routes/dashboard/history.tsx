import { createFileRoute } from '@tanstack/react-router'
import { History, Search, Download, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/dashboard/history')({
  component: AttendanceHistory,
})

function AttendanceHistory() {
  const historyData = [
    { 
      id: 1, 
      date: '2024-01-15', 
      employee: 'John Doe', 
      checkIn: '08:30', 
      checkOut: '17:00', 
      totalHours: '8h 30m', 
      status: 'Complete' 
    },
    { 
      id: 2, 
      date: '2024-01-15', 
      employee: 'Sarah Johnson', 
      checkIn: '09:00', 
      checkOut: '17:30', 
      totalHours: '8h 30m', 
      status: 'Complete' 
    },
    { 
      id: 3, 
      date: '2024-01-14', 
      employee: 'Mike Wilson', 
      checkIn: '08:45', 
      checkOut: '16:30', 
      totalHours: '7h 45m', 
      status: 'Early Leave' 
    },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-[#428bff]" />
          <h1 className="text-2xl font-bold text-gray-900">Attendance History</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-gray-300">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button className="bg-[#428bff] hover:bg-[#3b7ee6] text-white">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <p className="text-gray-600 mb-6">
        View attendance history and generate reports.
      </p>

      <div className="border border-gray-300 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="text-left p-3 font-semibold text-gray-900">Date</th>
                <th className="text-left p-3 font-semibold text-gray-900">Employee</th>
                <th className="text-left p-3 font-semibold text-gray-900">Check In</th>
                <th className="text-left p-3 font-semibold text-gray-900">Check Out</th>
                <th className="text-left p-3 font-semibold text-gray-900">Total Hours</th>
                <th className="text-left p-3 font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {historyData.map((record) => (
                <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-3 text-gray-900">{record.date}</td>
                  <td className="p-3 text-gray-900 font-medium">{record.employee}</td>
                  <td className="p-3 text-gray-600">{record.checkIn}</td>
                  <td className="p-3 text-gray-600">{record.checkOut}</td>
                  <td className="p-3 text-gray-600">{record.totalHours}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs border ${
                      record.status === 'Complete' ? 'bg-green-100 text-green-800 border-green-200' :
                      record.status === 'Early Leave' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                      'bg-gray-100 text-gray-800 border-gray-200'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}