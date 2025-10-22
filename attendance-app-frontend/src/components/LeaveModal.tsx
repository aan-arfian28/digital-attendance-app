import { useState, useRef } from 'react'
import { FileText, Upload, Loader, AlertCircle, X, Check } from 'lucide-react'

interface LeaveModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: LeaveRequestData) => Promise<void>
}

export interface LeaveRequestData {
  leaveType: 'SICK' | 'PERMIT'
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  reason: string
  attachment: File
}

export function LeaveModal({ isOpen, onClose, onSubmit }: LeaveModalProps) {
  const [step, setStep] = useState<'form' | 'review' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    leaveType: 'SICK' as 'SICK' | 'PERMIT',
    startDate: '',
    endDate: '',
    reason: '',
  })

  // Cleanup state when modal closes
  const handleClose = () => {
    setStep('form')
    setFormData({ leaveType: 'SICK', startDate: '', endDate: '', reason: '' })
    setAttachment(null)
    setAttachmentPreview(null)
    setError(null)
    setLoading(false)
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setError('File harus berformat JPG, JPEG, PNG, atau PDF')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file tidak boleh lebih dari 5MB')
      return
    }

    setAttachment(file)
    setError(null) // Clear error when file is successfully selected

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setAttachmentPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setAttachmentPreview(null)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user makes changes to fix the form
    if (error) {
      setError(null)
    }
  }

  const validateForm = (): boolean => {
    if (!formData.leaveType) {
      setError('Jenis izin harus dipilih')
      return false
    }
    if (!formData.startDate) {
      setError('Tanggal mulai harus diisi')
      return false
    }
    if (!formData.endDate) {
      setError('Tanggal akhir harus diisi')
      return false
    }
    if (!formData.reason.trim()) {
      setError('Alasan harus diisi')
      return false
    }
    if (!attachment) {
      setError('Dokumen pendukung harus diunggah')
      return false
    }

    const startDate = new Date(formData.startDate)
    const endDate = new Date(formData.endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (startDate < today) {
      setError('Tanggal mulai tidak boleh di masa lalu')
      return false
    }

    if (endDate < startDate) {
      setError('Tanggal akhir tidak boleh sebelum tanggal mulai')
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    setError(null)

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      await onSubmit({
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        attachment: attachment!,
      })
      setStep('success')
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengirim permintaan izin')
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-50 border-b border-gray-300 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-blue-900">Permintaan Izin</h2>
          <button
            onClick={handleClose}
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

          {/* Form Step */}
          {step === 'form' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="font-semibold text-gray-900 mb-1">Buat Permintaan Izin</h3>
                <p className="text-sm text-gray-600">Isi formulir dan sertakan dokumen pendukung</p>
              </div>

              <div className="space-y-4">
                {/* Leave Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Jenis Izin <span className="text-red-600">*</span>
                  </label>
                  <select
                    name="leaveType"
                    value={formData.leaveType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="SICK">Sakit</option>
                    <option value="PERMIT">Izin</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Tanggal Mulai <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Tanggal Akhir <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Alasan <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    placeholder="Jelaskan alasan permintaan izin Anda"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Dokumen Pendukung <span className="text-red-600">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-sm hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-gray-700 hover:text-blue-600"
                  >
                    <Upload className="h-5 w-5" />
                    {attachment ? `File dipilih: ${attachment.name}` : 'Klik untuk mengunggah dokumen (JPG, PNG, PDF, max 5MB)'}
                  </button>
                </div>

                {/* File Preview */}
                {attachmentPreview && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Preview Gambar</p>
                    <div className="bg-gray-100 rounded-sm overflow-hidden max-w-sm">
                      <img
                        src={attachmentPreview}
                        alt="Attachment preview"
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                )}

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 text-sm text-blue-800">
                  <p className="font-medium mb-2">Informasi Penting:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Dokumen pendukung diperlukan (surat keterangan, resep dokter, dll)</li>
                    <li>• Jangan kirim permintaan izin untuk hari yang sudah ada riwayat kehadiran</li>
                    <li>• Permintaan harus disetujui oleh atasan Anda</li>
                    <li>• Anda akan diberitahu ketika permintaan Anda diproses</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-4">
                  <button
                    onClick={() => {
                      if (validateForm()) {
                        setStep('review')
                      }
                    }}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-sm transition-colors"
                  >
                    Lanjutkan ke Review
                  </button>
                  <button
                    onClick={handleClose}
                    disabled={loading}
                    className="w-full bg-gray-300 hover:bg-gray-400 disabled:bg-gray-400 text-gray-900 font-semibold py-3 rounded-sm transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Review Step */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="font-semibold text-gray-900 mb-1">Review Permintaan Izin</h3>
                <p className="text-sm text-gray-600">Periksa data Anda sebelum mengirim</p>
              </div>

              <div className="space-y-4">
                {/* Leave Type Review */}
                <div className="bg-gray-50 border border-gray-300 rounded-sm p-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Jenis Izin</p>
                  <p className="text-gray-900">
                    {formData.leaveType === 'SICK' ? 'Sakit' : 'Izin'}
                  </p>
                </div>

                {/* Dates Review */}
                <div className="bg-gray-50 border border-gray-300 rounded-sm p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Periode Izin</p>
                  <div className="space-y-1 text-sm text-gray-900">
                    <div><span className="text-gray-600">Mulai:</span> {formData.startDate}</div>
                    <div><span className="text-gray-600">Akhir:</span> {formData.endDate}</div>
                  </div>
                </div>

                {/* Reason Review */}
                <div className="bg-gray-50 border border-gray-300 rounded-sm p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Alasan</p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{formData.reason}</p>
                </div>

                {/* Attachment Review */}
                <div className="bg-gray-50 border border-gray-300 rounded-sm p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Dokumen Pendukung</p>
                  <div className="flex items-center gap-2 text-sm text-gray-900">
                    <FileText className="h-4 w-4" />
                    <span>{attachment?.name}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        Mengirim...
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        Kirim Permintaan
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setStep('form')}
                    disabled={loading}
                    className="w-full bg-gray-300 hover:bg-gray-400 disabled:bg-gray-400 text-gray-900 font-semibold py-3 rounded-sm transition-colors"
                  >
                    Kembali
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="flex justify-center mb-4">
                  <div className="bg-green-50 rounded-full p-3">
                    <Check className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-lg">Permintaan Izin Terkirim!</h3>
                <p className="text-sm text-gray-600">Permintaan izin Anda telah berhasil dikirim dan menunggu persetujuan dari atasan Anda.</p>
              </div>

              <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-sm p-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Jenis Izin: {formData.leaveType === 'SICK' ? 'Sakit' : 'Izin'}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Periode: {formData.startDate} hingga {formData.endDate}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Dokumen sudah diunggah</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 text-sm text-blue-800">
                <p className="font-medium mb-2">Apa Selanjutnya?</p>
                <ul className="space-y-1 text-xs">
                  <li>• Atasan Anda akan meninjau permintaan izin Anda</li>
                  <li>• Anda akan diberitahu ketika permintaan telah disetujui atau ditolak</li>
                  <li>• Silakan hubungi atasan Anda jika Anda memiliki pertanyaan</li>
                </ul>
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-sm transition-colors"
              >
                Selesai
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
