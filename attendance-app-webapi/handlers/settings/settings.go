package settings

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"attendance-app/models"
)

// SchedulerReloader is an interface for reloading scheduler configuration
type SchedulerReloader interface {
	ReloadSchedule() error
}

var schedulerInstance SchedulerReloader

// SetSchedulerInstance sets the scheduler instance for reload operations
func SetSchedulerInstance(scheduler SchedulerReloader) {
	schedulerInstance = scheduler
}

// SettingsResponse represents the key-value map response
type SettingsResponse map[string]string

// UpdateSettingsRequest represents the request payload for updating settings
type UpdateSettingsRequest map[string]string

// SchedulerSettingsResponse represents the scheduler configuration
type SchedulerSettingsResponse struct {
	Enabled        bool   `json:"enabled"`
	AllowedDays    []int  `json:"allowedDays"` // 1=Monday, 7=Sunday
	MorningTime    string `json:"morningTime"` // HH:MM format
	MorningEnabled bool   `json:"morningEnabled"`
	EveningTime    string `json:"eveningTime"` // HH:MM format
	EveningEnabled bool   `json:"eveningEnabled"`
	Timezone       string `json:"timezone"` // IANA timezone
}

// UpdateSchedulerRequest represents the request payload for updating scheduler settings
type UpdateSchedulerRequest struct {
	Enabled        *bool   `json:"enabled"`
	AllowedDays    []int   `json:"allowedDays" validate:"dive,min=1,max=7"` // 1=Monday, 7=Sunday
	MorningTime    *string `json:"morningTime" validate:"omitempty,len=5"`  // HH:MM format
	MorningEnabled *bool   `json:"morningEnabled"`
	EveningTime    *string `json:"eveningTime" validate:"omitempty,len=5"` // HH:MM format
	EveningEnabled *bool   `json:"eveningEnabled"`
	Timezone       *string `json:"timezone"`
}

// @Summary Get all settings
// @Description Retrieve all application settings as key-value pairs (accessible to all authenticated users)
// @Tags settings
// @Accept json
// @Produce json
// @Success 200 {object} SettingsResponse
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Server error"
// @Router /user/settings [get]
// @Security BearerAuth
func GetAllSettings(c *gin.Context) {
	DB := c.MustGet("db").(*gorm.DB)

	var settings []models.Setting
	if err := DB.Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
		return
	}

	// Convert to key-value map
	response := make(SettingsResponse)
	for _, setting := range settings {
		response[setting.Key] = setting.Value
	}

	c.JSON(http.StatusOK, response)
}

// @Summary Get setting by key
// @Description Retrieve a single setting by its key (accessible to all authenticated users)
// @Tags settings
// @Accept json
// @Produce json
// @Param key path string true "Setting key"
// @Success 200 {object} models.SettingSwagger
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "Setting not found"
// @Failure 500 {object} map[string]string "Server error"
// @Router /user/settings/{key} [get]
// @Security BearerAuth
func GetSettingByKey(c *gin.Context) {
	DB := c.MustGet("db").(*gorm.DB)
	key := c.Param("key")

	var setting models.Setting
	if err := DB.Where("`key` = ?", key).First(&setting).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Setting not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch setting"})
		return
	}

	c.JSON(http.StatusOK, setting)
}

// @Summary Update settings
// @Description Update multiple settings at once (bulk update)
// @Tags settings
// @Accept json
// @Produce json
// @Param settings body UpdateSettingsRequest true "Settings to update (key-value pairs)"
// @Success 200 {object} SettingsResponse
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can update settings"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/settings [put]
// @Security BearerAuth
func UpdateSettings(c *gin.Context) {
	DB := c.MustGet("db").(*gorm.DB)

	var req UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Get current user ID for audit trail
	userID, exists := c.Get("user_id")
	var updatedBy *uint
	if exists {
		if uid, ok := userID.(uint); ok {
			updatedBy = &uid
		}
	}

	// Start transaction
	tx := DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Update each setting
	for key, value := range req {
		var setting models.Setting

		// Try to find existing setting
		if err := tx.Where("`key` = ?", key).First(&setting).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				// Create new setting
				setting = models.Setting{
					Key:       key,
					Value:     value,
					UpdatedBy: updatedBy,
				}
				if err := tx.Create(&setting).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create setting: " + key})
					return
				}
			} else {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch setting: " + key})
				return
			}
		} else {
			// Update existing setting
			setting.Value = value
			setting.UpdatedBy = updatedBy
			if err := tx.Save(&setting).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update setting: " + key})
				return
			}
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit changes"})
		return
	}

	// Fetch all settings to return
	var settings []models.Setting
	if err := DB.Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch updated settings"})
		return
	}

	// Convert to key-value map
	response := make(SettingsResponse)
	for _, setting := range settings {
		response[setting.Key] = setting.Value
	}

	c.JSON(http.StatusOK, response)
}

// @Summary Get scheduler settings
// @Description Retrieve email scheduler configuration
// @Tags settings
// @Accept json
// @Produce json
// @Success 200 {object} SchedulerSettingsResponse
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/settings/scheduler [get]
// @Security BearerAuth
func GetSchedulerSettings(c *gin.Context) {
	DB := c.MustGet("db").(*gorm.DB)

	config, err := models.GetSchedulerSettings(DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load scheduler settings: " + err.Error()})
		return
	}

	response := SchedulerSettingsResponse{
		Enabled:        config.Enabled,
		AllowedDays:    config.AllowedDays,
		MorningTime:    config.MorningTime,
		MorningEnabled: config.MorningEnabled,
		EveningTime:    config.EveningTime,
		EveningEnabled: config.EveningEnabled,
		Timezone:       config.Timezone,
	}

	c.JSON(http.StatusOK, response)
}

// @Summary Update scheduler settings
// @Description Update email scheduler configuration and reload scheduler
// @Tags settings
// @Accept json
// @Produce json
// @Param settings body UpdateSchedulerRequest true "Scheduler settings to update"
// @Success 200 {object} SchedulerSettingsResponse
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can update scheduler settings"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/settings/scheduler [put]
// @Security BearerAuth
func UpdateSchedulerSettings(c *gin.Context) {
	DB := c.MustGet("db").(*gorm.DB)

	var req UpdateSchedulerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format: " + err.Error()})
		return
	}

	// Validate allowed days
	if req.AllowedDays != nil && len(req.AllowedDays) > 0 {
		for _, day := range req.AllowedDays {
			if day < 1 || day > 7 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid day value. Days must be between 1 (Monday) and 7 (Sunday)"})
				return
			}
		}
	}

	// Validate time format (HH:MM)
	if req.MorningTime != nil {
		if !isValidTimeFormat(*req.MorningTime) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid morning time format. Use HH:MM format (e.g., 07:30)"})
			return
		}
	}
	if req.EveningTime != nil {
		if !isValidTimeFormat(*req.EveningTime) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid evening time format. Use HH:MM format (e.g., 17:00)"})
			return
		}
	}

	// Get current user ID for audit trail
	userID, exists := c.Get("user_id")
	var updatedBy *uint
	if exists {
		if uid, ok := userID.(uint); ok {
			updatedBy = &uid
		}
	}

	// Start transaction
	tx := DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Update settings in database
	updates := make(map[string]string)

	if req.Enabled != nil {
		if *req.Enabled {
			updates["email_scheduler_enabled"] = "true"
		} else {
			updates["email_scheduler_enabled"] = "false"
		}
	}

	if req.AllowedDays != nil && len(req.AllowedDays) > 0 {
		// Convert []int to comma-separated string
		daysStr := ""
		for i, day := range req.AllowedDays {
			if i > 0 {
				daysStr += ","
			}
			daysStr += strconv.Itoa(day)
		}
		updates["email_scheduler_days"] = daysStr
	}

	if req.MorningTime != nil {
		updates["email_morning_time"] = *req.MorningTime
	}

	if req.MorningEnabled != nil {
		if *req.MorningEnabled {
			updates["email_morning_enabled"] = "true"
		} else {
			updates["email_morning_enabled"] = "false"
		}
	}

	if req.EveningTime != nil {
		updates["email_evening_time"] = *req.EveningTime
	}

	if req.EveningEnabled != nil {
		if *req.EveningEnabled {
			updates["email_evening_enabled"] = "true"
		} else {
			updates["email_evening_enabled"] = "false"
		}
	}

	if req.Timezone != nil {
		updates["email_scheduler_timezone"] = *req.Timezone
	}

	// Apply updates
	for key, value := range updates {
		var setting models.Setting

		if err := tx.Where("`key` = ?", key).First(&setting).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				// Create new setting
				setting = models.Setting{
					Key:       key,
					Value:     value,
					UpdatedBy: updatedBy,
				}
				if err := tx.Create(&setting).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create setting: " + key})
					return
				}
			} else {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch setting: " + key})
				return
			}
		} else {
			// Update existing setting
			setting.Value = value
			setting.UpdatedBy = updatedBy
			if err := tx.Save(&setting).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update setting: " + key})
				return
			}
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit changes"})
		return
	}

	// Reload scheduler configuration
	if schedulerInstance != nil {
		if err := schedulerInstance.ReloadSchedule(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Settings updated but failed to reload scheduler: " + err.Error()})
			return
		}
	}

	// Fetch updated configuration
	config, err := models.GetSchedulerSettings(DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Settings updated but failed to retrieve configuration"})
		return
	}

	response := SchedulerSettingsResponse{
		Enabled:        config.Enabled,
		AllowedDays:    config.AllowedDays,
		MorningTime:    config.MorningTime,
		MorningEnabled: config.MorningEnabled,
		EveningTime:    config.EveningTime,
		EveningEnabled: config.EveningEnabled,
		Timezone:       config.Timezone,
	}

	c.JSON(http.StatusOK, response)
}

// @Summary Reload scheduler
// @Description Manually reload scheduler configuration from database
// @Tags settings
// @Accept json
// @Produce json
// @Success 200 {object} map[string]string "Scheduler reloaded successfully"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can reload scheduler"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/settings/scheduler/reload [post]
// @Security BearerAuth
func ReloadScheduler(c *gin.Context) {
	if schedulerInstance == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Scheduler instance not initialized"})
		return
	}

	if err := schedulerInstance.ReloadSchedule(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reload scheduler: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scheduler reloaded successfully"})
}

// isValidTimeFormat validates HH:MM time format
func isValidTimeFormat(timeStr string) bool {
	if len(timeStr) != 5 {
		return false
	}
	if timeStr[2] != ':' {
		return false
	}

	// Parse hour
	hour := 0
	for i := 0; i < 2; i++ {
		if timeStr[i] < '0' || timeStr[i] > '9' {
			return false
		}
		hour = hour*10 + int(timeStr[i]-'0')
	}
	if hour > 23 {
		return false
	}

	// Parse minute
	minute := 0
	for i := 3; i < 5; i++ {
		if timeStr[i] < '0' || timeStr[i] > '9' {
			return false
		}
		minute = minute*10 + int(timeStr[i]-'0')
	}
	if minute > 59 {
		return false
	}

	return true
}
