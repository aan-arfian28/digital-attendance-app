import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardHome,
})

function DashboardHome() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
      <p className="text-gray-600 mb-6">Welcome to the Digital Attendance Dashboard</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 border border-gray-300 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-2">Total Users</h3>
          <p className="text-2xl font-bold text-[#428bff]">150</p>
        </div>
        <div className="p-4 border border-gray-300 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-2">Today's Attendance</h3>
          <p className="text-2xl font-bold text-[#428bff]">142</p>
        </div>
        <div className="p-4 border border-gray-300 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-2">Pending Validations</h3>
          <p className="text-2xl font-bold text-[#428bff]">8</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="border border-gray-300 bg-white">
          <div className="p-4 border-b border-gray-200">
            <p className="text-sm text-gray-600">10:30 AM - John Doe checked in</p>
          </div>
          <div className="p-4 border-b border-gray-200">
            <p className="text-sm text-gray-600">10:25 AM - Sarah Johnson checked in</p>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600">10:20 AM - Mike Wilson checked in</p>
          </div>
        </div>
      </div>
    </div>
  )
}