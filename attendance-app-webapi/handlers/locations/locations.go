package locations

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"attendance-app/models"
)

// CreateLocationRequest represents the request payload for creating a location
type CreateLocationRequest struct {
	Name      string  `json:"Name" validate:"required,max=255" example:"Head Office"`
	Address   string  `json:"Address" validate:"max=500" example:"Jl. Sudirman No. 123, Jakarta"`
	Latitude  float64 `json:"Latitude" validate:"required,latitude" example:"-6.200000"`
	Longitude float64 `json:"Longitude" validate:"required,longitude" example:"106.816666"`
	Radius    uint    `json:"Radius" validate:"required,min=10,max=50000" example:"100"`
}

// UpdateLocationRequest represents the request payload for updating a location
type UpdateLocationRequest struct {
	Name      string  `json:"Name" validate:"max=255" example:"Head Office"`
	Address   string  `json:"Address" validate:"max=500" example:"Jl. Sudirman No. 123, Jakarta"`
	Latitude  float64 `json:"Latitude" validate:"latitude" example:"-6.200000"`
	Longitude float64 `json:"Longitude" validate:"longitude" example:"106.816666"`
	Radius    uint    `json:"Radius" validate:"min=10,max=50000" example:"100"`
}

// @Summary Get all locations
// @Description Retrieve all locations
// @Tags locations
// @Accept json
// @Produce json
// @Success 200 {array} models.Location
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can access locations"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/locations [get]
// @Security BearerAuth
func GetAllLocations(c *gin.Context) {
	DB := c.MustGet("db").(*gorm.DB)

	var locations []models.Location
	if err := DB.Find(&locations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch locations"})
		return
	}

	c.JSON(http.StatusOK, locations)
}

// @Summary Get location by ID
// @Description Retrieve a single location by its ID
// @Tags locations
// @Accept json
// @Produce json
// @Param id path int true "Location ID"
// @Success 200 {object} models.Location
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can access locations"
// @Failure 404 {object} map[string]string "Location not found"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/locations/{id} [get]
// @Security BearerAuth
func GetLocationByID(c *gin.Context) {
	DB := c.MustGet("db").(*gorm.DB)
	id := c.Param("id")

	var location models.Location
	if err := DB.First(&location, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Location not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch location"})
		return
	}

	c.JSON(http.StatusOK, location)
}

// @Summary Create new location
// @Description Create a new location
// @Tags locations
// @Accept json
// @Produce json
// @Param location body CreateLocationRequest true "Location data"
// @Success 201 {object} models.Location
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can create locations"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/locations [post]
// @Security BearerAuth
func CreateLocation(c *gin.Context) {
	DB := c.MustGet("db").(*gorm.DB)

	var req CreateLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Validate coordinates range
	if req.Latitude < -90 || req.Latitude > 90 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Latitude must be between -90 and 90"})
		return
	}
	if req.Longitude < -180 || req.Longitude > 180 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Longitude must be between -180 and 180"})
		return
	}

	location := models.Location{
		Name:      req.Name,
		Address:   req.Address,
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
		Radius:    req.Radius,
	}

	if err := DB.Create(&location).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create location"})
		return
	}

	c.JSON(http.StatusCreated, location)
}

// @Summary Update location
// @Description Update an existing location
// @Tags locations
// @Accept json
// @Produce json
// @Param id path int true "Location ID"
// @Param location body UpdateLocationRequest true "Location data"
// @Success 200 {object} models.Location
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can update locations"
// @Failure 404 {object} map[string]string "Location not found"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/locations/{id} [put]
// @Security BearerAuth
func UpdateLocation(c *gin.Context) {
	DB := c.MustGet("db").(*gorm.DB)
	id := c.Param("id")

	var req UpdateLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	var location models.Location
	if err := DB.First(&location, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Location not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch location"})
		return
	}

	// Update fields if provided
	if req.Name != "" {
		location.Name = req.Name
	}
	if req.Address != "" {
		location.Address = req.Address
	}
	if req.Latitude != 0 {
		// Validate latitude range
		if req.Latitude < -90 || req.Latitude > 90 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Latitude must be between -90 and 90"})
			return
		}
		location.Latitude = req.Latitude
	}
	if req.Longitude != 0 {
		// Validate longitude range
		if req.Longitude < -180 || req.Longitude > 180 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Longitude must be between -180 and 180"})
			return
		}
		location.Longitude = req.Longitude
	}
	if req.Radius != 0 {
		location.Radius = req.Radius
	}

	if err := DB.Save(&location).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update location"})
		return
	}

	c.JSON(http.StatusOK, location)
}

// @Summary Delete location
// @Description Soft delete a location
// @Tags locations
// @Accept json
// @Produce json
// @Param id path int true "Location ID"
// @Success 200 {object} map[string]string "Location deleted successfully"
// @Failure 400 {object} map[string]string "Cannot delete location - it has associated attendance records"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can delete locations"
// @Failure 404 {object} map[string]string "Location not found"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/locations/{id} [delete]
// @Security BearerAuth
func DeleteLocation(c *gin.Context) {
	DB := c.MustGet("db").(*gorm.DB)
	idStr := c.Param("id")

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid location ID"})
		return
	}

	var location models.Location
	if err := DB.First(&location, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Location not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch location"})
		return
	}

	// Check if location has associated attendance records
	var attendanceCount int64
	locationID := uint(id)
	if err := DB.Model(&models.Attendance{}).Where("location_id = ?", locationID).Count(&attendanceCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check attendance records"})
		return
	}

	if attendanceCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete location with existing attendance records"})
		return
	}

	// Soft delete
	if err := DB.Delete(&location).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete location"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Location deleted successfully"})
}
