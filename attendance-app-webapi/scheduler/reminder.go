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
	db             *gorm.DB
	cron           *cron.Cron
	morningEntryID cron.EntryID
	eveningEntryID cron.EntryID
}

func NewReminderScheduler(db *gorm.DB) *ReminderScheduler {
	// Initial timezone will be set from config during Start()
	return &ReminderScheduler{
		db:   db,
		cron: nil, // Will be initialized in Start()
	}
}

func (s *ReminderScheduler) Start() {
	log.Printf("=== REMINDER SCHEDULER INITIALIZATION ===")

	// Load scheduler configuration from database
	config, err := models.GetSchedulerSettings(s.db)
	if err != nil {
		log.Printf("ERROR: Failed to load scheduler settings, using defaults: %v", err)
		// Create default config
		config = &models.SchedulerConfig{
			Enabled:        true,
			AllowedDays:    []int{1, 2, 3, 4, 5}, // Monday-Friday
			MorningTime:    "07:30",
			MorningEnabled: true,
			EveningTime:    "17:00",
			EveningEnabled: true,
			Timezone:       "Asia/Jakarta",
		}
	}

	// Load timezone from configuration
	location, err := time.LoadLocation(config.Timezone)
	if err != nil {
		log.Printf("Warning: Failed to load timezone %s, using system timezone: %v", config.Timezone, err)
		location = time.Local
	}

	// Initialize cron with configured timezone
	if s.cron == nil {
		s.cron = cron.New(cron.WithLocation(location))
	}

	now := time.Now().In(location)
	log.Printf("Timezone: %s", location.String())
	log.Printf("Current time in scheduler timezone: %s", now.Format("2006-01-02 15:04:05 MST"))
	log.Printf("Server system time: %s", time.Now().Format("2006-01-02 15:04:05 MST"))
	log.Printf("Scheduler enabled: %v", config.Enabled)
	log.Printf("Allowed days: %v", config.AllowedDays)

	if !config.Enabled {
		log.Printf("⚠️ Scheduler is DISABLED in settings. No reminders will be sent.")
		log.Printf("========================================")
		return
	}

	// Schedule morning reminder if enabled
	if config.MorningEnabled {
		morningCron, err := models.BuildCronExpression(config.MorningTime, config.AllowedDays)
		if err != nil {
			log.Printf("ERROR: Failed to build morning cron expression: %v", err)
		} else {
			s.morningEntryID, err = s.cron.AddFunc(morningCron, func() {
				log.Println("⏰ CRON TRIGGERED: Starting morning clock-in reminder job...")
				s.sendClockInReminder()
			})
			if err != nil {
				log.Printf("ERROR: Failed to schedule morning reminder: %v", err)
			} else {
				log.Printf("✓ Morning reminder scheduled (Entry ID: %d) - Cron: '%s' - Time: %s", s.morningEntryID, morningCron, config.MorningTime)
			}
		}
	} else {
		log.Printf("⚠️ Morning reminder is DISABLED in settings")
	}

	// Schedule evening reminder if enabled
	if config.EveningEnabled {
		eveningCron, err := models.BuildCronExpression(config.EveningTime, config.AllowedDays)
		if err != nil {
			log.Printf("ERROR: Failed to build evening cron expression: %v", err)
		} else {
			s.eveningEntryID, err = s.cron.AddFunc(eveningCron, func() {
				log.Println("⏰ CRON TRIGGERED: Starting evening clock-out reminder job...")
				s.sendClockOutReminder()
			})
			if err != nil {
				log.Printf("ERROR: Failed to schedule evening reminder: %v", err)
			} else {
				log.Printf("✓ Evening reminder scheduled (Entry ID: %d) - Cron: '%s' - Time: %s", s.eveningEntryID, eveningCron, config.EveningTime)
			}
		}
	} else {
		log.Printf("⚠️ Evening reminder is DISABLED in settings")
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
	log.Printf("========================================")
}

// ReloadSchedule reloads scheduler configuration from database and updates cron jobs
func (s *ReminderScheduler) ReloadSchedule() error {
	log.Printf("=== RELOADING SCHEDULER CONFIGURATION ===")

	// Load new configuration
	config, err := models.GetSchedulerSettings(s.db)
	if err != nil {
		log.Printf("ERROR: Failed to load scheduler settings during reload: %v", err)
		return err
	}

	// Stop current cron
	if s.cron != nil {
		s.cron.Stop()
		log.Printf("✓ Stopped existing cron scheduler")
	}

	// Remove old entries
	if s.morningEntryID != 0 {
		s.cron.Remove(s.morningEntryID)
		s.morningEntryID = 0
	}
	if s.eveningEntryID != 0 {
		s.cron.Remove(s.eveningEntryID)
		s.eveningEntryID = 0
	}

	// Reload timezone
	location, err := time.LoadLocation(config.Timezone)
	if err != nil {
		log.Printf("Warning: Failed to load timezone %s, using system timezone: %v", config.Timezone, err)
		location = time.Local
	}

	// Create new cron with updated timezone
	s.cron = cron.New(cron.WithLocation(location))

	log.Printf("Configuration reloaded:")
	log.Printf("  - Enabled: %v", config.Enabled)
	log.Printf("  - Allowed Days: %v", config.AllowedDays)
	log.Printf("  - Morning: %s (enabled: %v)", config.MorningTime, config.MorningEnabled)
	log.Printf("  - Evening: %s (enabled: %v)", config.EveningTime, config.EveningEnabled)
	log.Printf("  - Timezone: %s", config.Timezone)

	// Restart with new configuration
	s.Start()

	log.Printf("✓ Scheduler configuration reloaded successfully")
	log.Printf("========================================")
	return nil
}

func (s *ReminderScheduler) Stop() {
	if s.cron != nil {
		s.cron.Stop()
		log.Println("Reminder scheduler stopped")
	}
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
	// Load scheduler configuration for runtime validation
	config, err := models.GetSchedulerSettings(s.db)
	if err != nil {
		log.Printf("Failed to load scheduler settings: %v", err)
		return
	}

	// Check if scheduler is enabled
	if !config.Enabled {
		log.Printf("⚠️ Scheduler is disabled. Skipping clock-in reminder.")
		return
	}

	// Check if morning reminder is enabled
	if !config.MorningEnabled {
		log.Printf("⚠️ Morning reminder is disabled. Skipping clock-in reminder.")
		return
	}

	// Validate if today is an allowed day
	if !config.IsTodayAllowed() {
		today := time.Now().Weekday()
		log.Printf("⚠️ Today (%s) is not in the allowed days list %v. Skipping clock-in reminder.", today, config.AllowedDays)
		return
	}

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

	log.Printf("✓ Successfully sent clock-in reminder to %d users", len(emails))
}

// sendClockOutReminder sends evening clock-out reminder to all users
func (s *ReminderScheduler) sendClockOutReminder() {
	// Load scheduler configuration for runtime validation
	config, err := models.GetSchedulerSettings(s.db)
	if err != nil {
		log.Printf("Failed to load scheduler settings: %v", err)
		return
	}

	// Check if scheduler is enabled
	if !config.Enabled {
		log.Printf("⚠️ Scheduler is disabled. Skipping clock-out reminder.")
		return
	}

	// Check if evening reminder is enabled
	if !config.EveningEnabled {
		log.Printf("⚠️ Evening reminder is disabled. Skipping clock-out reminder.")
		return
	}

	// Validate if today is an allowed day
	if !config.IsTodayAllowed() {
		today := time.Now().Weekday()
		log.Printf("⚠️ Today (%s) is not in the allowed days list %v. Skipping clock-out reminder.", today, config.AllowedDays)
		return
	}

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

	log.Printf("✓ Successfully sent clock-out reminder to %d users", len(emails))
}
