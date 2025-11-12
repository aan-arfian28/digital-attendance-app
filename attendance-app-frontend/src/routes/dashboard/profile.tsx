import { createFileRoute } from '@tanstack/react-router'
import { User, Mail, Shield, Building, Edit, Camera } from 'lucide-react'
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profil Tidak Ditemukan</h2>
          <p className="text-gray-600 mb-4">Tidak dapat memuat informasi profil Anda.</p>
          <Button onClick={refreshUser}>
            Coba Lagi
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profil Saya</h1>
          <p className="text-gray-600">Kelola informasi profil dan akun Anda</p>
        </div>
        <Button className="bg-[#428bff] hover:bg-[#3b7ee6] text-white rounded-sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit Profil
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 bg-[#428bff] text-white rounded-sm flex items-center justify-center text-2xl font-bold">
                  {initials}
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-sm flex items-center justify-center border-2 border-white shadow-sm">
                  <Camera className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-1">{displayName}</h2>
              <p className="text-sm text-gray-600 mb-2">@{username}</p>
              <span className="inline-flex px-3 py-1 text-sm font-medium rounded-sm bg-blue-100 text-blue-800">
                {roleName}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Informasi Personal
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID User
                  </label>
                  <p className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded-sm border">
                    {userId}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-sm border">
                    {username}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Lengkap
                  </label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-sm border">
                    {name || 'Belum diatur'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alamat Email
                  </label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-sm border flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    {email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Role & Izin
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-sm border">
                    <Shield className="h-4 w-4 text-[#428bff]" />
                    <span className="text-gray-900 capitalize">{roleName}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Posisi
                  </label>
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-sm border">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-900">{rolePosition}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Level Wewenang
                  </label>
                  <div className="bg-gray-50 px-3 py-2 rounded-sm border">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-900 font-medium">Level {roleLevel || 0}</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-sm mr-1 ${
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
                    ID Role
                  </label>
                  <p className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded-sm border">
                    {user.Role?.ID}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Supervisor Information */}
          {(supervisorId || supervisorName) && (
            <div className="bg-white rounded-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Struktur Pelaporan
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {supervisorId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ID Supervisor
                      </label>
                      <p className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded-sm border">
                        {supervisorId}
                      </p>
                    </div>
                  )}
                  {supervisorName && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nama Supervisor
                      </label>
                      <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-sm border">
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
          <div className="bg-white rounded-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Aksi Akun</h3>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={refreshUser} className="rounded-sm">
                  Refresh Profil
                </Button>
                <Button variant="outline" className="rounded-sm">
                  Ubah Password
                </Button>
                <Button variant="outline" className="rounded-sm">
                  Unduh Data Profil
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
