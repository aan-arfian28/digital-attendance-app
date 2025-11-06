// Package leave handles leave request operations
package leave

import (
	"attendance-app/models"
	"attendance-app/storage"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

// LeaveRequest represents the request payload for submitting a leave request
type LeaveRequest struct {
	// Type of leave (SICK, VACATION, etc.)
	LeaveType models.LeaveType `json:"leaveType" binding:"required" example:"SICK" form:"leaveType"`
	// Start date of the leave period (YYYY-MM-DD)
	StartDate string `json:"startDate" binding:"required" example:"2025-10-22" form:"startDate" time_format:"2006-01-02"`
	// End date of the leave period (YYYY-MM-DD)
	EndDate string `json:"endDate" binding:"required" example:"2025-10-24" form:"endDate" time_format:"2006-01-02"`
	// Reason for requesting leave
	Reason string `json:"reason" binding:"required" example:"Medical appointment and recovery" form:"reason"`
} //@name LeaveRequest

// LeaveValidationRequest represents the request payload for validating a leave request
type LeaveValidationRequest struct {
	// Status to set for the leave request (APPROVED, REJECTED)
	Status models.LeaveRequestStatus `json:"status" binding:"required" example:"APPROVED"`
	// Optional notes from the approver
	ApproverNotes string `json:"approverNotes" example:"Approved based on medical documentation"`
} //@name LeaveValidationRequest

// @Summary Submit leave request
// @Description Submit a new leave request with supporting documentation
// @Tags leave
// @Accept multipart/form-data
// @Produce json
// @Param attachment formData file true "Supporting document (JPG, JPEG, PNG, PDF, max 5MB)"
// @Param leaveType formData string true "Type of leave (SICK, PERMIT)" example:"SICK"
// @Param startDate formData string true "Start date of leave (YYYY-MM-DD)" example:"2025-10-22" format:"date" default:"2025-10-21"
// @Param endDate formData string true "End date of leave (YYYY-MM-DD)" example:"2025-10-24" format:"date" default:"2025-10-22"
// @Param reason formData string true "Reason for leave request" example:"Medical appointment and recovery"
// @Success 200 {object} models.LeaveRequestSwagger
// @Failure 400 {object} map[string]string "Invalid request payload, dates, or attachment"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Server error"
// @Router /user/leave [post]
// @Security BearerAuth
func SubmitLeaveRequest(c *gin.Context) {
	var req LeaveRequest
	db := c.MustGet("db").(*gorm.DB)
	userId := c.MustGet("userId").(uint)

	// Start transaction
	tx := db.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Bind form data
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Handle attachment upload
	file, err := c.FormFile("attachment")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Attachment is required"})
		return
	}

	// Initialize storage
	fileStorage := storage.NewLocalStorage(storage.Current.BasePath)

	// Validate file type
	if err := fileStorage.ValidateFileType(file.Filename, storage.Current.AllowedTypes["leave"]); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate file size
	if err := fileStorage.ValidateFileSize(file.Size, storage.Current.MaxFileSize); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Save file
	attachmentURL, err := fileStorage.Save(file, "leave")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save attachment"})
		return
	}

	// Parse dates by appending time part
	startDate, err := time.Parse(time.RFC3339, req.StartDate+"T00:00:00Z")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start date format. Use YYYY-MM-DD"})
		return
	}

	endDate, err := time.Parse(time.RFC3339, req.EndDate+"T00:00:00Z")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end date format. Use YYYY-MM-DD"})
		return
	}

	// Validate dates
	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End date cannot be before start date"})
		return
	}

	currentTime := time.Now()
	currentDate := currentTime.Truncate(24 * time.Hour)

	if startDate.Before(currentDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot submit leave request for past dates"})
		return
	}

	// Check for existing attendance records in the date range
	// Users cannot submit leave requests for days where they already checked in
	var existingAttendance models.Attendance
	result := tx.Where(
		"user_id = ? AND DATE(check_in_time) BETWEEN ? AND ?",
		userId,
		startDate.Format("2006-01-02"),
		endDate.Format("2006-01-02"),
	).First(&existingAttendance)

	if result.RowsAffected > 0 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Cannot submit leave request for days with existing attendance records",
			"details": map[string]interface{}{
				"conflictDate": existingAttendance.CheckInTime.Format("2006-01-02"),
				"message": "Please submit leave requests before recording attendance. " +
					"If you need to cancel your attendance, please contact your supervisor.",
			},
		})
		return
	}

	// Check for overlapping leave requests
	var existingLeave models.LeaveRequest
	result = tx.Where(
		"user_id = ? AND status != ? AND "+
			"((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR "+
			"(start_date <= ? AND end_date >= ?))",
		userId,
		models.LeaveRejected,
		startDate.Format("2006-01-02"),
		endDate.Format("2006-01-02"),
		startDate.Format("2006-01-02"),
		endDate.Format("2006-01-02"),
		startDate.Format("2006-01-02"),
		endDate.Format("2006-01-02"),
	).First(&existingLeave)

	if result.RowsAffected > 0 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Overlapping leave request exists",
			"details": map[string]interface{}{
				"existingLeave": map[string]interface{}{
					"startDate": existingLeave.StartDate.Format("2006-01-02"),
					"endDate":   existingLeave.EndDate.Format("2006-01-02"),
					"status":    existingLeave.Status,
				},
				"message": "You already have a leave request for this period. " +
					"Please check your existing leave requests.",
			},
		})
		return
	}

	// Create leave request
	leaveRequest := models.LeaveRequest{
		UserID:        userId,
		LeaveType:     req.LeaveType,
		StartDate:     startDate,
		EndDate:       endDate,
		Reason:        req.Reason,
		AttachmentURL: attachmentURL,
		Status:        models.LeavePending,
	}

	if err := tx.Create(&leaveRequest).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create leave request"})
		return
	}

	// NOTE: Attendance records are NOT created here.
	// They will only be created when the leave request is APPROVED in ValidateLeaveRequest.
	// This prevents creating unnecessary PENDING records and follows the new attendance workflow.

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Leave request submitted successfully",
		"data": map[string]interface{}{
			"leaveRequest": leaveRequest,
			"notice": "Your leave request has been submitted and is pending approval. " +
				"You will be notified once your supervisor reviews it.",
		},
	})
}

// @Summary Get my leave requests
// @Description Get all leave requests submitted by the current user
// @Tags leave
// @Accept json
// @Produce json
// @Success 200 {array} models.LeaveRequestSwagger
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Server error"
// @Router /user/leave/my-requests [get]
// @Security BearerAuth
func GetMyLeaveRequests(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	userId := c.MustGet("userId").(uint)

	var leaveRequests []models.LeaveRequest
	if err := db.Where("user_id = ?", userId).Find(&leaveRequests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch leave requests"})
		return
	}

	c.JSON(http.StatusOK, leaveRequests)
}

// @Summary Get subordinate leave requests
// @Description Get all leave requests submitted by users who report to the current user
// @Tags leave
// @Accept json
// @Produce json
// @Success 200 {array} models.LeaveRequestSwagger
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Server error"
// @Router /user/leave/subordinates [get]
// @Security BearerAuth
func GetSubordinateLeaveRequests(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	supervisorId := c.MustGet("userId").(uint)

	var subordinateIds []uint
	if err := db.Model(&models.User{}).Where("supervisor_id = ?", supervisorId).Pluck("id", &subordinateIds).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch subordinates"})
		return
	}

	if len(subordinateIds) == 0 {
		c.JSON(http.StatusOK, []models.LeaveRequest{})
		return
	}

	var leaveRequests []models.LeaveRequest
	if err := db.Preload("User").Where("user_id IN ?", subordinateIds).Find(&leaveRequests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch leave requests"})
		return
	}

	c.JSON(http.StatusOK, leaveRequests)
}

// @Summary Validate leave request
// @Description Approve or reject a leave request as a supervisor
// @Tags leave
// @Accept json
// @Produce json
// @Param id path string true "Leave request ID"
// @Param request body LeaveValidationRequest true "Leave validation details"
// @Success 200 {object} models.LeaveRequestSwagger
// @Failure 400 {object} map[string]string "Invalid request payload"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Not the supervisor"
// @Failure 404 {object} map[string]string "Leave request or user not found"
// @Failure 500 {object} map[string]string "Server error"
// @Router /user/leave/validate/{id} [put]
// @Security BearerAuth
func ValidateLeaveRequest(c *gin.Context) {
	var req LeaveValidationRequest
	db := c.MustGet("db").(*gorm.DB)
	supervisorId := c.MustGet("userId").(uint)
	leaveRequestId := c.Param("id")

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var leaveRequest models.LeaveRequest
	if err := db.First(&leaveRequest, leaveRequestId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Leave request not found"})
		return
	}

	// Check if the user is the supervisor of the leave request owner
	var user models.User
	if err := db.First(&user, leaveRequest.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.SupervisorID == nil || *user.SupervisorID != supervisorId {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to validate this leave request"})
		return
	}

	leaveRequest.Status = req.Status
	leaveRequest.ApproverID = &supervisorId
	leaveRequest.ApproverNotes = req.ApproverNotes

	// Start transaction for atomic operation
	tx := db.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Save(&leaveRequest).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update leave request"})
		return
	}

	// If approved, create attendance records for the leave period
	if req.Status == models.LeaveApproved {
		// Create attendance records for each day of leave
		for d := leaveRequest.StartDate; !d.After(leaveRequest.EndDate); d = d.AddDate(0, 0, 1) {
			// Skip weekends
			if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
				continue
			}

			// Check if attendance record already exists for this day
			var existingAttendance models.Attendance
			err := tx.Where("user_id = ? AND DATE(check_in_time) = ?",
				leaveRequest.UserID,
				d.Format("2006-01-02")).First(&existingAttendance).Error

			if err == nil {
				// Record exists, skip creation
				continue
			}

			checkInTime := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, d.Location())
			attendance := models.Attendance{
				UserID:           leaveRequest.UserID,
				LocationID:       nil, // No location required for approved leave records
				CheckInTime:      &checkInTime,
				CheckInLatitude:  0.0,
				CheckInLongitude: 0.0,
				CheckInPhotoURL:  "",
				Status:           models.OnTime,
				ValidationStatus: models.Leave,
				ValidatorID:      &supervisorId,
				Notes:            "Approved leave request: " + leaveRequest.Reason,
			}

			if err := tx.Create(&attendance).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create attendance record for leave"})
				return
			}
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusOK, leaveRequest)
}

// @Summary Export my leave requests to Excel
// @Description Export current user's leave requests to Excel file
// @Tags leave
// @Security BearerAuth
// @Produce application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
// @Success 200 {file} binary "Excel file download"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Server error"
// @Router /user/leave/export/excel [get]
func ExportMyLeaveRequestsToExcel(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	userId := c.MustGet("userId").(uint)

	// Fetch current user's leave requests with preloads
	var leaveRequests []models.LeaveRequest
	if err := db.Where("user_id = ?", userId).
		Preload("Approver").
		Order("start_date DESC").
		Find(&leaveRequests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch leave requests"})
		return
	}

	// Create new Excel file
	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			return
		}
	}()

	sheetName := "Leave Requests"
	index, err := f.NewSheet(sheetName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Excel sheet"})
		return
	}

	// Set headers
	headers := []string{
		"ID", "Leave Type", "Start Date", "End Date", "Reason", "Attachment URL",
		"Status", "Approver Name", "Approver Notes", "Created At", "Updated At",
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
		f.SetCellStyle(sheetName, "A1", "K1", headerStyle)
	}

	// Write leave request data
	for i, leave := range leaveRequests {
		row := i + 2

		// ID
		cell, _ := excelize.CoordinatesToCellName(1, row)
		f.SetCellValue(sheetName, cell, leave.ID)

		// Leave Type
		cell, _ = excelize.CoordinatesToCellName(2, row)
		f.SetCellValue(sheetName, cell, leave.LeaveType)

		// Start Date
		cell, _ = excelize.CoordinatesToCellName(3, row)
		f.SetCellValue(sheetName, cell, leave.StartDate.Format("2006-01-02"))

		// End Date
		cell, _ = excelize.CoordinatesToCellName(4, row)
		f.SetCellValue(sheetName, cell, leave.EndDate.Format("2006-01-02"))

		// Reason
		cell, _ = excelize.CoordinatesToCellName(5, row)
		f.SetCellValue(sheetName, cell, leave.Reason)

		// Attachment URL
		cell, _ = excelize.CoordinatesToCellName(6, row)
		f.SetCellValue(sheetName, cell, leave.AttachmentURL)

		// Status
		cell, _ = excelize.CoordinatesToCellName(7, row)
		f.SetCellValue(sheetName, cell, leave.Status)

		// Approver Name
		cell, _ = excelize.CoordinatesToCellName(8, row)
		if leave.Approver != nil {
			f.SetCellValue(sheetName, cell, leave.Approver.Name)
		} else {
			f.SetCellValue(sheetName, cell, "")
		}

		// Approver Notes
		cell, _ = excelize.CoordinatesToCellName(9, row)
		f.SetCellValue(sheetName, cell, leave.ApproverNotes)

		// Created At
		cell, _ = excelize.CoordinatesToCellName(10, row)
		f.SetCellValue(sheetName, cell, leave.CreatedAt.Format("2006-01-02 15:04:05"))

		// Updated At
		cell, _ = excelize.CoordinatesToCellName(11, row)
		f.SetCellValue(sheetName, cell, leave.UpdatedAt.Format("2006-01-02 15:04:05"))
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
	filename := fmt.Sprintf("my_leave_requests_%s.xlsx", time.Now().Format("2006-01-02"))

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

// @Summary Export subordinate leave requests to Excel
// @Description Export subordinate leave requests to Excel file (supervisor only)
// @Tags leave
// @Security BearerAuth
// @Produce application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
// @Success 200 {file} binary "Excel file download"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Not a supervisor"
// @Failure 500 {object} map[string]string "Server error"
// @Router /user/leave/subordinates/export/excel [get]
func ExportSubordinateLeaveRequestsToExcel(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	supervisorId := c.MustGet("userId").(uint)

	// Get subordinate IDs
	var subordinateIds []uint
	if err := db.Model(&models.User{}).Where("supervisor_id = ?", supervisorId).Pluck("id", &subordinateIds).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch subordinates"})
		return
	}

	if len(subordinateIds) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No subordinates found"})
		return
	}

	// Fetch subordinate leave requests with preloads
	var leaveRequests []models.LeaveRequest
	if err := db.Where("user_id IN ?", subordinateIds).
		Preload("User").
		Preload("Approver").
		Order("start_date DESC").
		Find(&leaveRequests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch leave requests"})
		return
	}

	// Create new Excel file
	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			return
		}
	}()

	sheetName := "Subordinate Leave Requests"
	index, err := f.NewSheet(sheetName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Excel sheet"})
		return
	}

	// Set headers
	headers := []string{
		"ID", "User ID", "Username", "Email", "Leave Type", "Start Date", "End Date",
		"Reason", "Attachment URL", "Status", "Approver Name", "Approver Notes",
		"Created At", "Updated At",
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
		f.SetCellStyle(sheetName, "A1", "N1", headerStyle)
	}

	// Write leave request data
	for i, leave := range leaveRequests {
		row := i + 2

		// ID
		cell, _ := excelize.CoordinatesToCellName(1, row)
		f.SetCellValue(sheetName, cell, leave.ID)

		// User ID
		cell, _ = excelize.CoordinatesToCellName(2, row)
		f.SetCellValue(sheetName, cell, leave.UserID)

		// Username
		cell, _ = excelize.CoordinatesToCellName(3, row)
		f.SetCellValue(sheetName, cell, leave.User.Username)

		// Email
		cell, _ = excelize.CoordinatesToCellName(4, row)
		f.SetCellValue(sheetName, cell, leave.User.Email)

		// Leave Type
		cell, _ = excelize.CoordinatesToCellName(5, row)
		f.SetCellValue(sheetName, cell, leave.LeaveType)

		// Start Date
		cell, _ = excelize.CoordinatesToCellName(6, row)
		f.SetCellValue(sheetName, cell, leave.StartDate.Format("2006-01-02"))

		// End Date
		cell, _ = excelize.CoordinatesToCellName(7, row)
		f.SetCellValue(sheetName, cell, leave.EndDate.Format("2006-01-02"))

		// Reason
		cell, _ = excelize.CoordinatesToCellName(8, row)
		f.SetCellValue(sheetName, cell, leave.Reason)

		// Attachment URL
		cell, _ = excelize.CoordinatesToCellName(9, row)
		f.SetCellValue(sheetName, cell, leave.AttachmentURL)

		// Status
		cell, _ = excelize.CoordinatesToCellName(10, row)
		f.SetCellValue(sheetName, cell, leave.Status)

		// Approver Name
		cell, _ = excelize.CoordinatesToCellName(11, row)
		if leave.Approver != nil {
			f.SetCellValue(sheetName, cell, leave.Approver.Name)
		} else {
			f.SetCellValue(sheetName, cell, "")
		}

		// Approver Notes
		cell, _ = excelize.CoordinatesToCellName(12, row)
		f.SetCellValue(sheetName, cell, leave.ApproverNotes)

		// Created At
		cell, _ = excelize.CoordinatesToCellName(13, row)
		f.SetCellValue(sheetName, cell, leave.CreatedAt.Format("2006-01-02 15:04:05"))

		// Updated At
		cell, _ = excelize.CoordinatesToCellName(14, row)
		f.SetCellValue(sheetName, cell, leave.UpdatedAt.Format("2006-01-02 15:04:05"))
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
	filename := fmt.Sprintf("subordinate_leave_requests_%s.xlsx", time.Now().Format("2006-01-02"))

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
