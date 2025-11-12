package scheduler

import (
	"attendance-app/models"
	"attendance-app/utils/email"
	"log"
	"time"

	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

type ReminderScheduler struct {
	db   *gorm.DB
	cron *cron.Cron
}

func NewReminderScheduler(db *gorm.DB) *ReminderScheduler {
	// Use Asia/Jakarta timezone
	location, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		log.Printf("Warning: Failed to load Asia/Jakarta timezone, using system timezone: %v", err)
		location = time.Local
	}

	return &ReminderScheduler{
		db:   db,
		cron: cron.New(cron.WithLocation(location)),
	}
}

func (s *ReminderScheduler) Start() {
	// Get the timezone from the cron scheduler
	location := s.cron.Location()
	now := time.Now().In(location)

	log.Printf("=== REMINDER SCHEDULER INITIALIZATION ===")
	log.Printf("Timezone: %s", location.String())
	log.Printf("Current time in scheduler timezone: %s", now.Format("2006-01-02 15:04:05 MST"))
	log.Printf("Server system time: %s", time.Now().Format("2006-01-02 15:04:05 MST"))

	// Schedule morning reminder at 07:30 (Asia/Jakarta time)
	morningEntryID, err := s.cron.AddFunc("30 7 * * *", func() {
		log.Println("⏰ CRON TRIGGERED: Starting morning clock-in reminder job...")
		s.sendClockInReminder()
	})
	if err != nil {
		log.Printf("ERROR: Failed to schedule morning reminder: %v", err)
	} else {
		log.Printf("✓ Morning reminder scheduled (Entry ID: %d) - Cron: '30 7 * * *'", morningEntryID)
	}

	// Schedule evening reminder at 17:00 (Asia/Jakarta time)
	eveningEntryID, err := s.cron.AddFunc("0 17 * * *", func() {
		log.Println("⏰ CRON TRIGGERED: Starting evening clock-out reminder job...")
		s.sendClockOutReminder()
	})
	if err != nil {
		log.Printf("ERROR: Failed to schedule evening reminder: %v", err)
	} else {
		log.Printf("✓ Evening reminder scheduled (Entry ID: %d) - Cron: '0 17 * * *'", eveningEntryID)
	}

	s.cron.Start()
	log.Printf("✓ Cron scheduler started successfully")

	// Log all registered cron entries with next run times
	entries := s.cron.Entries()
	log.Printf("=== REGISTERED CRON JOBS: %d ===", len(entries))
	for i, entry := range entries {
		nextRun := entry.Next.In(location)
		log.Printf("  [%d] Entry ID: %d | Next Run: %s", i+1, entry.ID, nextRun.Format("2006-01-02 15:04:05 MST"))
	}
	log.Printf("- Morning reminder: 07:30 (Asia/Jakarta)")
	log.Printf("- Evening reminder: 17:00 (Asia/Jakarta)")
	log.Printf("========================================")
}

func (s *ReminderScheduler) Stop() {
	s.cron.Stop()
	log.Println("Reminder scheduler stopped")
}

// getAllUserEmails retrieves all active user email addresses from the database
func (s *ReminderScheduler) getAllUserEmails() ([]string, error) {
	var users []models.User

	// Query all users with non-empty email addresses
	// You can add additional filters here (e.g., active users only)
	if err := s.db.Where("email IS NOT NULL AND email != ''").Find(&users).Error; err != nil {
		log.Printf("Error fetching user emails: %v", err)
		return nil, err
	}

	// Extract emails into a slice
	emails := make([]string, 0, len(users))
	for _, user := range users {
		if user.Email != "" {
			emails = append(emails, user.Email)
		}
	}

	return emails, nil
}

// sendClockInReminder sends morning clock-in reminder to all users
func (s *ReminderScheduler) sendClockInReminder() {
	// Get all user emails
	emails, err := s.getAllUserEmails()
	if err != nil {
		log.Printf("Failed to get user emails for clock-in reminder: %v", err)
		return
	}

	if len(emails) == 0 {
		log.Println("No user emails found to send clock-in reminder")
		return
	}

	log.Printf("Sending clock-in reminder to %d users", len(emails))

	// Send email using the email service
	if err := email.SendClockInReminder(emails); err != nil {
		log.Printf("Failed to send clock-in reminder: %v", err)
		return
	}

	log.Printf("Successfully sent clock-in reminder to %d users", len(emails))
}

// sendClockOutReminder sends evening clock-out reminder to all users
func (s *ReminderScheduler) sendClockOutReminder() {
	// Get all user emails
	emails, err := s.getAllUserEmails()
	if err != nil {
		log.Printf("Failed to get user emails for clock-out reminder: %v", err)
		return
	}

	if len(emails) == 0 {
		log.Println("No user emails found to send clock-out reminder")
		return
	}

	log.Printf("Sending clock-out reminder to %d users", len(emails))

	// Send email using the email service
	if err := email.SendClockOutReminder(emails); err != nil {
		log.Printf("Failed to send clock-out reminder: %v", err)
		return
	}

	log.Printf("Successfully sent clock-out reminder to %d users", len(emails))
}
