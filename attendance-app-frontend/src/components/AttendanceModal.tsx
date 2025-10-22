import { useState, useRef, useEffect } from 'react'
import { Camera, MapPin, Check, Loader, AlertCircle, X } from 'lucide-react'

interface AttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'check-in' | 'check-out'
  onSubmit: (data: AttendanceData) => Promise<void>
}

export interface AttendanceData {
  type: 'check-in' | 'check-out'
  photo: string // base64 image
  latitude: number
  longitude: number
  accuracy?: number
}

export function AttendanceModal({ isOpen, onClose, type, onSubmit }: AttendanceModalProps) {
  const [step, setStep] = useState<'camera' | 'location' | 'review'>('camera')
  const [photo, setPhoto] = useState<string | null>(null)
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const typeLabel = type === 'check-in' ? 'Absen Pagi' : 'Absen Sore'
  const isCheckIn = type === 'check-in'
  
  // Helper function to get color classes based on type
  const getColorClasses = () => {
    if (isCheckIn) {
      return {
        bg50: 'bg-green-50',
        bg100: 'bg-green-100',
        bg200: 'bg-green-200',
        bg600: 'bg-green-600',
        bg700: 'bg-green-700',
        text600: 'text-green-600',
        text900: 'text-green-900',
        border: 'border-green-200',
      }
    } else {
      return {
        bg50: 'bg-red-50',
        bg100: 'bg-red-100',
        bg200: 'bg-red-200',
        bg600: 'bg-red-600',
        bg700: 'bg-red-700',
        text600: 'text-red-600',
        text900: 'text-red-900',
        border: 'border-red-200',
      }
    }
  }
  
  const colors = getColorClasses()

  // Cleanup state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('camera')
      setPhoto(null)
      setLocation(null)
      setError(null)
      setLoading(false)
    }
  }, [isOpen])

  // Initialize camera
  useEffect(() => {
    if (!isOpen || step !== 'camera') return

    const startCamera = async () => {
      try {
        setError(null)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          streamRef.current = stream
        }
      } catch (err) {
        setError('Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.')
        console.error('Camera error:', err)
      }
    }

    startCamera()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [isOpen, step])

  // Check location permission status
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setLocationPermission(result.state as 'granted' | 'denied' | 'prompt')
      })
    }
  }, [])

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0)
        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8)
        setPhoto(imageData)
        setStep('location')
        
        // Stop the stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }
    }
  }

  const retakePhoto = () => {
    setPhoto(null)
    setStep('camera')
  }

  const getCurrentLocation = () => {
    setError(null)
    setLoading(true)

    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung oleh browser Anda')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        const accuracy = position.coords.accuracy
        const mapsUrl = `https://www.google.com/maps/search/${latitude},${longitude}`
        
        console.log('📍 Location Found!')
        console.log(`Latitude: ${latitude}`)
        console.log(`Longitude: ${longitude}`)
        console.log(`Accuracy: ${accuracy}m`)
        console.log(`Google Maps: ${mapsUrl}`)
        
        setLocation({
          latitude,
          longitude,
          accuracy,
        })
        setLocationPermission('granted')
        setStep('review')
        setLoading(false)
      },
      (error) => {
        console.error('Geolocation error:', error)
        if (error.code === error.PERMISSION_DENIED) {
          setError('Izin lokasi ditolak. Silakan berikan izin akses lokasi.')
          setLocationPermission('denied')
        } else if (error.code === error.TIMEOUT) {
          setError('Waktu untuk mendapatkan lokasi habis. Coba lagi.')
        } else {
          setError('Tidak dapat mendapatkan lokasi Anda. Coba lagi.')
        }
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15 * 1000,
        maximumAge: 0,
      }
    )
  }

  const handleSubmit = async () => {
    if (!photo || !location) {
      setError('Foto dan lokasi diperlukan')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onSubmit({
        type,
        photo,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengirim kehadiran')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`${colors.bg50} border-b border-gray-300 p-4 flex items-center justify-between`}>
          <h2 className={`text-xl font-bold ${colors.text900}`}>{typeLabel}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-sm transition-colors"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-sm flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Camera Step */}
          {step === 'camera' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="font-semibold text-gray-900 mb-1">Ambil Foto Selfie</h3>
                <p className="text-sm text-gray-600">Posisikan wajah Anda di depan kamera dan tekan Capture</p>
              </div>

              {!photo ? (
                <>
                  <div className="bg-gray-100 rounded-sm overflow-hidden aspect-video max-w-lg mx-auto">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={capturePhoto}
                    className={`w-full ${colors.bg600} hover:${colors.bg700} text-white font-semibold py-3 rounded-sm transition-colors flex items-center justify-center gap-2`}
                  >
                    <Camera className="h-5 w-5" />
                    Ambil Foto
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-gray-100 rounded-sm overflow-hidden aspect-video max-w-lg mx-auto">
                    <img
                      src={photo}
                      alt="Captured selfie"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => setStep('location')}
                      className={`w-full ${colors.bg600} hover:${colors.bg700} text-white font-semibold py-3 rounded-sm transition-colors`}
                    >
                      Lanjutkan ke Lokasi
                    </button>
                    <button
                      onClick={retakePhoto}
                      className="w-full bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-3 rounded-sm transition-colors"
                    >
                      Ambil Ulang
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Location Step */}
          {step === 'location' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="font-semibold text-gray-900 mb-1">Dapatkan Lokasi Anda</h3>
                <p className="text-sm text-gray-600">Izinkan akses lokasi untuk memverifikasi kehadiran Anda</p>
              </div>

              {location ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Check className="h-5 w-5 text-green-600" />
                      <p className="font-semibold text-green-900">Lokasi Terdeteksi</p>
                    </div>
                    <div className="space-y-2 text-sm text-green-800">
                      <div><span className="font-medium">Latitude:</span> {location.latitude.toFixed(6)}</div>
                      <div><span className="font-medium">Longitude:</span> {location.longitude.toFixed(6)}</div>
                      {location.accuracy && (
                        <div><span className="font-medium">Akurasi:</span> ±{location.accuracy.toFixed(0)}m</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setStep('review')}
                    className={`w-full ${colors.bg600} hover:${colors.bg700} text-white font-semibold py-3 rounded-sm transition-colors`}
                  >
                    Lanjutkan ke Review
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 text-sm text-blue-800">
                    <p className="font-medium mb-2">Catatan Privasi:</p>
                    <p>Lokasi Anda hanya digunakan untuk verifikasi kehadiran dan tidak akan dibagikan.</p>
                  </div>
                  <button
                    onClick={getCurrentLocation}
                    disabled={loading}
                    className={`w-full ${colors.bg600} hover:${colors.bg700} disabled:bg-gray-400 text-white font-semibold py-3 rounded-sm transition-colors flex items-center justify-center gap-2`}
                  >
                    {loading ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-5 w-5" />
                        Dapatkan Lokasi Saat Ini
                      </>
                    )}
                  </button>
                  {locationPermission === 'denied' && (
                    <p className="text-sm text-red-600 text-center">
                      Izin lokasi ditolak. Silakan ubah pengaturan izin di browser Anda.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Review Step */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="font-semibold text-gray-900 mb-1">Review Kehadiran</h3>
                <p className="text-sm text-gray-600">Periksa data Anda sebelum mengirim</p>
              </div>

              <div className="space-y-4">
                {/* Photo Preview */}
                {photo && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Foto Selfie</p>
                    <div className="bg-gray-100 rounded-sm overflow-hidden aspect-video max-w-sm">
                      <img
                        src={photo}
                        alt="Selfie preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Location Preview */}
                {location && (
                  <div className="bg-gray-50 border border-gray-300 rounded-sm p-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Lokasi</p>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-600">Latitude:</span> <span className="font-medium">{location.latitude.toFixed(6)}</span></div>
                      <div><span className="text-gray-600">Longitude:</span> <span className="font-medium">{location.longitude.toFixed(6)}</span></div>
                      {location.accuracy && (
                        <div><span className="text-gray-600">Akurasi:</span> <span className="font-medium">±{location.accuracy.toFixed(0)}m</span></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-sm transition-colors flex items-center justify-center gap-2`}
                  >
                    {loading ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        Mengirim...
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        Kirim Kehadiran
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setStep('camera')}
                    disabled={loading}
                    className="w-full bg-gray-300 hover:bg-gray-400 disabled:bg-gray-400 text-gray-900 font-semibold py-3 rounded-sm transition-colors"
                  >
                    Kembali
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvas for capturing photos */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
