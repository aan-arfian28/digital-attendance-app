package attendance

import (
	"attendance-app/models"
	"attendance-app/services"
	"attendance-app/storage"
	"attendance-app/utils"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

// AttendanceRequest represents the request payload for check-in/check-out
type AttendanceRequest struct {
	// Latitude of user's location
	Latitude float64 `json:"latitude" binding:"required" example:"-7.5583648316326295" form:"latitude" default:"-7.5583648316326295"`
	// Longitude of user's location
	Longitude float64 `json:"longitude" binding:"required" example:"110.8577696892991" form:"longitude" default:"110.8577696892991"`
} //@name AttendanceRequest

// AttendanceValidationRequest represents the request payload for validating attendance
type AttendanceValidationRequest struct {
	// Status of the validation (PRESENT, ABSENT, LATE)
	ValidationStatus models.ValidationStatus `json:"validationStatus" binding:"required" example:"REJECTED"`
	// Optional notes from the validator
	Notes string `json:"notes" example:"Leave early without permit"`
} //@name AttendanceValidationRequest

// AttendanceResponse represents the response payload for attendance operations
type AttendanceResponse struct {
	// The unique identifier for the attendance record
	ID uint `json:"id" example:"1"`
	// The user ID who created the attendance record
	UserID uint `json:"user_id" example:"1"`
	// URL of the photo taken during attendance
	PhotoURL string `json:"photoURL" example:"https://storage.example.com/photos/checkin123.jpg"`
	// Latitude of recorded location
	Latitude float64 `json:"latitude" example:"-7.5583648316326295"`
	// Longitude of recorded location
	Longitude float64 `json:"longitude" example:"110.8577696892991"`
	// Status of the attendance record
	ValidationStatus models.ValidationStatus `json:"validationStatus" example:"PRESENT"`
	// Notes from validator
	Notes string `json:"notes,omitempty" example:"Attendance verified"`
	// When the record was created
	CreatedAt time.Time `json:"created_at" example:"2025-10-21T09:00:00Z"`
	// When the record was last updated
	UpdatedAt time.Time `json:"updated_at" example:"2025-10-21T09:00:00Z"`
} //@name AttendanceResponse

// @Summary Check-in attendance
// @Description Record user's check-in with photo and location. Location must be within defined radius of office coordinates.
// @Tags attendance
// @Security BearerAuth
// @Accept multipart/form-data
// @Produce json
// @Param photo formData file true "Check-in photo (JPG, JPEG, PNG, max 5MB)"
// @Param latitude formData number true "Location latitude" minimum:-90 maximum:90 default:-7.5583648316326295
// @Param longitude formData number true "Location longitude" minimum:-180 maximum:180 default:110.8577696892991
// @Success 201 {object} AttendanceResponse "Successfully created attendance record"
// @Failure 400 {object} models.ErrorResponse "Invalid request, location too far from office, or invalid photo"
// @Failure 401 {object} models.ErrorResponse "Unauthorized or invalid token"
// @Failure 429 {object} models.ErrorResponse "Already checked in today"
// @Failure 500 {object} models.ErrorResponse "Server error"
// @Router /user/attendance/check-in [post]
func CheckIn(c *gin.Context) {
	var req AttendanceRequest
	db := c.MustGet("db").(*gorm.DB)
	userId := c.MustGet("userId").(uint)

	// Bind form data
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Handle photo upload
	file, err := c.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Photo is required"})
		return
	}

	// Initialize storage
	fileStorage := storage.NewLocalStorage(storage.Current.BasePath)

	// Validate file type
	if err := fileStorage.ValidateFileType(file.Filename, storage.Current.AllowedTypes["attendance"]); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate file size
	if err := fileStorage.ValidateFileSize(file.Size, storage.Current.MaxFileSize); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Save file
	photoURL, err := fileStorage.Save(file, "attendance")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save photo"})
		return
	}

	// Get default location from settings
	var defaultLocationSetting models.Setting
	if err := db.Where("`key` = ?", "default_location_id").First(&defaultLocationSetting).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Default location not configured in settings"})
		return
	}

	// Convert location ID from string to uint
	locationID, err := strconv.ParseUint(defaultLocationSetting.Value, 10, 32)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid location ID in settings"})
		return
	}

	// Find the valid office location using default_location_id from settings
	var location models.Location
	if err := db.First(&location, uint(locationID)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Default location not found"})
		return
	}

	// Verify location is within radius
	distance := utils.CalculateDistance(
		location.Latitude, location.Longitude,
		req.Latitude, req.Longitude,
	)

	if distance > float64(location.Radius) {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Location is too far from %s office", location.Name)})
		return
	}

	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	var attendance models.Attendance
	result := db.Where("user_id = ? AND check_in_time >= ?", userId, startOfDay).First(&attendance)

	if result.Error != nil {
		// Create new attendance record if none exists
		locID := location.ID
		attendance = models.Attendance{
			UserID:           userId,
			LocationID:       &locID,
			CheckInTime:      &now,
			CheckInLatitude:  req.Latitude,
			CheckInLongitude: req.Longitude,
			CheckInPhotoURL:  photoURL,
			Status:           models.OnTime,
			ValidationStatus: models.Present,
		}

		if now.Hour() > 7 || (now.Hour() == 7 && now.Minute() > 30) {
			attendance.Status = models.Late
		}

		if err := db.Create(&attendance).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create attendance record"})
			return
		}
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Already checked in today"})
		return
	}

	c.JSON(http.StatusOK, attendance)
}

// @Summary Check-out attendance
// @Description Record user's check-out with photo and location
// @Tags attendance
// @Security BearerAuth
// @Accept multipart/form-data
// @Produce json
// @Param photo formData file true "Check-out photo (JPG, JPEG, PNG, max 5MB)"
// @Param latitude formData number true "Location latitude" minimum:-90 maximum:90 default:-7.5583648316326295
// @Param longitude formData number true "Location longitude" minimum:-180 maximum:180 default:110.8577696892991
// @Success 200 {object} models.AttendanceSwagger
// @Failure 400 {object} map[string]string "Invalid request, location too far, or invalid photo"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "No check-in record found"
// @Failure 500 {object} map[string]string "Server error"
// @Router /user/attendance/check-out [post]
// CheckOut handles user check-out
func CheckOut(c *gin.Context) {
	var req AttendanceRequest
	db := c.MustGet("db").(*gorm.DB)
	userId := c.MustGet("userId").(uint)

	// Bind form data
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Handle photo upload
	file, err := c.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Photo is required"})
		return
	}

	// Initialize storage
	fileStorage := storage.NewLocalStorage(storage.Current.BasePath)

	// Validate file type
	if err := fileStorage.ValidateFileType(file.Filename, storage.Current.AllowedTypes["attendance"]); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate file size
	if err := fileStorage.ValidateFileSize(file.Size, storage.Current.MaxFileSize); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get default location from settings
	var defaultLocationSetting models.Setting
	if err := db.Where("`key` = ?", "default_location_id").First(&defaultLocationSetting).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Default location not configured in settings"})
		return
	}

	// Convert location ID from string to uint
	locationID, err := strconv.ParseUint(defaultLocationSetting.Value, 10, 32)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid location ID in settings"})
		return
	}

	// Find the valid office location using default_location_id from settings
	var location models.Location
	if err := db.First(&location, uint(locationID)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Default location not found"})
		return
	}

	// Verify location is within radius
	distance := utils.CalculateDistance(
		location.Latitude, location.Longitude,
		req.Latitude, req.Longitude,
	)

	if distance > float64(location.Radius) {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Location is too far from %s office", location.Name)})
		return
	}

	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	var attendance models.Attendance
	// Only allow checkout if user actually checked in (not ABSENT)
	result := db.Where("user_id = ? AND check_in_time >= ? AND validation_status != ?", userId, startOfDay, models.Absent).First(&attendance)

	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No check-in record found for today. Cannot checkout without checking in first."})
		return
	}

	if attendance.CheckOutTime != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Already checked out today"})
		return
	}

	// Save photo file
	photoURL, err := fileStorage.Save(file, "attendance")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save photo"})
		return
	}

	attendance.CheckOutTime = &now
	attendance.CheckOutLatitude = req.Latitude
	attendance.CheckOutLongitude = req.Longitude
	attendance.CheckOutPhotoURL = photoURL
	// Keep the validation status as Present since they've checked out
	attendance.ValidationStatus = models.Present

	if err := db.Save(&attendance).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update attendance record"})
		return
	}

	c.JSON(http.StatusOK, attendance)
}

// @Summary Get personal attendance records
// @Description Retrieve all attendance records for the current user
// @Tags attendance
// @Security BearerAuth
// @Produce json
// @Success 200 {array} models.AttendanceSwagger
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Server error"
// @Router /user/attendance/my-records [get]
// GetMyAttendanceRecords gets the current user's attendance records
func GetMyAttendanceRecords(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	userId := c.MustGet("userId").(uint)

	var attendances []models.Attendance
	if err := db.Where("user_id = ?", userId).Find(&attendances).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch attendance records"})
		return
	}

	c.JSON(http.StatusOK, attendances)
}

// @Summary Get subordinate attendance records
// @Description Retrieve attendance records for all subordinates (supervisor only)
// @Tags attendance
// @Security BearerAuth
// @Produce json
// @Success 200 {array} models.AttendanceSwagger
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Not a supervisor"
// @Failure 500 {object} map[string]string "Server error"
// @Router /user/attendance/subordinates [get]
// GetSubordinateAttendanceRecords gets attendance records for all subordinates
func GetSubordinateAttendanceRecords(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	supervisorId := c.MustGet("userId").(uint)

	var subordinateIds []uint
	if err := db.Model(&models.User{}).Where("supervisor_id = ?", supervisorId).Pluck("id", &subordinateIds).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch subordinates"})
		return
	}

	if len(subordinateIds) == 0 {
		c.JSON(http.StatusOK, []models.Attendance{})
		return
	}

	var attendances []models.Attendance
	if err := db.Preload("User").Where("user_id IN ?", subordinateIds).Find(&attendances).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch attendance records"})
		return
	}

	c.JSON(http.StatusOK, attendances)
}

// @Summary Update subordinate attendance record
// @Description Update attendance record for a subordinate (supervisor only)
// @Tags attendance
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path string true "Attendance ID"
// @Param validation body AttendanceValidationRequest true "Update data"
// @Success 200 {object} models.AttendanceSwagger
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Not the supervisor"
// @Failure 404 {object} map[string]string "Record not found"
// @Failure 500 {object} map[string]string "Server error"
// @Router /user/attendance/update/{id} [put]
// UpdateSubordinateAttendanceRecord allows supervisors to update their subordinate's attendance records
func UpdateSubordinateAttendanceRecord(c *gin.Context) {
	var req AttendanceValidationRequest
	db := c.MustGet("db").(*gorm.DB)
	supervisorId := c.MustGet("userId").(uint)
	attendanceId := c.Param("id")

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var attendance models.Attendance
	if err := db.First(&attendance, attendanceId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Attendance record not found"})
		return
	}

	// Check if the user is the supervisor of the attendance owner
	var user models.User
	if err := db.First(&user, attendance.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.SupervisorID == nil || *user.SupervisorID != supervisorId {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to update this attendance record"})
		return
	}

	// Update the record with new status
	// NOTE: Supervisor can update validation status at any time:
	// - Default status is PRESENT (set during check-in)
	// - Supervisor can change PRESENT to REJECTED with reason
	// - Supervisor can also change REJECTED back to PRESENT if needed
	// - No restrictions on when validation can be performed
	attendance.ValidationStatus = req.ValidationStatus
	attendance.ValidatorID = &supervisorId
	attendance.Notes = req.Notes

	if err := db.Save(&attendance).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update attendance record"})
		return
	}

	// Send email notification
	emailService := services.NewEmailService()
	if err := emailService.SendAttendanceValidationNotification(
		user.Email,
		user.Username,
		string(req.ValidationStatus),
		c.MustGet("username").(string),
		req.Notes,
	); err != nil {
		// Log the error but don't fail the request
		fmt.Printf("Failed to send email notification: %v\n", err)
	}

	c.JSON(http.StatusOK, attendance)
}

// @Summary Export my attendance records to Excel
// @Description Export current user's attendance records to Excel file
// @Tags attendance
// @Security BearerAuth
// @Produce application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
// @Success 200 {file} binary "Excel file download"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Server error"
// @Router /user/attendance/export/excel [get]
func ExportMyAttendanceToExcel(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	userId := c.MustGet("userId").(uint)

	// Fetch current user's attendance records with preloads
	var attendances []models.Attendance
	if err := db.Where("user_id = ?", userId).
		Preload("Location").
		Preload("Validator").
		Order("check_in_time DESC").
		Find(&attendances).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch attendance records"})
		return
	}

	// Create new Excel file
	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			return
		}
	}()

	sheetName := "Attendance"
	index, err := f.NewSheet(sheetName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Excel sheet"})
		return
	}

	// Set headers
	headers := []string{
		"ID", "Check In Time", "Check Out Time", "Check In Latitude", "Check In Longitude",
		"Check Out Latitude", "Check Out Longitude", "Check In Photo URL", "Check Out Photo URL",
		"Location Name", "Location Address", "Status", "Validation Status", "Validator Name",
		"Notes", "Created At", "Updated At",
	}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	// Style for headers
	headerStyle, err := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#E0E0E0"}, Pattern: 1},
	})
	if err == nil {
		f.SetCellStyle(sheetName, "A1", "Q1", headerStyle)
	}

	// Write attendance data
	for i, attendance := range attendances {
		row := i + 2

		// ID
		cell, _ := excelize.CoordinatesToCellName(1, row)
		f.SetCellValue(sheetName, cell, attendance.ID)

		// Check In Time
		cell, _ = excelize.CoordinatesToCellName(2, row)
		f.SetCellValue(sheetName, cell, attendance.CheckInTime.Format("2006-01-02 15:04:05"))

		// Check Out Time
		cell, _ = excelize.CoordinatesToCellName(3, row)
		if attendance.CheckOutTime != nil {
			f.SetCellValue(sheetName, cell, attendance.CheckOutTime.Format("2006-01-02 15:04:05"))
		} else {
			f.SetCellValue(sheetName, cell, "")
		}

		// Check In Latitude
		cell, _ = excelize.CoordinatesToCellName(4, row)
		f.SetCellValue(sheetName, cell, attendance.CheckInLatitude)

		// Check In Longitude
		cell, _ = excelize.CoordinatesToCellName(5, row)
		f.SetCellValue(sheetName, cell, attendance.CheckInLongitude)

		// Check Out Latitude
		cell, _ = excelize.CoordinatesToCellName(6, row)
		f.SetCellValue(sheetName, cell, attendance.CheckOutLatitude)

		// Check Out Longitude
		cell, _ = excelize.CoordinatesToCellName(7, row)
		f.SetCellValue(sheetName, cell, attendance.CheckOutLongitude)

		// Check In Photo URL
		cell, _ = excelize.CoordinatesToCellName(8, row)
		f.SetCellValue(sheetName, cell, attendance.CheckInPhotoURL)

		// Check Out Photo URL
		cell, _ = excelize.CoordinatesToCellName(9, row)
		f.SetCellValue(sheetName, cell, attendance.CheckOutPhotoURL)

		// Location Name
		cell, _ = excelize.CoordinatesToCellName(10, row)
		if attendance.Location != nil {
			f.SetCellValue(sheetName, cell, attendance.Location.Name)
		} else {
			f.SetCellValue(sheetName, cell, "")
		}

		// Location Address
		cell, _ = excelize.CoordinatesToCellName(11, row)
		if attendance.Location != nil {
			f.SetCellValue(sheetName, cell, attendance.Location.Address)
		} else {
			f.SetCellValue(sheetName, cell, "")
		}

		// Status
		cell, _ = excelize.CoordinatesToCellName(12, row)
		f.SetCellValue(sheetName, cell, attendance.Status)

		// Validation Status
		cell, _ = excelize.CoordinatesToCellName(13, row)
		f.SetCellValue(sheetName, cell, attendance.ValidationStatus)

		// Validator Name
		cell, _ = excelize.CoordinatesToCellName(14, row)
		if attendance.Validator != nil {
			f.SetCellValue(sheetName, cell, attendance.Validator.Name)
		} else {
			f.SetCellValue(sheetName, cell, "")
		}

		// Notes
		cell, _ = excelize.CoordinatesToCellName(15, row)
		f.SetCellValue(sheetName, cell, attendance.Notes)

		// Created At
		cell, _ = excelize.CoordinatesToCellName(16, row)
		f.SetCellValue(sheetName, cell, attendance.CreatedAt.Format("2006-01-02 15:04:05"))

		// Updated At
		cell, _ = excelize.CoordinatesToCellName(17, row)
		f.SetCellValue(sheetName, cell, attendance.UpdatedAt.Format("2006-01-02 15:04:05"))
	}

	// Auto-fit columns
	for i := 1; i <= len(headers); i++ {
		col, _ := excelize.ColumnNumberToName(i)
		f.SetColWidth(sheetName, col, col, 20)
	}

	// Set active sheet
	f.SetActiveSheet(index)
	f.DeleteSheet("Sheet1")

	// Generate filename with current date
	filename := fmt.Sprintf("my_attendance_%s.xlsx", time.Now().Format("2006-01-02"))

	// Set headers for file download
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Transfer-Encoding", "binary")

	// Write to response
	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write Excel file"})
		return
	}
}
