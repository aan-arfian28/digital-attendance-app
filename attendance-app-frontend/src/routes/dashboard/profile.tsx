import { createFileRoute } from '@tanstack/react-router'
import { User, Mail, Shield, Building, Users, Edit, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUserData } from '@/hooks/useUserData'

export const Route = createFileRoute('/dashboard/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { 
    user,
    displayName,
    initials,
    userId,
    username,
    name,
    email,
    roleName,
    rolePosition,
    roleLevel,
    supervisorId,
    supervisorName,
    isLoading,
    refreshUser
  } = useUserData()

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">Unable to load your profile information.</p>
          <Button onClick={refreshUser}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 text-[#428bff]" />
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        </div>
        <Button className="bg-[#428bff] hover:bg-[#3b7ee6] text-white">
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 bg-[#428bff] text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  {initials}
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  <Camera className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-1">{displayName}</h2>
              <p className="text-sm text-gray-600 mb-2">@{username}</p>
              <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                {roleName}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-[#428bff]" />
                Personal Information
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User ID
                  </label>
                  <p className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded border">
                    {userId}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                    {username}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                    {name || 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded border flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    {email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#428bff]" />
                Role & Permissions
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded border">
                    <Shield className="h-4 w-4 text-[#428bff]" />
                    <span className="text-gray-900 capitalize">{roleName}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded border">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-900">{rolePosition}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Authority Level
                  </label>
                  <div className="bg-gray-50 px-3 py-2 rounded border">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-900 font-medium">Level {roleLevel || 0}</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full mr-1 ${
                              i < (roleLevel || 0) ? 'bg-[#428bff]' : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role ID
                  </label>
                  <p className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded border">
                    {user.Role?.ID}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Supervisor Information */}
          {(supervisorId || supervisorName) && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#428bff]" />
                  Reporting Structure
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {supervisorId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Supervisor ID
                      </label>
                      <p className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded border">
                        {supervisorId}
                      </p>
                    </div>
                  )}
                  {supervisorName && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Supervisor Name
                      </label>
                      <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded border">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-900">{supervisorName}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Account Actions</h3>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={refreshUser}>
                  Refresh Profile
                </Button>
                <Button variant="outline">
                  Change Password
                </Button>
                <Button variant="outline">
                  Download Profile Data
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
