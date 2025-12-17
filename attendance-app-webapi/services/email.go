package services

import (
	"fmt"
	"net/smtp"
	"os"
)

type EmailService struct {
	smtpHost     string
	smtpPort     string
	smtpUsername string
	smtpPassword string
	fromEmail    string
}

func NewEmailService() *EmailService {
	return &EmailService{
		smtpHost:     os.Getenv("SMTP_HOST"),
		smtpPort:     os.Getenv("SMTP_PORT"),
		smtpUsername: os.Getenv("SMTP_USERNAME"),
		smtpPassword: os.Getenv("SMTP_PASSWORD"),
		fromEmail:    os.Getenv("FROM_EMAIL"),
	}
}

func (s *EmailService) SendAttendanceReminder(toEmail, userName string) error {
	subject := "Daily Attendance Reminder"
	body := fmt.Sprintf("Dear %s,\n\nThis is a reminder to record your attendance for today.\n\nBest regards,\nDigital Attendance System", userName)

	msg := fmt.Sprintf("From: %s\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"\r\n"+
		"%s\r\n", s.fromEmail, toEmail, subject, body)

	auth := smtp.PlainAuth("", s.smtpUsername, s.smtpPassword, s.smtpHost)
	addr := fmt.Sprintf("%s:%s", s.smtpHost, s.smtpPort)

	return smtp.SendMail(addr, auth, s.fromEmail, []string{toEmail}, []byte(msg))
}

func (s *EmailService) SendAttendanceValidationNotification(toEmail, userName, status, validatorName, notes string) error {
	subject := "Attendance Validation Update"
	body := fmt.Sprintf("Dear %s,\n\nYour attendance has been %s by %s.\n\nNotes: %s\n\nBest regards,\nDigital Attendance System",
		userName, status, validatorName, notes)

	msg := fmt.Sprintf("From: %s\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"\r\n"+
		"%s\r\n", s.fromEmail, toEmail, subject, body)

	auth := smtp.PlainAuth("", s.smtpUsername, s.smtpPassword, s.smtpHost)
	addr := fmt.Sprintf("%s:%s", s.smtpHost, s.smtpPort)

	return smtp.SendMail(addr, auth, s.fromEmail, []string{toEmail}, []byte(msg))
}

func (s *EmailService) SendLeaveRequestNotification(toEmail, supervisorName, employeeName, leaveType, startDate, endDate, reason string) error {
	subject := "New Leave Request Submitted"
	body := fmt.Sprintf("Dear %s,\n\n%s has submitted a new leave request that requires your approval.\n\nLeave Details:\n- Type: %s\n- Start Date: %s\n- End Date: %s\n- Reason: %s\n\nPlease review and approve/reject this request in the system.\n\nBest regards,\nDigital Attendance System",
		supervisorName, employeeName, leaveType, startDate, endDate, reason)

	msg := fmt.Sprintf("From: %s\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"\r\n"+
		"%s\r\n", s.fromEmail, toEmail, subject, body)

	auth := smtp.PlainAuth("", s.smtpUsername, s.smtpPassword, s.smtpHost)
	addr := fmt.Sprintf("%s:%s", s.smtpHost, s.smtpPort)

	return smtp.SendMail(addr, auth, s.fromEmail, []string{toEmail}, []byte(msg))
}
