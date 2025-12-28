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

// getUsersWithoutClockIn retrieves emails of users who haven't clocked in today
func (s *ReminderScheduler) getUsersWithoutClockIn() ([]string, int, error) {
	// Load timezone
	location, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		location = time.Local
	}

	// Get today's date range in Asia/Jakarta timezone
	now := time.Now().In(location)
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, location)
	endOfDay := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, location)

	// Get all users with valid emails
	var allUsers []models.User
	if err := s.db.Where("email IS NOT NULL AND email != ''").Find(&allUsers).Error; err != nil {
		log.Printf("Error fetching users: %v", err)
		return nil, 0, err
	}

	totalUsers := len(allUsers)

	// Get users who have already clocked in today
	var attendanceRecords []models.Attendance
	if err := s.db.Where("check_in_time >= ? AND check_in_time <= ?", startOfDay, endOfDay).
		Select("user_id").
		Find(&attendanceRecords).Error; err != nil {
		log.Printf("Error fetching attendance records: %v", err)
		return nil, totalUsers, err
	}

	// Create a map of user IDs who have clocked in
	clockedInUsers := make(map[uint]bool)
	for _, record := range attendanceRecords {
		clockedInUsers[record.UserID] = true
	}

	// Filter users who haven't clocked in
	emails := make([]string, 0)
	for _, user := range allUsers {
		if !clockedInUsers[user.ID] && user.Email != "" {
			emails = append(emails, user.Email)
		}
	}

	log.Printf("Clock-in check: Total users=%d, Already clocked in=%d, Need reminder=%d",
		totalUsers, len(clockedInUsers), len(emails))

	return emails, totalUsers, nil
}

// getUsersWhoNeedClockOut retrieves emails of users who clocked in but haven't clocked out today
func (s *ReminderScheduler) getUsersWhoNeedClockOut() ([]string, int, error) {
	// Load timezone
	location, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		location = time.Local
	}

	// Get today's date range in Asia/Jakarta timezone
	now := time.Now().In(location)
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, location)
	endOfDay := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, location)

	// Get all users with valid emails
	var allUsers []models.User
	if err := s.db.Where("email IS NOT NULL AND email != ''").Find(&allUsers).Error; err != nil {
		log.Printf("Error fetching users: %v", err)
		return nil, 0, err
	}

	totalUsers := len(allUsers)

	// Get users who clocked in today but haven't clocked out
	var attendanceRecords []models.Attendance
	if err := s.db.Where("check_in_time >= ? AND check_in_time <= ? AND check_out_time IS NULL", startOfDay, endOfDay).
		Preload("User").
		Find(&attendanceRecords).Error; err != nil {
		log.Printf("Error fetching attendance records: %v", err)
		return nil, totalUsers, err
	}

	// Extract emails from users who need to clock out
	emails := make([]string, 0)
	for _, record := range attendanceRecords {
		if record.User.Email != "" {
			emails = append(emails, record.User.Email)
		}
	}

	log.Printf("Clock-out check: Total users=%d, Clocked in without clock-out=%d, Need reminder=%d",
		totalUsers, len(attendanceRecords), len(emails))

	return emails, totalUsers, nil
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

	// Get users who haven't clocked in today
	emails, totalUsers, err := s.getUsersWithoutClockIn()
	if err != nil {
		log.Printf("❌ Failed to get users without clock-in: %v", err)
		return
	}

	if len(emails) == 0 {
		log.Printf("✓ All users (%d) have already clocked in. No reminder needed.", totalUsers)
		return
	}

	log.Printf("📧 Sending clock-in reminder to %d users (out of %d total users)", len(emails), totalUsers)

	// Send email using the email service
	if err := email.SendClockInReminder(emails); err != nil {
		log.Printf("❌ Failed to send clock-in reminder: %v", err)
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

	// Get users who clocked in but haven't clocked out
	emails, totalUsers, err := s.getUsersWhoNeedClockOut()
	if err != nil {
		log.Printf("❌ Failed to get users who need clock-out: %v", err)
		return
	}

	if len(emails) == 0 {
		log.Printf("✓ No users need clock-out reminder (Total users: %d)", totalUsers)
		return
	}

	log.Printf("📧 Sending clock-out reminder to %d users (out of %d total users)", len(emails), totalUsers)

	// Send email using the email service
	if err := email.SendClockOutReminder(emails); err != nil {
		log.Printf("❌ Failed to send clock-out reminder: %v", err)
		return
	}

	log.Printf("✓ Successfully sent clock-out reminder to %d users", len(emails))
}

// GetUsersWithoutClockInToday is a public helper function to get users who haven't clocked in today
// Can be used by handlers for manual testing
func GetUsersWithoutClockInToday(db *gorm.DB) (emails []string, totalUsers, alreadyClockedIn int, err error) {
	// Load timezone
	location, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		location = time.Local
	}

	// Get today's date range in Asia/Jakarta timezone
	now := time.Now().In(location)
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, location)
	endOfDay := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, location)

	// Get all users with valid emails
	var allUsers []models.User
	if err := db.Where("email IS NOT NULL AND email != ''").Find(&allUsers).Error; err != nil {
		return nil, 0, 0, err
	}

	totalUsers = len(allUsers)

	// Get users who have already clocked in today
	var attendanceRecords []models.Attendance
	if err := db.Where("check_in_time >= ? AND check_in_time <= ?", startOfDay, endOfDay).
		Select("user_id").
		Find(&attendanceRecords).Error; err != nil {
		return nil, totalUsers, 0, err
	}

	// Create a map of user IDs who have clocked in
	clockedInUsers := make(map[uint]bool)
	for _, record := range attendanceRecords {
		clockedInUsers[record.UserID] = true
	}

	alreadyClockedIn = len(clockedInUsers)

	// Filter users who haven't clocked in
	emails = make([]string, 0)
	for _, user := range allUsers {
		if !clockedInUsers[user.ID] && user.Email != "" {
			emails = append(emails, user.Email)
		}
	}

	return emails, totalUsers, alreadyClockedIn, nil
}

// GetUsersWhoNeedClockOutToday is a public helper function to get users who need to clock out today
// Can be used by handlers for manual testing
func GetUsersWhoNeedClockOutToday(db *gorm.DB) (emails []string, totalUsers, needClockOut int, err error) {
	// Load timezone
	location, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		location = time.Local
	}

	// Get today's date range in Asia/Jakarta timezone
	now := time.Now().In(location)
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, location)
	endOfDay := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, location)

	// Get all users with valid emails
	var allUsers []models.User
	if err := db.Where("email IS NOT NULL AND email != ''").Find(&allUsers).Error; err != nil {
		return nil, 0, 0, err
	}

	totalUsers = len(allUsers)

	// Get users who clocked in today but haven't clocked out
	var attendanceRecords []models.Attendance
	if err := db.Where("check_in_time >= ? AND check_in_time <= ? AND check_out_time IS NULL", startOfDay, endOfDay).
		Preload("User").
		Find(&attendanceRecords).Error; err != nil {
		return nil, totalUsers, 0, err
	}

	needClockOut = len(attendanceRecords)

	// Extract emails from users who need to clock out
	emails = make([]string, 0)
	for _, record := range attendanceRecords {
		if record.User.Email != "" {
			emails = append(emails, record.User.Email)
		}
	}

	return emails, totalUsers, needClockOut, nil
}
