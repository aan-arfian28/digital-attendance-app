package settings

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"attendance-app/models"
)

// SettingsResponse represents the key-value map response
type SettingsResponse map[string]string

// UpdateSettingsRequest represents the request payload for updating settings
type UpdateSettingsRequest map[string]string

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
