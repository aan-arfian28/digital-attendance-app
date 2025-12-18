package email

import (
	"bytes"
	"fmt"
	"log"
	"net/smtp"

	"attendance-app/config"
)

// EmailContent represents the content of an email
type EmailContent struct {
	Subject string
	Body    string
}

// SendEmail sends an email to multiple recipients using Brevo SMTP
// Each recipient receives an individual email (not exposed to other recipients)
func SendEmail(recipients []string, subject, body string) error {
	if len(recipients) == 0 {
		log.Println("No recipients provided for email")
		return fmt.Errorf("no recipients provided")
	}

	// Get SMTP configuration
	smtpConfig := config.GetSMTPConfig()

	// Validate SMTP configuration
	if smtpConfig.Host == "" || smtpConfig.User == "" || smtpConfig.Password == "" {
		return fmt.Errorf("SMTP configuration is incomplete")
	}

	if smtpConfig.SenderEmail == "" {
		return fmt.Errorf("sender email is not configured")
	}

	// Set default sender name if not provided
	senderName := smtpConfig.SenderName
	if senderName == "" {
		senderName = "Digital Attendance System"
	}

	// Prepare authentication
	auth := smtp.PlainAuth("", smtpConfig.User, smtpConfig.Password, smtpConfig.Host)

	// Build sender info
	from := fmt.Sprintf("%s <%s>", senderName, smtpConfig.SenderEmail)

	// SMTP server address
	addr := fmt.Sprintf("%s:%d", smtpConfig.Host, smtpConfig.Port)

	// Track success and failures
	successCount := 0
	failedRecipients := []string{}

	// Send individual email to each recipient
	for _, recipient := range recipients {
		// Build email message for this specific recipient
		var message bytes.Buffer
		message.WriteString(fmt.Sprintf("From: %s\r\n", from))
		message.WriteString(fmt.Sprintf("To: %s\r\n", recipient))
		message.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
		message.WriteString("MIME-Version: 1.0\r\n")
		message.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
		message.WriteString("\r\n")
		message.WriteString(body)

		// Send email to this single recipient
		err := smtp.SendMail(
			addr,
			auth,
			smtpConfig.SenderEmail,
			[]string{recipient},
			message.Bytes(),
		)

		if err != nil {
			log.Printf("Failed to send email to %s: %v", recipient, err)
			failedRecipients = append(failedRecipients, recipient)
			continue
		}

		successCount++
		log.Printf("Successfully sent email to %s", recipient)
	}

	// Log summary
	log.Printf("Email sending complete: %d succeeded, %d failed out of %d total recipients",
		successCount, len(failedRecipients), len(recipients))

	if len(failedRecipients) > 0 {
		log.Printf("Failed recipients: %v", failedRecipients)
	}

	// Return error only if ALL emails failed
	if successCount == 0 {
		return fmt.Errorf("failed to send email to any recipients (%d failed)", len(failedRecipients))
	}

	// Return nil if at least one email succeeded (partial success is acceptable for bulk emails)
	return nil
}

// SendClockInReminder sends a morning clock-in reminder
func SendClockInReminder(recipients []string) error {
	subject := "Pengingat Absensi Masuk - Sistem Absensi Digital"

	body := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header { 
            background-color: #428bff; 
            color: white; 
            padding: 30px 20px; 
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content { 
            padding: 30px 25px;
            background-color: #ffffff;
        }
        .content h2 {
            color: #428bff;
            font-size: 20px;
            margin-top: 0;
            margin-bottom: 15px;
        }
        .content p {
            margin: 12px 0;
            color: #555;
        }
        .info-box {
            background-color: #f8f9fa;
            border-left: 4px solid #428bff;
            padding: 15px;
            margin: 20px 0;
        }
        .info-box strong {
            color: #428bff;
        }
        .checklist {
            margin: 20px 0;
            padding-left: 0;
        }
        .checklist li {
            list-style: none;
            padding: 8px 0;
            color: #555;
        }
        .checklist li:before {
            content: "✓ ";
            color: #428bff;
            font-weight: bold;
            margin-right: 8px;
        }
        .footer { 
            background-color: #f8f9fa;
            text-align: center; 
            padding: 20px; 
            font-size: 12px; 
            color: #777;
            border-top: 1px solid #e9ecef;
        }
        .footer p {
            margin: 5px 0;
        }
        .footer a {
            color: #428bff;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .divider {
            height: 1px;
            background-color: #e9ecef;
            margin: 20px 0;
        }
        .button-container {
            text-align: center;
            margin: 25px 0;
        }
        .button {
            display: inline-block;
            background-color: #428bff;
            color: white !important;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            font-size: 16px;
        }
        .button:hover {
            background-color: #3b7ee6;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Selamat Pagi</h1>
        </div>
        <div class="content">
            <h2>Pengingat Absensi Masuk</h2>
            <p>Yth. Bapak/Ibu Guru, Staff, dan Siswa-siswi,</p>
            <p>Kami mengingatkan untuk melakukan absensi masuk hari ini melalui Sistem Absensi Digital sekolah.</p>
            
            <div class="info-box">
                <strong>Waktu:</strong> 07:30 WIB
            </div>
            
            <div class="button-container">
                <a href="https://attendapp.riyaldi.qzz.io/dashboard" class="button">Buka Sistem Absensi</a>
            </div>
            
            <p>Mohon perhatikan hal-hal berikut:</p>
            <ul class="checklist">
                <li>Pastikan melakukan absensi tepat waktu</li>
                <li>Pastikan berada dalam area sekolah yang ditentukan</li>
                <li>Ambil foto dengan pencahayaan yang cukup untuk verifikasi</li>
            </ul>
            
            <div class="divider"></div>
            
            <p style="margin-top: 20px; color: #666; font-size: 14px;">
                Terima kasih atas perhatian dan kerja sama.
            </p>
        </div>
        <div class="footer">
            <p>Email ini dikirim secara otomatis oleh Sistem Absensi Digital.</p>
            <p>Jika Anda tidak ingin menerima email pengingat ini, silakan hubungi administrator atau 
            <a href="mailto:admin@attendapp.riyaldi.qzz.io?subject=Unsubscribe%20Email%20Reminder">berhenti berlangganan</a>.</p>
            <p style="margin-top: 15px;">&copy; 2025 Digital Attendance System. Hak cipta dilindungi.</p>
        </div>
    </div>
</body>
</html>
`

	return SendEmail(recipients, subject, body)
}

// SendAttendanceValidationNotification sends a notification when attendance is validated
func SendAttendanceValidationNotification(recipientEmail, userName, status, validatorName, notes string) error {
	subject := "Update Status Validasi Absensi - Sistem Absensi Digital"

	// Determine status color and message
	statusColor := "#28a745" // green for approved
	statusMessage := "disetujui"
	if status == "REJECTED" {
		statusColor = "#dc3545" // red for rejected
		statusMessage = "ditolak"
	}

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header { 
            background-color: #428bff; 
            color: white; 
            padding: 30px 20px; 
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content { 
            padding: 30px 20px;
        }
        .content h2 {
            color: #428bff;
            margin-top: 0;
        }
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 5px;
            font-weight: bold;
            color: white;
            background-color: %s;
            margin: 15px 0;
        }
        .info-box {
            background-color: #e7f3ff;
            border-left: 4px solid #428bff;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-box strong {
            color: #428bff;
        }
        .notes-box {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .footer { 
            background-color: #f8f9fa;
            text-align: center; 
            padding: 20px; 
            font-size: 12px; 
            color: #777;
            border-top: 1px solid #e9ecef;
        }
        .footer p {
            margin: 5px 0;
        }
        .button {
            display: inline-block;
            background-color: #428bff;
            color: white !important;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Update Validasi Absensi</h1>
        </div>
        <div class="content">
            <h2>Notifikasi Validasi</h2>
            <p>Yth. %s,</p>
            <p>Absensi Anda telah <strong>%s</strong> oleh supervisor.</p>
            
            <div class="status-badge">
                Status: %s
            </div>
            
            <div class="info-box">
                <strong>Divalidasi oleh:</strong> %s
            </div>
            
            %s
            
            <div style="text-align: center;">
                <a href="https://attendapp.riyaldi.qzz.io/dashboard" class="button">Lihat Detail Absensi</a>
            </div>
            
            <p style="margin-top: 20px; color: #666; font-size: 14px;">
                Jika Anda memiliki pertanyaan, silakan hubungi supervisor atau administrator.
            </p>
        </div>
        <div class="footer">
            <p>Email ini dikirim secara otomatis oleh Sistem Absensi Digital.</p>
            <p style="margin-top: 15px;">&copy; 2025 Digital Attendance System. Hak cipta dilindungi.</p>
        </div>
    </div>
</body>
</html>
`, statusColor, userName, statusMessage, status, validatorName, func() string {
		if notes != "" {
			return fmt.Sprintf(`<div class="notes-box">
                <strong>Catatan dari Validator:</strong><br>
                %s
            </div>`, notes)
		}
		return ""
	}())

	return SendEmail([]string{recipientEmail}, subject, body)
}

// SendLeaveRequestNotification sends a notification to supervisor about new leave request
func SendLeaveRequestNotification(recipientEmail, supervisorName, employeeName, leaveType, startDate, endDate, reason string) error {
	subject := "Pengajuan Izin Baru Memerlukan Persetujuan - Sistem Absensi Digital"

	// Determine leave type label
	leaveTypeLabel := "Sakit"
	if leaveType == "PERMIT" {
		leaveTypeLabel = "Izin"
	}

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header { 
            background-color: #428bff; 
            color: white; 
            padding: 30px 20px; 
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content { 
            padding: 30px 20px;
        }
        .content h2 {
            color: #428bff;
            margin-top: 0;
        }
        .alert-box {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .alert-box strong {
            color: #856404;
        }
        .info-box {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-row {
            display: flex;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: bold;
            color: #428bff;
            min-width: 120px;
        }
        .info-value {
            flex: 1;
            color: #333;
        }
        .reason-box {
            background-color: #e7f3ff;
            border-left: 4px solid #428bff;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .footer { 
            background-color: #f8f9fa;
            text-align: center; 
            padding: 20px; 
            font-size: 12px; 
            color: #777;
            border-top: 1px solid #e9ecef;
        }
        .footer p {
            margin: 5px 0;
        }
        .button {
            display: inline-block;
            background-color: #428bff;
            color: white !important;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔔 Pengajuan Izin Baru</h1>
        </div>
        <div class="content">
            <h2>Memerlukan Persetujuan Anda</h2>
            <p>Yth. %s,</p>
            <p><strong>%s</strong> telah mengajukan permohonan izin yang memerlukan persetujuan Anda.</p>
            
            <div class="alert-box">
                <strong>⚠️ Tindakan Diperlukan:</strong> Silakan tinjau dan setujui/tolak pengajuan ini melalui sistem.
            </div>
            
            <div class="info-box">
                <div class="info-row">
                    <div class="info-label">Nama Pengaju:</div>
                    <div class="info-value">%s</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Jenis Izin:</div>
                    <div class="info-value">%s</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Tanggal Mulai:</div>
                    <div class="info-value">%s</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Tanggal Selesai:</div>
                    <div class="info-value">%s</div>
                </div>
            </div>
            
            <div class="reason-box">
                <strong>Alasan Pengajuan:</strong><br>
                %s
            </div>
            
            <div style="text-align: center;">
                <a href="https://attendapp.riyaldi.qzz.io/dashboard/validation" class="button">Tinjau Pengajuan</a>
            </div>
            
            <p style="margin-top: 20px; color: #666; font-size: 14px;">
                Mohon segera meninjau pengajuan ini untuk memastikan proses persetujuan berjalan lancar.
            </p>
        </div>
        <div class="footer">
            <p>Email ini dikirim secara otomatis oleh Sistem Absensi Digital.</p>
            <p style="margin-top: 15px;">&copy; 2025 Digital Attendance System. Hak cipta dilindungi.</p>
        </div>
    </div>
</body>
</html>
`, supervisorName, employeeName, employeeName, leaveTypeLabel, startDate, endDate, reason)

	return SendEmail([]string{recipientEmail}, subject, body)
}

// SendClockOutReminder sends an evening clock-out reminder
func SendClockOutReminder(recipients []string) error {
	subject := "Pengingat Absensi Keluar - Sistem Absensi Digital"

	body := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header { 
            background-color: #428bff; 
            color: white; 
            padding: 30px 20px; 
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content { 
            padding: 30px 25px;
            background-color: #ffffff;
        }
        .content h2 {
            color: #428bff;
            font-size: 20px;
            margin-top: 0;
            margin-bottom: 15px;
        }
        .content p {
            margin: 12px 0;
            color: #555;
        }
        .info-box {
            background-color: #f8f9fa;
            border-left: 4px solid #428bff;
            padding: 15px;
            margin: 20px 0;
        }
        .info-box strong {
            color: #428bff;
        }
        .warning-box {
            background-color: #fff8e6;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
        }
        .warning-box strong {
            color: #cc9a06;
        }
        .checklist {
            margin: 20px 0;
            padding-left: 0;
        }
        .checklist li {
            list-style: none;
            padding: 8px 0;
            color: #555;
        }
        .checklist li:before {
            content: "✓ ";
            color: #428bff;
            font-weight: bold;
            margin-right: 8px;
        }
        .footer { 
            background-color: #f8f9fa;
            text-align: center; 
            padding: 20px; 
            font-size: 12px; 
            color: #777;
            border-top: 1px solid #e9ecef;
        }
        .footer p {
            margin: 5px 0;
        }
        .footer a {
            color: #428bff;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .divider {
            height: 1px;
            background-color: #e9ecef;
            margin: 20px 0;
        }
        .button-container {
            text-align: center;
            margin: 25px 0;
        }
        .button {
            display: inline-block;
            background-color: #428bff;
            color: white !important;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            font-size: 16px;
        }
        .button:hover {
            background-color: #3b7ee6;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Pengingat Akhir Kegiatan</h1>
        </div>
        <div class="content">
            <h2>Pengingat Absensi Keluar</h2>
            <p>Yth. Bapak/Ibu Guru, Staff, dan Siswa-siswi,</p>
            <p>Kami mengingatkan untuk melakukan absensi keluar sebelum meninggalkan sekolah melalui Sistem Absensi Digital.</p>
            
            <div class="info-box">
                <strong>Waktu:</strong> 17:00 WIB
            </div>
            
            <div class="warning-box">
                <strong>Pemberitahuan Penting:</strong> Apabila tidak melakukan absensi keluar sebelum pukul 17:00 WIB, sistem akan secara otomatis menandai status kehadiran sebagai "Tidak Absen Keluar".
            </div>
            
            <div class="button-container">
                <a href="https://attendapp.riyaldi.qzz.io/dashboard" class="button">Buka Sistem Absensi</a>
            </div>
            
            <p>Mohon perhatikan hal-hal berikut:</p>
            <ul class="checklist">
                <li>Pastikan melakukan absensi keluar sebelum meninggalkan sekolah</li>
                <li>Pastikan berada dalam area sekolah yang ditentukan</li>
                <li>Ambil foto dengan pencahayaan yang cukup untuk verifikasi</li>
            </ul>
            
            <div class="divider"></div>
            
            <p style="margin-top: 20px; color: #666; font-size: 14px;">
                Terima kasih atas perhatian dan kerja sama.
            </p>
        </div>
        <div class="footer">
            <p>Email ini dikirim secara otomatis oleh Sistem Absensi Digital.</p>
            <p>Jika Anda tidak ingin menerima email pengingat ini, silakan hubungi administrator atau 
            <a href="mailto:admin@attendapp.riyaldi.qzz.io?subject=Unsubscribe%20Email%20Reminder">berhenti berlangganan</a>.</p>
            <p style="margin-top: 15px;">&copy; 2025 Digital Attendance System. Hak cipta dilindungi.</p>
        </div>
    </div>
</body>
</html>
`

	return SendEmail(recipients, subject, body)
}
