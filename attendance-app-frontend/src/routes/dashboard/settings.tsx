import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Save, Plus, Edit, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import RoleGuard from '@/components/RoleGuard'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/dashboard/settings')({
  component: SettingsPage,
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
interface SettingsData {
  company_name: string
  default_location_id: string
}

interface Location {
  ID: number
  Name: string
  Address: string
  Latitude: number
  Longitude: number
  Radius: number
}

interface LocationFormData {
  Name: string
  Address: string
  Latitude: number
  Longitude: number
  Radius: number
}

// Fetch functions
const fetchSettings = async (): Promise<SettingsData> => {
  const response = await fetch(`${API_BASE_URL}/admin/settings`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch settings')
  return response.json()
}

const fetchLocations = async (): Promise<Location[]> => {
  const response = await fetch(`${API_BASE_URL}/admin/locations`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch locations')
  return response.json()
}

function SettingsPage() {
  return (
    <RoleGuard adminOnly={true}>
      <SettingsPageContent />
    </RoleGuard>
  )
}

function SettingsPageContent() {
  const queryClient = useQueryClient()
  const [companyName, setCompanyName] = useState('')
  const [defaultLocationId, setDefaultLocationId] = useState('')
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [locationForm, setLocationForm] = useState<LocationFormData>({
    Name: '',
    Address: '',
    Latitude: 0,
    Longitude: 0,
    Radius: 100,
  })
  const [savedLocationForm, setSavedLocationForm] = useState<LocationFormData>({
    Name: '',
    Address: '',
    Latitude: 0,
    Longitude: 0,
    Radius: 100,
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Fetch settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 0,
    refetchInterval: 3000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  // Fetch locations
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
    staleTime: 0,
    refetchInterval: 3000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  // Update settings when data is loaded
  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company_name || '')
      setDefaultLocationId(settings.default_location_id || '')
    }
  }, [settings])

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsData) => {
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update settings')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setSuccessMessage('Pengaturan berhasil diperbarui!')
      setErrorMessage('')
      setTimeout(() => setSuccessMessage(''), 3000)
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
      setSuccessMessage('')
    },
  })

  // Create location mutation
  const createLocationMutation = useMutation({
    mutationFn: async (data: LocationFormData) => {
      const response = await fetch(`${API_BASE_URL}/admin/locations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create location')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      setIsLocationModalOpen(false)
      resetLocationForm()
      setSuccessMessage('Lokasi berhasil dibuat!')
      setTimeout(() => setSuccessMessage(''), 3000)
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
    },
  })

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: LocationFormData }) => {
      const response = await fetch(`${API_BASE_URL}/admin/locations/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update location')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      setIsLocationModalOpen(false)
      resetLocationForm()
      setSuccessMessage('Lokasi berhasil diperbarui!')
      setTimeout(() => setSuccessMessage(''), 3000)
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
    },
  })

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/admin/locations/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete location')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      setSuccessMessage('Lokasi berhasil dihapus!')
      setTimeout(() => setSuccessMessage(''), 3000)
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
    },
  })

  const handleSaveSettings = () => {
    setErrorMessage('')
    setSuccessMessage('')
    
    updateSettingsMutation.mutate({
      company_name: companyName,
      default_location_id: defaultLocationId,
    })
  }

  const resetLocationForm = () => {
    setLocationForm({
      Name: '',
      Address: '',
      Latitude: 0,
      Longitude: 0,
      Radius: 100,
    })
    setSelectedLocation(null)
    setIsEditMode(false)
    setErrorMessage('')
  }

  const saveLocationFormState = () => {
    setSavedLocationForm({ ...locationForm })
  }

  const restoreLocationFormState = () => {
    setLocationForm({ ...savedLocationForm })
  }

  const openCreateLocationModal = () => {
    restoreLocationFormState()
    setIsLocationModalOpen(true)
  }

  const openEditLocationModal = (location: Location) => {
    setSelectedLocation(location)
    setLocationForm({
      Name: location.Name,
      Address: location.Address,
      Latitude: location.Latitude,
      Longitude: location.Longitude,
      Radius: location.Radius,
    })
    setIsEditMode(true)
    setIsLocationModalOpen(true)
  }

  const handleSubmitLocation = () => {
    if (!locationForm.Name.trim()) {
      setErrorMessage('Nama lokasi wajib diisi')
      return
    }
    if (locationForm.Latitude < -90 || locationForm.Latitude > 90) {
      setErrorMessage('Latitude harus antara -90 dan 90')
      return
    }
    if (locationForm.Longitude < -180 || locationForm.Longitude > 180) {
      setErrorMessage('Longitude harus antara -180 dan 180')
      return
    }
    if (locationForm.Radius < 10 || locationForm.Radius > 50000) {
      setErrorMessage('Radius harus antara 10 dan 50000 meter')
      return
    }

    if (isEditMode && selectedLocation) {
      updateLocationMutation.mutate({ id: selectedLocation.ID, data: locationForm })
    } else {
      createLocationMutation.mutate(locationForm)
    }
  }

  const handleDeleteLocation = (id: number) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus lokasi ini?')) {
      deleteLocationMutation.mutate(id)
    }
  }

  return (
    <div className="p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pengaturan</h1>
        <p className="text-gray-600">Konfigurasi pengaturan dan preferensi aplikasi</p>
      </div>

      {/* Save Button */}
      <div className="mb-6">
        <Button 
          onClick={handleSaveSettings}
          disabled={updateSettingsMutation.isPending}
          className="bg-[#428bff] hover:bg-[#3b7ee6] text-white rounded-sm"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </div>

      {/* Pesan Sukses */}
      {successMessage && (
        <Alert className="mb-6 bg-green-50 border-green-300 rounded-sm">
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Pesan Error */}
      {errorMessage && (
        <Alert variant="destructive" className="mb-6 rounded-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-8">
        {/* Pengaturan Umum */}
        <div className="bg-white border border-gray-300 rounded-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pengaturan Umum</h2>
          
          {settingsLoading || locationsLoading ? (
            <div className="text-center py-8 text-gray-500">Memuat pengaturan...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Perusahaan
                </Label>
                <input 
                  id="company-name"
                  type="text" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 bg-white rounded-sm"
                  placeholder="Masukkan nama perusahaan"
                />
              </div>
              <div>
                <Label htmlFor="default-location" className="block text-sm font-medium text-gray-700 mb-2">
                  Lokasi Absensi Default
                </Label>
                <Select value={defaultLocationId} onValueChange={setDefaultLocationId}>
                  <SelectTrigger className="w-full h-10 rounded-sm">
                    <SelectValue placeholder="Pilih lokasi default" />
                  </SelectTrigger>
                  <SelectContent className="rounded-sm">
                    {locations.map((location) => (
                      <SelectItem key={location.ID} value={location.ID.toString()}>
                        {location.Name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Manajemen Lokasi */}
        <div className="bg-white border border-gray-300 rounded-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Manajemen Lokasi</h2>
            <Button
              onClick={openCreateLocationModal}
              className="bg-[#428bff] hover:bg-[#3b7ee6] text-white rounded-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah Lokasi
            </Button>
          </div>

          {locationsLoading ? (
            <div className="text-center py-8 text-gray-500">Memuat lokasi...</div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Tidak ada lokasi. Tambahkan lokasi pertama Anda!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nama</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Alamat</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Koordinat</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Radius (m)</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {locations.map((location) => (
                    <tr key={location.ID} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{location.Name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{location.Address || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {location.Latitude.toFixed(6)}, {location.Longitude.toFixed(6)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{location.Radius}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditLocationModal(location)}
                            className="border-gray-300 rounded-sm"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Ubah
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteLocation(location.ID)}
                            className="border-red-300 text-red-600 hover:bg-red-50 rounded-sm"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Lokasi */}
      <Dialog open={isLocationModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsLocationModalOpen(false)
        }
      }}>
        <DialogContent 
          className="max-w-2xl rounded-sm"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onCloseAutoFocus={() => {
            if (!isEditMode) {
              saveLocationFormState()
            } else {
              resetLocationForm()
              setIsLocationModalOpen(false)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Ubah Lokasi' : 'Tambah Lokasi Baru'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Perbarui detail lokasi' : 'Buat lokasi absensi baru'}
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <Alert variant="destructive" className="rounded-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="location-name">Nama Lokasi *</Label>
              <input
                id="location-name"
                type="text"
                value={locationForm.Name}
                onChange={(e) => setLocationForm({ ...locationForm, Name: e.target.value })}
                className="w-full h-10 px-3 border border-gray-300 bg-white rounded-sm mt-2"
                placeholder="contoh: Kantor Pusat"
              />
            </div>
            <div>
              <Label htmlFor="location-address">Alamat</Label>
              <input
                id="location-address"
                type="text"
                value={locationForm.Address}
                onChange={(e) => setLocationForm({ ...locationForm, Address: e.target.value })}
                className="w-full h-10 px-3 border border-gray-300 bg-white rounded-sm mt-2"
                placeholder="contoh: Jl. Sudirman No. 123, Jakarta"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Latitude * (-90 sampai 90)</Label>
                <input
                  id="latitude"
                  type="text"
                  value={locationForm.Latitude === 0 && !isEditMode ? '' : locationForm.Latitude}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '' || value === '-') {
                      setLocationForm({ ...locationForm, Latitude: 0 })
                    } else {
                      const parsed = parseFloat(value)
                      if (!isNaN(parsed)) {
                        setLocationForm({ ...locationForm, Latitude: parsed })
                      }
                    }
                  }}
                  className="w-full h-10 px-3 border border-gray-300 bg-white rounded-sm mt-2"
                  placeholder="contoh: -6.200000"
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude * (-180 sampai 180)</Label>
                <input
                  id="longitude"
                  type="text"
                  value={locationForm.Longitude === 0 && !isEditMode ? '' : locationForm.Longitude}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '' || value === '-') {
                      setLocationForm({ ...locationForm, Longitude: 0 })
                    } else {
                      const parsed = parseFloat(value)
                      if (!isNaN(parsed)) {
                        setLocationForm({ ...locationForm, Longitude: parsed })
                      }
                    }
                  }}
                  className="w-full h-10 px-3 border border-gray-300 bg-white rounded-sm mt-2"
                  placeholder="contoh: 106.816666"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="radius">Radius (meter) * (10 sampai 50000)</Label>
              <input
                id="radius"
                type="text"
                value={locationForm.Radius === 0 ? '' : locationForm.Radius}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '') {
                    setLocationForm({ ...locationForm, Radius: 0 })
                  } else {
                    const parsed = parseInt(value)
                    if (!isNaN(parsed) && parsed >= 0) {
                      setLocationForm({ ...locationForm, Radius: parsed })
                    }
                  }
                }}
                className="w-full h-10 px-3 border border-gray-300 bg-white rounded-sm mt-2"
                placeholder="contoh: 100"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetLocationForm() 
                setIsLocationModalOpen(false) 
              }}
              className="rounded-sm"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmitLocation}
              disabled={createLocationMutation.isPending || updateLocationMutation.isPending}
              className="bg-[#428bff] hover:bg-[#3b7ee6] text-white rounded-sm"
            >
              {createLocationMutation.isPending || updateLocationMutation.isPending
                ? 'Menyimpan...'
                : isEditMode
                ? 'Perbarui Lokasi'
                : 'Buat Lokasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}