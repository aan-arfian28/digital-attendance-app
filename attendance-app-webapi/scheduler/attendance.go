package scheduler

import (
	"attendance-app/models"
	"log"
	"time"

	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

type AttendanceScheduler struct {
	db   *gorm.DB
	cron *cron.Cron
}

func NewAttendanceScheduler(db *gorm.DB) *AttendanceScheduler {
	return &AttendanceScheduler{
		db:   db,
		cron: cron.New(cron.WithLocation(time.Local)),
	}
}

func (s *AttendanceScheduler) Start() {
	// Schedule create pending records at midnight (00:00) every day
	s.cron.AddFunc("0 0 * * *", func() {
		s.createPendingRecords()
	})

	// Schedule marking absent and didn't checkout at 17:00 every day
	s.cron.AddFunc("0 17 * * *", func() {
		s.markAbsentRecords()
		s.markDidntCheckout()
	})

	s.cron.Start()
}

func (s *AttendanceScheduler) Stop() {
	s.cron.Stop()
}

func (s *AttendanceScheduler) createPendingRecords() {
	var users []models.User
	if err := s.db.Find(&users).Error; err != nil {
		log.Printf("Error fetching users: %v", err)
		return
	}

	now := time.Now()
	checkInTime := time.Date(now.Year(), now.Month(), now.Day(), 7, 30, 0, 0, now.Location())

	// Start transaction
	tx := s.db.Begin()

	for _, user := range users {
		// Skip if record already exists for today
		var exists bool
		err := tx.Model(&models.Attendance{}).
			Where("user_id = ? AND DATE(check_in_time) = DATE(?)", user.ID, now).
			Select("1").
			Scan(&exists).Error

		if err != nil {
			log.Printf("Error checking existing attendance for user %d: %v", user.ID, err)
			continue
		}

		if exists {
			continue
		}

		// Create pending attendance record
		attendance := models.Attendance{
			UserID:           user.ID,
			CheckInTime:      &checkInTime,
			Status:           models.OnTime,
			ValidationStatus: models.Pending,
		}

		if err := tx.Create(&attendance).Error; err != nil {
			log.Printf("Error creating pending attendance for user %d: %v", user.ID, err)
			tx.Rollback()
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		log.Printf("Error committing transaction: %v", err)
		tx.Rollback()
		return
	}

	log.Printf("Successfully created pending attendance records for %d users", len(users))
}

func (s *AttendanceScheduler) markAbsentRecords() {
	now := time.Now()

	// Update all pending records to absent
	result := s.db.Model(&models.Attendance{}).
		Where("DATE(check_in_time) = DATE(?) AND validation_status = ?", now, models.Pending).
		Updates(map[string]interface{}{
			"status":            "ABSENT",
			"validation_status": models.Absent,
			"notes":             "Automatically marked as absent at 17:00",
		})

	if result.Error != nil {
		log.Printf("Error marking absent records: %v", result.Error)
		return
	}

	log.Printf("Marked %d records as absent", result.RowsAffected)
}

func (s *AttendanceScheduler) markDidntCheckout() {
	now := time.Now()

	// Update all present records without checkout to didn't checkout
	result := s.db.Model(&models.Attendance{}).
		Where("DATE(check_in_time) = DATE(?) AND validation_status = ? AND check_out_time IS NULL", now, models.Present).
		Updates(map[string]interface{}{
			"validation_status": models.DidntCheckout,
			"notes":             "Automatically marked as didn't checkout at 17:00",
		})

	if result.Error != nil {
		log.Printf("Error marking didn't checkout records: %v", result.Error)
		return
	}

	log.Printf("Marked %d records as didn't checkout", result.RowsAffected)
}
