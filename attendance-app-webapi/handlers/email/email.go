package email

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"attendance-app/scheduler"
	"attendance-app/utils/email"

	"gorm.io/gorm"
)

// TestEmailRequest represents the request payload for testing email
type TestEmailRequest struct {
	Recipients []string `json:"recipients" validate:"required,min=1" example:"user@example.com,admin@example.com"`
	Type       string   `json:"type" validate:"required,oneof=clock_in clock_out custom" example:"clock_in"`
	Subject    string   `json:"subject,omitempty" example:"Test Email Subject"`
	Body       string   `json:"body,omitempty" example:"<h1>Test Email</h1><p>This is a test email.</p>"`
}

// @Summary Test email sending
// @Description Test email sending functionality (Admin only). Send clock-in reminder, clock-out reminder, or custom email.
// @Tags email
// @Accept json
// @Produce json
// @Param email body TestEmailRequest true "Email test parameters"
// @Success 200 {object} map[string]interface{} "Email sent successfully"
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can test email"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/email/test [post]
// @Security BearerAuth
func TestEmail(c *gin.Context) {
	var req TestEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Validate recipients
	if len(req.Recipients) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one recipient email is required"})
		return
	}

	var err error
	var emailType string

	switch req.Type {
	case "clock_in":
		emailType = "Clock-In Reminder"
		err = email.SendClockInReminder(req.Recipients)
	case "clock_out":
		emailType = "Clock-Out Reminder"
		err = email.SendClockOutReminder(req.Recipients)
	case "custom":
		emailType = "Custom Email"
		if req.Subject == "" || req.Body == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Subject and body are required for custom email"})
			return
		}
		err = email.SendEmail(req.Recipients, req.Subject, req.Body)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email type. Must be: clock_in, clock_out, or custom"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to send email",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Email sent successfully",
		"type":       emailType,
		"recipients": req.Recipients,
		"count":      len(req.Recipients),
	})
}

// @Summary Send reminder to all users
// @Description Send clock-in or clock-out reminder to users who need it (Admin only). Only sends to users who haven't completed the respective action today.
// @Tags email
// @Accept json
// @Produce json
// @Param type query string true "Reminder type" Enums(clock_in, clock_out)
// @Success 200 {object} map[string]interface{} "Email sent successfully"
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can send reminders"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/email/send-reminder [post]
// @Security BearerAuth
func SendReminderToAll(c *gin.Context) {
	DB := c.MustGet("db").(*gorm.DB)
	reminderType := c.Query("type")

	if reminderType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Reminder type is required (clock_in or clock_out)"})
		return
	}

	var emails []string
	var totalUsers, targetedUsers int
	var err error
	var emailType string

	switch reminderType {
	case "clock_in":
		emailType = "Clock-In Reminder"
		// Get only users who haven't clocked in today
		var alreadyClockedIn int
		emails, totalUsers, alreadyClockedIn, err = scheduler.GetUsersWithoutClockInToday(DB)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to fetch users",
				"details": err.Error(),
			})
			return
		}
		targetedUsers = len(emails)

		if targetedUsers == 0 {
			c.JSON(http.StatusOK, gin.H{
				"message":            "No reminders needed - all users have clocked in",
				"type":               emailType,
				"total_users":        totalUsers,
				"already_clocked_in": alreadyClockedIn,
				"reminders_sent":     0,
			})
			return
		}

		err = email.SendClockInReminder(emails)

	case "clock_out":
		emailType = "Clock-Out Reminder"
		// Get only users who clocked in but haven't clocked out today
		var needClockOut int
		emails, totalUsers, needClockOut, err = scheduler.GetUsersWhoNeedClockOutToday(DB)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to fetch users",
				"details": err.Error(),
			})
			return
		}
		targetedUsers = len(emails)

		if targetedUsers == 0 {
			c.JSON(http.StatusOK, gin.H{
				"message":                 "No reminders needed - no users need to clock out",
				"type":                    emailType,
				"total_users":             totalUsers,
				"users_needing_clock_out": needClockOut,
				"reminders_sent":          0,
			})
			return
		}

		err = email.SendClockOutReminder(emails)

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reminder type. Must be: clock_in or clock_out"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to send reminder",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        "Reminder sent successfully to users who need it",
		"type":           emailType,
		"total_users":    totalUsers,
		"reminders_sent": targetedUsers,
		"recipients":     emails,
	})
}

// @Summary Get scheduler status
// @Description Get current scheduler status including timezone, current time, and next scheduled jobs (Admin only)
// @Tags email
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Scheduler status"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can access scheduler status"
// @Router /admin/email/scheduler-status [get]
// @Security BearerAuth
func GetSchedulerStatus(c *gin.Context) {
	// Load Asia/Jakarta timezone
	location, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		location = time.Local
	}

	now := time.Now()
	nowInLocation := now.In(location)

	// Calculate next occurrences of cron jobs
	// Morning: 07:30
	morningNext := time.Date(nowInLocation.Year(), nowInLocation.Month(), nowInLocation.Day(), 7, 30, 0, 0, location)
	if nowInLocation.After(morningNext) {
		morningNext = morningNext.AddDate(0, 0, 1) // Tomorrow
	}

	// Evening: 17:00
	eveningNext := time.Date(nowInLocation.Year(), nowInLocation.Month(), nowInLocation.Day(), 17, 0, 0, 0, location)
	if nowInLocation.After(eveningNext) {
		eveningNext = eveningNext.AddDate(0, 0, 1) // Tomorrow
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "running",
		"timezone": gin.H{
			"name":   location.String(),
			"offset": nowInLocation.Format("-07:00"),
		},
		"current_time": gin.H{
			"utc":            now.UTC().Format("2006-01-02 15:04:05 MST"),
			"scheduler":      nowInLocation.Format("2006-01-02 15:04:05 MST"),
			"unix_timestamp": now.Unix(),
		},
		"scheduled_jobs": gin.H{
			"morning_reminder": gin.H{
				"cron":          "30 7 * * *",
				"description":   "Clock-in reminder",
				"next_run":      morningNext.Format("2006-01-02 15:04:05 MST"),
				"next_run_utc":  morningNext.UTC().Format("2006-01-02 15:04:05 MST"),
				"seconds_until": morningNext.Sub(nowInLocation).Seconds(),
			},
			"evening_reminder": gin.H{
				"cron":          "0 17 * * *",
				"description":   "Clock-out reminder",
				"next_run":      eveningNext.Format("2006-01-02 15:04:05 MST"),
				"next_run_utc":  eveningNext.UTC().Format("2006-01-02 15:04:05 MST"),
				"seconds_until": eveningNext.Sub(nowInLocation).Seconds(),
			},
		},
		"note": "Check Docker logs for 'CRON TRIGGERED' messages to verify scheduler is working",
	})
}
