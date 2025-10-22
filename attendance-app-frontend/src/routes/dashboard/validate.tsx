import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle, Clock, User, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import RoleGuard from '@/components/RoleGuard'
import SubordinateGuard from '@/components/SubordinateGuard'

export const Route = createFileRoute('/dashboard/validate')({
  component: ValidateAttendance,
})

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
  const pendingValidations = [
    { 
      id: 1, 
      employee: 'John Doe', 
      date: '2024-01-15', 
      checkIn: '09:15', 
      checkOut: '17:00', 
      reason: 'Late arrival due to traffic', 
      type: 'Late Entry',
      status: 'Pending'
    },
    { 
      id: 2, 
      employee: 'Sarah Johnson', 
      date: '2024-01-14', 
      checkIn: '08:30', 
      checkOut: '16:00', 
      reason: 'Medical appointment', 
      type: 'Early Leave',
      status: 'Pending'
    },
    { 
      id: 3, 
      employee: 'Mike Wilson', 
      date: '2024-01-13', 
      checkIn: '-', 
      checkOut: '-', 
      reason: 'Sick leave', 
      type: 'Absence',
      status: 'Pending'
    },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-[#428bff]" />
          <h1 className="text-2xl font-bold text-gray-900">Validate Attendance</h1>
        </div>
      </div>

      <p className="text-gray-600 mb-6">
        Validate and approve attendance records.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 border border-gray-300 bg-white rounded-sm">
          <h3 className="font-semibold text-gray-900 mb-1">Pending Validations</h3>
          <p className="text-2xl font-bold text-yellow-600">{pendingValidations.length}</p>
        </div>
        <div className="p-4 border border-gray-300 bg-white rounded-sm">
          <h3 className="font-semibold text-gray-900 mb-1">Late Entries</h3>
          <p className="text-2xl font-bold text-orange-600">
            {pendingValidations.filter(p => p.type === 'Late Entry').length}
          </p>
        </div>
        <div className="p-4 border border-gray-300 bg-white rounded-sm">
          <h3 className="font-semibold text-gray-900 mb-1">Early Leaves</h3>
          <p className="text-2xl font-bold text-blue-600">
            {pendingValidations.filter(p => p.type === 'Early Leave').length}
          </p>
        </div>
        <div className="p-4 border border-gray-300 bg-white rounded-sm">
          <h3 className="font-semibold text-gray-900 mb-1">Absences</h3>
          <p className="text-2xl font-bold text-red-600">
            {pendingValidations.filter(p => p.type === 'Absence').length}
          </p>
        </div>
      </div>

      {/* Pending Validations */}
      <div className="space-y-4">
        {pendingValidations.map((item) => (
          <div key={item.id} className="border border-gray-300 bg-white p-6 rounded-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-100 border border-gray-300 rounded-sm">
                  {item.type === 'Late Entry' && <Clock className="h-5 w-5 text-orange-600" />}
                  {item.type === 'Early Leave' && <Clock className="h-5 w-5 text-blue-600" />}
                  {item.type === 'Absence' && <AlertCircle className="h-5 w-5 text-red-600" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-semibold text-gray-900">{item.employee}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-600">{item.date}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Type:</span> {item.type}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Time:</span> {item.checkIn} - {item.checkOut}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Reason:</span> {item.reason}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-red-300 text-red-600 hover:bg-red-50 rounded-sm"
                >
                  Reject
                </Button>
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700 text-white rounded-sm"
                >
                  Approve
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pendingValidations.length === 0 && (
        <div className="text-center py-12 border border-gray-300 bg-gray-50 rounded-sm">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear!</h3>
          <p className="text-gray-600">No pending validations at the moment.</p>
        </div>
      )}
    </div>
  )
}