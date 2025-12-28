import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BookOpen, Users, UserCog, ShieldCheck, MapPin, ClipboardList, Calendar, FileText, CheckCircle } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/user-manual')({
  component: UserManual,
})

function UserManual() {
  const [activeTab, setActiveTab] = useState('getting-started')

  const tabs = [
    { id: 'getting-started', label: 'Memulai' },
    { id: 'admin', label: 'Admin' },
    { id: 'supervisor', label: 'Supervisor' },
    { id: 'user', label: 'User Biasa' },
    { id: 'faq', label: 'FAQ' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link to="/login">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Login
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Panduan Pengguna</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Panduan lengkap untuk menggunakan Sistem Absensi Digital
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Getting Started */}
            {activeTab === 'getting-started' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-2xl font-bold mb-4">Selamat Datang di Sistem Absensi Digital</h2>
                  <p className="text-gray-600 mb-6">
                    Sistem Absensi Digital adalah solusi lengkap untuk mengelola absensi karyawan,
                    pengajuan cuti, dan validasi supervisor dengan pelacakan lokasi GPS.
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <div className="p-4 border border-gray-200 rounded-lg bg-white">
                      <MapPin className="h-6 w-6 text-blue-600 mb-2" />
                      <h3 className="font-semibold mb-1">Pelacakan GPS</h3>
                      <p className="text-sm text-gray-600">
                        Check-in/out berbasis lokasi dengan verifikasi radius kantor
                      </p>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg bg-white">
                      <Users className="h-6 w-6 text-blue-600 mb-2" />
                      <h3 className="font-semibold mb-1">Manajemen Role</h3>
                      <p className="text-sm text-gray-600">
                        Role Admin, Supervisor, dan User dengan izin khusus
                      </p>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg bg-white">
                      <ClipboardList className="h-6 w-6 text-blue-600 mb-2" />
                      <h3 className="font-semibold mb-1">Sistem Validasi</h3>
                      <p className="text-sm text-gray-600">
                        Persetujuan supervisor untuk absensi dan cuti
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold mb-3">Instruksi Login</h3>
                  <img 
                    src="/images/user-manual/1 Buka halaman login dan klik login.png" 
                    alt="Halaman Login"
                    className="w-full max-w-3xl mx-auto my-4 rounded-lg border border-gray-300 shadow-sm"
                  />
                  <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                    <li>Buka halaman login</li>
                    <li>Masukkan username dan password yang diberikan administrator</li>
                    <li>Klik "Sign In" untuk mengakses dashboard</li>
                    <li>Jika lupa password, hubungi administrator sistem</li>
                  </ol>
                </section>

                <section>
                  <h3 className="text-xl font-bold mb-3">Role Pengguna</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-900">Admin</h4>
                        <p className="text-sm text-blue-700">
                          Akses penuh: kelola pengguna, role, lokasi, dan pengaturan
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                      <UserCog className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-green-900">Supervisor</h4>
                        <p className="text-sm text-green-700">
                          Dapat absen, kelola cuti, dan validasi catatan bawahan
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <Users className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-purple-900">User Biasa</h4>
                        <p className="text-sm text-purple-700">
                          Dapat absen dan mengajukan cuti
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Admin Guide */}
            {activeTab === 'admin' && (
              <div className="space-y-8">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold">Panduan Administrator</h2>
                </div>

                <section>
                  <h3 className="text-xl font-bold mb-4">Manajemen User</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Membuat User Baru</h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                        <li>Buka "Manajemen User" dari dashboard</li>
                        <li>Klik tombol "Tambah User Baru"
                          <img 
                            src="/images/user-manual/membuat user_klik button buat user.png" 
                            alt="Klik tombol buat user"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Isi informasi yang diperlukan:
                          <img 
                            src="/images/user-manual/membuat user_mengisi detail.png" 
                            alt="Mengisi detail user baru"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                          <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                            <li>Username (3-32 karakter)</li>
                            <li>Password (minimal 8 karakter)</li>
                            <li>Alamat email</li>
                            <li>Nama lengkap</li>
                            <li>Pilih role dan posisi</li>
                            <li>Tetapkan supervisor (opsional, untuk non-admin)</li>
                          </ul>
                        </li>
                        <li>Klik "Buat User" untuk menyimpan
                          <img 
                            src="/images/user-manual/membuat user_klik buat user.png" 
                            alt="Klik buat user untuk menyimpan"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="font-semibold text-lg mb-2">Mengedit User</h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                        <li>Cari user di daftar
                          <img 
                            src="/images/user-manual/pencarian.png" 
                            alt="Mencari user"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Klik ikon edit di samping user
                          <img 
                            src="/images/user-manual/edit user.png" 
                            alt="Klik ikon edit"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Perbarui field yang diperlukan
                          <img 
                            src="/images/user-manual/edit user_mengisi detail.png" 
                            alt="Perbarui detail user"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Klik "Update User" untuk menyimpan
                          <img 
                            src="/images/user-manual/edit user_klik perbarui user.png" 
                            alt="Klik perbarui user"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="font-semibold text-lg mb-2">Menghapus User</h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                        <li>Cari user di daftar</li>
                        <li>Klik ikon hapus
                          <img 
                            src="/images/user-manual/hapus user.png" 
                            alt="Hapus user"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Konfirmasi penghapusan</li>
                      </ol>
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          <strong>Catatan:</strong> User admin tidak dapat dihapus
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold mb-4">Manajemen Role</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Membuat Role Baru</h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                        <li>Buka "Manajemen Role"</li>
                        <li>Klik "Tambah Role Baru"</li>
                        <li>Masukkan detail role:
                          <ul className="list-disc list-inside ml-6 mt-2">
                            <li>Tipe role (admin atau user)</li>
                            <li>Nama posisi (misal: Manager, Senior Developer)</li>
                            <li>Level posisi (angka lebih tinggi = wewenang lebih tinggi)</li>
                          </ul>
                        </li>
                        <li>Klik "Buat Role"</li>
                      </ol>
                    </div>
                    
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>Penting:</strong> Level posisi menentukan hierarki supervisor. 
                        Supervisor harus memiliki level posisi lebih tinggi dari bawahannya.
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold mb-4">Pengaturan Sistem</h3>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Pengaturan Lokasi</h4>
                    <p className="text-gray-700 mb-2">
                      Konfigurasi lokasi kantor dan radius untuk validasi GPS:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                      <li>Buka "Pengaturan" dari dashboard</li>
                      <li>Navigasi ke tab "Lokasi"</li>
                      <li>Tambah atau edit lokasi kantor dengan koordinat GPS</li>
                      <li>Atur radius yang diizinkan dalam meter</li>
                    </ol>
                  </div>
                </section>
              </div>
            )}

            {/* Supervisor Guide */}
            {activeTab === 'supervisor' && (
              <div className="space-y-8">
                <div className="flex items-center gap-2 mb-4">
                  <UserCog className="h-6 w-6 text-green-600" />
                  <h2 className="text-2xl font-bold">Panduan Supervisor</h2>
                </div>

                <section>
                  <h3 className="text-xl font-bold mb-4">Mencatat Absensi</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Proses Check-In</h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                        <li>Buka Dashboard</li>
                        <li>Klik tombol "Check In"
                          <img 
                            src="/images/user-manual/absen pagi.png" 
                            alt="Tombol Check In"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Izinkan akses lokasi saat diminta
                          <img 
                            src="/images/user-manual/absen pagi_dapatkan lokasi.png" 
                            alt="Akses lokasi"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Pastikan Anda berada dalam radius kantor</li>
                        <li>Ambil foto untuk verifikasi
                          <img 
                            src="/images/user-manual/absen pagi_ambil foto.png" 
                            alt="Ambil foto check in"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Klik "Kirim Check In"
                          <img 
                            src="/images/user-manual/absen pagi_kirim kehadiran.png" 
                            alt="Kirim check in"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="font-semibold text-lg mb-2">Proses Check-Out</h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                        <li>Klik tombol "Check Out" di akhir hari
                          <img 
                            src="/images/user-manual/absen sore.png" 
                            alt="Tombol Check Out"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Verifikasi lokasi Anda dalam radius kantor
                          <img 
                            src="/images/user-manual/absen sore_dapatkan lokasi.png" 
                            alt="Verifikasi lokasi check out"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Ambil foto untuk verifikasi
                          <img 
                            src="/images/user-manual/absen sore_ambil foto.png" 
                            alt="Ambil foto check out"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Klik "Kirim Check Out"
                          <img 
                            src="/images/user-manual/absen sore_kirim kehadiran.png" 
                            alt="Kirim check out"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                      </ol>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold mb-4">Validasi Bawahan</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Validasi Absensi</h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                        <li>Buka "Validasi" dari dashboard
                          <img 
                            src="/images/user-manual/validasi presensi_catatan absensi.png" 
                            alt="Menu validasi"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Tinjau catatan absensi bawahan
                          <img 
                            src="/images/user-manual/validasi presensi_catatan absensi_detail.png" 
                            alt="Detail catatan absensi"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Periksa foto dan data lokasi</li>
                        <li>Pilih status validasi:
                          <ul className="list-disc list-inside ml-6 mt-2">
                            <li>Validated - Setujui absensi</li>
                            <li>Rejected - Tolak dengan alasan di catatan</li>
                          </ul>
                        </li>
                        <li>Tambahkan catatan jika perlu</li>
                        <li>Klik "Kirim Validasi"
                          <img 
                            src="/images/user-manual/validasi presensi_catatan absensi_tolak.png" 
                            alt="Tolak validasi absensi"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="font-semibold text-lg mb-2">Persetujuan Cuti</h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                        <li>Buka bagian "Validasi"</li>
                        <li>Beralih ke tab "Pengajuan Cuti"
                          <img 
                            src="/images/user-manual/validasi presensi_pengajuan izin.png" 
                            alt="Tab pengajuan izin"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Tinjau detail dan lampiran pengajuan cuti
                          <img 
                            src="/images/user-manual/validasi presensi_pengajuan izin_detail.png" 
                            alt="Detail pengajuan cuti"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Setujui atau tolak dengan catatan
                          <img 
                            src="/images/user-manual/validasi presensi_pengajuan izin_setujui.png" 
                            alt="Setujui pengajuan"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                          <img 
                            src="/images/user-manual/validasi presensi_pengajuan izin_tolak.png" 
                            alt="Tolak pengajuan"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Kirim keputusan</li>
                      </ol>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold mb-4">Melihat Laporan</h3>
                  <p className="text-gray-700 mb-2">Akses "Riwayat" untuk melihat:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                    <li>Riwayat absensi Anda sendiri</li>
                    <li>Catatan absensi bawahan</li>
                    <li>Riwayat pengajuan cuti</li>
                    <li>Riwayat validasi</li>
                  </ul>
                </section>
              </div>
            )}

            {/* Regular User Guide */}
            {activeTab === 'user' && (
              <div className="space-y-8">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-6 w-6 text-purple-600" />
                  <h2 className="text-2xl font-bold">Panduan User Biasa</h2>
                </div>

                <section>
                  <h3 className="text-xl font-bold mb-4">Absensi Harian</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Cara Check In</h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                        <li>Buka aplikasi di perangkat mobile atau komputer</li>
                        <li>Login dengan kredensial Anda</li>
                        <li>Dari Dashboard, klik "Check In"
                          <img 
                            src="/images/user-manual/absen pagi.png" 
                            alt="Tombol Check In"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Izinkan aplikasi mengakses lokasi Anda
                          <img 
                            src="/images/user-manual/absen pagi_dapatkan lokasi.png" 
                            alt="Akses lokasi"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Pastikan Anda berada di area kantor</li>
                        <li>Ambil foto diri Anda dengan jelas
                          <img 
                            src="/images/user-manual/absen pagi_ambil foto.png" 
                            alt="Ambil foto check in"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Kirim check-in Anda
                          <img 
                            src="/images/user-manual/absen pagi_kirim kehadiran.png" 
                            alt="Kirim check in"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                      </ol>
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-800">
                          <strong>Tips:</strong> Check in sebelum jam 7:30 pagi agar tidak ditandai terlambat.
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-lg mb-2">Cara Check Out</h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                        <li>Klik tombol "Check Out" di akhir hari kerja
                          <img 
                            src="/images/user-manual/absen sore.png" 
                            alt="Tombol Check Out"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Pastikan Anda masih dalam radius kantor
                          <img 
                            src="/images/user-manual/absen sore_dapatkan lokasi.png" 
                            alt="Verifikasi lokasi"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Ambil foto
                          <img 
                            src="/images/user-manual/absen sore_ambil foto.png" 
                            alt="Ambil foto check out"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Kirim check-out Anda
                          <img 
                            src="/images/user-manual/absen sore_kirim kehadiran.png" 
                            alt="Kirim check out"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                      </ol>
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          <strong>Penting:</strong> Jangan lupa check out! Catatan tanpa check-out 
                          akan otomatis ditandai "Tidak Check Out" pada pukul 17:00.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold mb-4">Mengajukan Cuti</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Membuat Pengajuan Cuti</h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                        <li>Buka Dashboard</li>
                        <li>Klik tombol "Ajukan Cuti"
                          <img 
                            src="/images/user-manual/pengajuan izin.png" 
                            alt="Tombol ajukan cuti"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Isi formulir:
                          <img 
                            src="/images/user-manual/pengajuan izin_mengisi detail dan mengunggah dokumen.png" 
                            alt="Mengisi formulir cuti"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                          <ul className="list-disc list-inside ml-6 mt-2">
                            <li>Jenis cuti (Sakit atau Izin)</li>
                            <li>Tanggal mulai</li>
                            <li>Tanggal selesai</li>
                            <li>Alasan cuti</li>
                            <li>Upload dokumen pendukung (surat dokter, dll)</li>
                          </ul>
                        </li>
                        <li>Kirim pengajuan
                          <img 
                            src="/images/user-manual/pengajuan izin_lanjutkan ke review.png" 
                            alt="Kirim pengajuan cuti"
                            className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                          />
                        </li>
                        <li>Tunggu persetujuan supervisor</li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="font-semibold text-lg mb-2">Mengecek Status Pengajuan</h4>
                      <p className="text-gray-700 mb-2 ml-4">
                        Buka "Riwayat" → tab "Pengajuan Cuti" untuk melihat status:
                      </p>
                      <img 
                        src="/images/user-manual/riwayat pengajuan izin.png" 
                        alt="Riwayat pengajuan izin"
                        className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                      />
                      <img 
                        src="/images/user-manual/riwayat pengajuan izin_detail.png" 
                        alt="Detail pengajuan izin"
                        className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                      />
                      <img 
                        src="/images/user-manual/riwayat pengajuan izin_status.png" 
                        alt="Status pengajuan"
                        className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                      />
                      <ul className="list-disc list-inside ml-8 space-y-1 text-gray-700">
                        <li><span className="font-medium">Pending:</span> Menunggu tinjauan supervisor</li>
                        <li><span className="font-medium">Approved:</span> Pengajuan disetujui</li>
                        <li><span className="font-medium">Rejected:</span> Pengajuan ditolak (cek catatan untuk alasan)</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold mb-4">Melihat Catatan Anda</h3>
                  <p className="text-gray-700 mb-2">Buka "Riwayat" untuk melihat:</p>
                  <img 
                    src="/images/user-manual/riwayat absensi.png" 
                    alt="Riwayat absensi"
                    className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                  />
                  <img 
                    src="/images/user-manual/riwayat absensi_detail.png" 
                    alt="Detail riwayat absensi"
                    className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                  />
                  <img 
                    src="/images/user-manual/export excel.png" 
                    alt="Export ke Excel"
                    className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                  />
                  <ul className="list-disc list-inside ml-4 space-y-2 text-gray-700">
                    <li><strong>Riwayat Absensi:</strong> Semua catatan check-in/check-out Anda</li>
                    <li><strong>Pengajuan Cuti:</strong> Pengajuan cuti yang diajukan dan statusnya</li>
                    <li><strong>Status Validasi:</strong> Apakah absensi Anda sudah divalidasi supervisor</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-bold mb-4">Manajemen Profil</h3>
                  <img 
                    src="/images/user-manual/edit profile.png" 
                    alt="Edit profile"
                    className="w-full max-w-3xl mx-auto my-3 rounded-lg border border-gray-300 shadow-sm"
                  />
                  <p className="text-gray-700 mb-2">Akses profil Anda untuk:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                    <li>Melihat informasi pribadi</li>
                    <li>Melihat role dan posisi yang ditugaskan</li>
                    <li>Mengecek siapa supervisor Anda</li>
                  </ul>
                  <p className="mt-3 text-gray-700">
                    <strong>Catatan:</strong> Untuk memperbarui informasi, hubungi administrator.
                  </p>
                </section>
              </div>
            )}

            {/* FAQ */}
            {activeTab === 'faq' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-6 w-6 text-orange-600" />
                  <h2 className="text-2xl font-bold">Pertanyaan yang Sering Diajukan</h2>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-lg mb-2">Bagaimana jika tidak bisa check in karena masalah lokasi?</h4>
                    <p className="text-gray-700">
                      Pastikan layanan lokasi perangkat Anda diaktifkan. Jika Anda berada di kantor tapi masih error, 
                      hubungi supervisor atau IT support. Mereka mungkin perlu menyesuaikan pengaturan radius kantor.
                    </p>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-lg mb-2">Bisakah saya mengedit absensi setelah dikirim?</h4>
                    <p className="text-gray-700">
                      Tidak, catatan absensi tidak dapat diedit setelah dikirim. Jika Anda melakukan kesalahan, 
                      hubungi supervisor untuk menjelaskan situasinya.
                    </p>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-lg mb-2">Apa yang terjadi jika lupa check out?</h4>
                    <p className="text-gray-700">
                      Sistem akan otomatis menandai absensi Anda sebagai "Tidak Check Out" pada pukul 17:00. 
                      Ini mungkin memerlukan validasi supervisor.
                    </p>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-lg mb-2">Berapa lama waktu persetujuan pengajuan cuti?</h4>
                    <p className="text-gray-700">
                      Tergantung ketersediaan supervisor. Anda akan menerima notifikasi setelah pengajuan 
                      ditinjau. Cek halaman Riwayat untuk update status.
                    </p>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-lg mb-2">Jenis file apa yang bisa diupload untuk pengajuan cuti?</h4>
                    <p className="text-gray-700">
                      Anda dapat mengupload gambar (JPG, JPEG, PNG) dan file PDF hingga 10MB.
                    </p>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-lg mb-2">Saya lupa password. Apa yang harus dilakukan?</h4>
                    <p className="text-gray-700">
                      Hubungi administrator sistem untuk reset password. Demi keamanan, 
                      reset password harus dilakukan oleh admin.
                    </p>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-lg mb-2">Bisakah check in dari rumah atau lokasi remote?</h4>
                    <p className="text-gray-700">
                      Tidak, sistem mengharuskan Anda berada dalam radius kantor yang ditentukan. Ini untuk memastikan 
                      kehadiran fisik di tempat kerja.
                    </p>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-lg mb-2">Siapa yang bisa melihat catatan absensi saya?</h4>
                    <p className="text-gray-700">
                      Catatan absensi Anda dapat dilihat oleh Anda, supervisor, dan administrator sistem. 
                      Karyawan biasa tidak dapat melihat catatan karyawan lain.
                    </p>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-gray-100 rounded-lg border border-gray-300">
                  <h3 className="text-xl font-bold mb-4">Butuh Bantuan Lebih Lanjut?</h3>
                  <p className="text-gray-700 mb-4">
                    Jika Anda memiliki pertanyaan yang tidak tercakup dalam panduan ini, silakan hubungi:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li><strong>Masalah Teknis:</strong> Departemen IT Support</li>
                    <li><strong>Kebijakan Cuti:</strong> Human Resources</li>
                    <li><strong>Masalah Akun:</strong> Administrator Sistem</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
