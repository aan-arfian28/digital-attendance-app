package UserManagement

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"

	"attendance-app/models"
	"attendance-app/utils"
)

// CreateUserRequest represents the request payload for creating a user
type CreateUserRequest struct {
	Username     string `json:"Username" validate:"required,min=3,max=32" example:"john_doe"`
	Password     string `json:"Password" validate:"required,min=8,max=72" example:"SecurePass123!"`
	Email        string `json:"Email" validate:"required,email" example:"john@example.com"`
	Name         string `json:"Name" validate:"required" example:"John Doe"`
	SupervisorID *uint  `json:"SupervisorID,omitempty" example:"1"`
	Role         struct {
		Name          models.RoleName `json:"Name" validate:"required" example:"user"`
		Position      string          `json:"Position" validate:"required" example:"Manager"`
		PositionLevel uint            `json:"PositionLevel" validate:"gte=0" example:"2"`
	} `json:"Role" validate:"required"`
}

// @Summary Create new user
// @Description Create a new user with role and optional supervisor
// @Tags users
// @Accept json
// @Produce json
// @Param user body CreateUserRequest true "User creation data"
// @Success 201 {object} models.UserSwagger
// @Failure 400 {object} map[string]string "Validation error or duplicate user"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can create users"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/users [post]
// @Security BearerAuth
func CreateUser(c *gin.Context) {
	var req CreateUserRequest
	DB := c.MustGet("db").(*gorm.DB)

	// Start transaction
	tx := DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 1. Validate input
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 2. Validate role name
	if req.Role.Name != models.RoleAdmin && req.Role.Name != models.RoleUser {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role name. Must be 'admin' or 'user'"})
		return
	}

	// 3. Check for duplicates (both username and email)
	var existingUser models.User
	result := tx.Where("username = ?", req.Username).Or("email = ?", req.Email).First(&existingUser)
	if result.Error == nil {
		tx.Rollback()
		if existingUser.Username == req.Username {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username already exists"})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Email already exists"})
		}
		return
	} else if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// 4. Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// 5. First, check if role already exists
	var role models.Role
	result = tx.Where("name = ? AND position = ? AND position_level = ?",
		req.Role.Name, req.Role.Position, req.Role.PositionLevel).First(&role)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			// Create new role
			role = models.Role{
				Name:          req.Role.Name,
				Position:      req.Role.Position,
				PositionLevel: req.Role.PositionLevel,
			}
			if err := tx.Create(&role).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create role"})
				return
			}
		} else {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
	}

	// 6. Create user object
	user := models.User{
		Username:     req.Username,
		Password:     hashedPassword,
		Email:        req.Email,
		Name:         req.Name,
		Role:         &role,
		SupervisorID: req.SupervisorID,
	}

	// 7. Validate supervisor if present
	if user.SupervisorID != nil {
		var supervisor models.User
		if err := tx.Preload("Role").First(&supervisor, *user.SupervisorID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Supervisor not found"})
			return
		}

		// Admin cannot have supervisor
		if user.Role.Name == models.RoleAdmin {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Admin users cannot have a supervisor"})
			return
		}

		// Supervisor must have higher position level
		if user.Role.PositionLevel <= supervisor.Role.PositionLevel {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Supervisor must have higher position level"})
			return
		}

		// Admin user cannot be supervisor
		if supervisor.Role.Name == models.RoleAdmin {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Admin users cannot be supervisors"})
			return
		}
	}

	// 8. Create user
	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// 9. Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// Clear sensitive data before sending response
	user.Password = ""
	c.JSON(http.StatusCreated, user)
}

// @Summary Get user details
// @Description Get detailed information about a specific user
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {object} models.UserSwagger
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can access"
// @Failure 404 {object} map[string]string "User not found"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/users/{id} [get]
// @Security BearerAuth
func GetUser(c *gin.Context) {
	var user models.User
	id := c.Param("id")

	db := c.MustGet("db").(*gorm.DB)

	// Load user with all related data
	if err := db.Preload("Role").
		Preload("Supervisor").
		Preload("Supervisor.Role").
		First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
		}
		return
	}

	// Clear sensitive data
	user.Password = ""
	if user.Supervisor != nil {
		user.Supervisor.Password = ""
	}

	c.JSON(http.StatusOK, user)
}

// Define the struct for the inner 'Role' object
// UpdateUserRequest represents the request payload for updating a user
type UpdateUserRequest struct {
	Username     string  `json:"Username,omitempty" validate:"omitempty,min=3,max=32" example:"john_doe_updated"`
	Password     *string `json:"Password,omitempty" validate:"omitempty,min=8,max=72" example:"NewSecurePass123!"`
	Email        string  `json:"Email,omitempty" validate:"omitempty,email" example:"john.updated@example.com"`
	Name         string  `json:"Name,omitempty" validate:"omitempty" example:"John Doe Updated"`
	SupervisorID *uint   `json:"SupervisorID,omitempty" example:"2"`
	Role         struct {
		Name          models.RoleName `json:"Name,omitempty" validate:"omitempty" example:"user"`
		Position      string          `json:"Position,omitempty" validate:"omitempty" example:"Senior Manager"`
		PositionLevel uint            `json:"PositionLevel,omitempty" validate:"omitempty,gte=0" example:"3"`
	} `json:"Role,omitempty"`
}

// @Summary Update user details
// @Description Update an existing user's information
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param user body UpdateUserRequest true "User update data"
// @Success 200 {object} models.UserSwagger
// @Failure 400 {object} map[string]string "Validation error"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can update users"
// @Failure 404 {object} map[string]string "User not found"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/users/{id} [put]
// @Security BearerAuth
func UpdateUser(c *gin.Context) {
	var user models.User
	var req UpdateUserRequest
	id := c.Param("id")

	DB := c.MustGet("db").(*gorm.DB)

	// Start transaction
	tx := DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Load existing user with related data
	if err := tx.Preload("Role").First(&user, id).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
		}
		return
	}

	// Bind and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Check unique constraints if updating username or email
	if req.Username != "" && req.Username != user.Username {
		var exists bool
		if err := tx.Model(&models.User{}).Where("username = ? AND id != ?", req.Username, user.ID).
			Select("1").Scan(&exists).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
		if exists {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username already exists"})
			return
		}
		user.Username = req.Username
	}

	if req.Email != "" && req.Email != user.Email {
		var exists bool
		if err := tx.Model(&models.User{}).Where("email = ? AND id != ?", req.Email, user.ID).
			Select("1").Scan(&exists).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
		if exists {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Email already exists"})
			return
		}
		user.Email = req.Email
	}

	// Update password if provided
	if req.Password != nil && *req.Password != "" {
		hashedPassword, err := utils.HashPassword(*req.Password)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}
		user.Password = hashedPassword
	}

	// Update role if provided
	if req.Role.Name != "" || req.Role.Position != "" || req.Role.PositionLevel > 0 {
		// Validate role name if provided
		if req.Role.Name != "" && req.Role.Name != models.RoleAdmin && req.Role.Name != models.RoleUser {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role name. Must be 'admin' or 'user'"})
			return
		}

		// Check if role exists or create new one
		var role models.Role
		roleName := req.Role.Name
		if roleName == "" {
			roleName = user.Role.Name
		}
		rolePosition := req.Role.Position
		if rolePosition == "" {
			rolePosition = user.Role.Position
		}
		roleLevel := req.Role.PositionLevel
		if roleLevel == 0 {
			roleLevel = user.Role.PositionLevel
		}

		result := tx.Where("name = ? AND position = ? AND position_level = ?",
			roleName, rolePosition, roleLevel).First(&role)

		if result.Error != nil {
			if errors.Is(result.Error, gorm.ErrRecordNotFound) {
				role = models.Role{
					Name:          roleName,
					Position:      rolePosition,
					PositionLevel: roleLevel,
				}
				if err := tx.Create(&role).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create role"})
					return
				}
			} else {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
				return
			}
		}
		user.Role = &role
	}

	// Update supervisor if provided
	if req.SupervisorID != nil {
		// Cannot assign supervisor to admin
		if user.Role.Name == models.RoleAdmin {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Admin users cannot have a supervisor"})
			return
		}

		var supervisor models.User
		if err := tx.Preload("Role").First(&supervisor, *req.SupervisorID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Supervisor not found"})
			return
		}

		// Admin cannot be supervisor
		if supervisor.Role.Name == models.RoleAdmin {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Admin users cannot be supervisors"})
			return
		}

		// Supervisor must have higher position level
		if user.Role.PositionLevel <= supervisor.Role.PositionLevel {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Supervisor must have higher position level"})
			return
		}

		user.SupervisorID = req.SupervisorID
	}

	// Update user details if provided
	if req.Name != "" {
		user.Name = req.Name
	}

	// Save user changes
	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit changes"})
		return
	}

	// Clear sensitive data and reload user with fresh data
	if err := DB.Preload("Role").Preload("Supervisor").
		Preload("Supervisor.Role").First(&user, user.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reload user data"})
		return
	}
	user.Password = ""
	if user.Supervisor != nil {
		user.Supervisor.Password = ""
	}
	c.JSON(http.StatusOK, user)
}

// @Summary Delete a user
// @Description Delete an existing user from the system
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {object} map[string]string "User deleted successfully"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can delete users"
// @Failure 404 {object} map[string]string "User not found"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/users/{id} [delete]
// @Security BearerAuth
func DeleteUser(c *gin.Context) {
	var user models.User
	id := c.Param("id")

	DB := c.MustGet("db").(*gorm.DB)

	// Start transaction
	tx := DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Find the user first
	if err := tx.Preload("Role").First(&user, id).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
		}
		return
	}

	// Check if user is admin - prevent deleting admin users
	if user.Role.Name == models.RoleAdmin {
		tx.Rollback()
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete admin users"})
		return
	}

	// Update supervisor_id to null for any subordinates
	if err := tx.Model(&models.User{}).Where("supervisor_id = ?", user.ID).
		Update("supervisor_id", nil).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update subordinates"})
		return
	}

	// Delete the user
	if err := tx.Delete(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit changes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

type GetAllAdminUsersResponse struct {
	ID       uint            `json:"ID"`
	Username string          `json:"Username"`
	Name     string          `json:"Name"`
	Email    string          `json:"Email"`
	Role     models.RoleName `json:"Role"`
}

func GetAllAdminUsers(c *gin.Context) {
	db, exists := c.Get("db")
	if !exists {
		c.JSON(500, gin.H{"error": "database connection not found"})
		return
	}
	DB := db.(*gorm.DB)

	// Get pagination params
	params := utils.GetPaginationParams(c)

	// Build base query
	query := DB.Model(&models.User{}).
		Joins("Role").
		Where("Role.name = ?", "admin").
		Preload("Supervisor")

	// Apply search if provided (search by email, role name, or position)
	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		query = query.Where("users.email LIKE ? OR Role.name LIKE ? OR Role.position LIKE ?",
			searchPattern, searchPattern, searchPattern)
	}

	// Count total rows
	var totalRows int64
	if err := query.Count(&totalRows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count admin users"})
		return
	}

	// Validate sortBy field
	allowedSortFields := map[string]bool{
		"id": true, "name": true, "email": true, "username": true, "created_at": true,
		"role": true, "position_level": true,
	}
	if !allowedSortFields[params.SortBy] {
		params.SortBy = "id"
	}

	// Apply pagination and sorting (prepend table name to avoid ambiguity)
	// Handle role-specific fields
	if params.SortBy == "role" {
		params.SortBy = "Role.name"
	} else if params.SortBy == "position_level" {
		params.SortBy = "Role.position_level"
	} else {
		params.SortBy = "users." + params.SortBy
	}
	var users []models.User
	query = utils.ApplyPagination(query, params)
	if err := query.Find(&users).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to retrieve admin users"})
		return
	}

	// Build response
	var userResponses []GetAllNonAdminUsersResponse
	for _, user := range users {
		response := GetAllNonAdminUsersResponse{
			ID:            user.ID,
			Username:      user.Username,
			Name:          user.Name,
			Email:         user.Email,
			Role:          user.Role.Name,
			Position:      user.Role.Position,
			PositionLevel: user.Role.PositionLevel,
		}

		// Safely add supervisor info if it exists
		if user.Supervisor != nil {
			response.Supervisor = &struct {
				SupervisorID   uint   `json:"SupervisorID"`
				SupervisorName string `json:"SupervisorName"`
			}{
				SupervisorID:   user.Supervisor.ID,
				SupervisorName: user.Supervisor.Name,
			}
		}
		userResponses = append(userResponses, response)
	}

	// Build paginated response
	paginatedResponse := utils.BuildPaginatedResponse(userResponses, totalRows, params)
	c.JSON(http.StatusOK, paginatedResponse)
}

type GetAllNonAdminUsersResponse struct {
	ID            uint            `json:"ID"`
	Username      string          `json:"Username"`
	Name          string          `json:"Name"`
	Email         string          `json:"Email"`
	Role          models.RoleName `json:"Role"`
	Position      string          `json:"Position"`
	PositionLevel uint            `json:"PositionLevel"`
	Supervisor    *struct {       // Nested struct for supervisor info
		SupervisorID   uint   `json:"SupervisorID"`
		SupervisorName string `json:"SupervisorName"`
	} `json:"Supervisor"`
}

// @Summary Get all non-admin users
// @Description Retrieve a list of all users who are not administrators
// @Tags users
// @Accept json
// @Produce json
// @Success 200 {array} GetAllNonAdminUsersResponse
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can view user list"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/users/non-admins [get]
// @Security BearerAuth
func GetAllNonAdminUsers(c *gin.Context) {
	DB := c.MustGet("db").(*gorm.DB)

	// Get pagination params
	params := utils.GetPaginationParams(c)

	// Build base query
	query := DB.Model(&models.User{}).
		Joins("Role").
		Where("Role.name <> ?", "admin").
		Preload("Supervisor")

	// Apply search if provided (search by email, role name, or position)
	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		query = query.Where("users.email LIKE ? OR Role.name LIKE ? OR Role.position LIKE ?",
			searchPattern, searchPattern, searchPattern)
	}

	// Count total rows
	var totalRows int64
	if err := query.Count(&totalRows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count non-admin users"})
		return
	}

	// Validate sortBy field
	allowedSortFields := map[string]bool{
		"id": true, "name": true, "email": true, "username": true, "created_at": true,
		"role": true, "position_level": true,
	}
	if !allowedSortFields[params.SortBy] {
		params.SortBy = "id"
	}

	// Apply pagination and sorting (prepend table name to avoid ambiguity)
	// Handle role-specific fields
	if params.SortBy == "role" {
		params.SortBy = "Role.name"
	} else if params.SortBy == "position_level" {
		params.SortBy = "Role.position_level"
	} else {
		params.SortBy = "users." + params.SortBy
	}
	var users []models.User
	query = utils.ApplyPagination(query, params)
	if err := query.Find(&users).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to retrieve non-admin users"})
		return
	}

	// Build response
	var userResponses []GetAllNonAdminUsersResponse
	for _, user := range users {
		response := GetAllNonAdminUsersResponse{
			ID:            user.ID,
			Username:      user.Username,
			Name:          user.Name,
			Email:         user.Email,
			Role:          user.Role.Name,
			Position:      user.Role.Position,
			PositionLevel: user.Role.PositionLevel,
		}

		// Safely add supervisor info if it exists
		if user.Supervisor != nil {
			response.Supervisor = &struct {
				SupervisorID   uint   `json:"SupervisorID"`
				SupervisorName string `json:"SupervisorName"`
			}{
				SupervisorID:   user.Supervisor.ID,
				SupervisorName: user.Supervisor.Name,
			}
		}
		userResponses = append(userResponses, response)
	}

	// Build paginated response
	paginatedResponse := utils.BuildPaginatedResponse(userResponses, totalRows, params)
	c.JSON(http.StatusOK, paginatedResponse)
}

// type GetAllAdminUsersResponse struct {
// 	ID       uint            `json:"ID"`
// 	Username string          `json:"Username"`
// 	Name     string          `json:"Name"`
// 	Email    string          `json:"Email"`
// 	Role     models.RoleName `json:"Role"`
// }

// @Summary Get all roles
// @Description Retrieve a list of all available roles in the system
// @Tags roles
// @Accept json
// @Produce json
// @Success 200 {array} models.RoleSwagger
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can view roles"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/users/roles [get]
// @Security BearerAuth
func GetRoles(c *gin.Context) {
	DB := c.MustGet("db").(*gorm.DB)

	// Get pagination params
	params := utils.GetPaginationParams(c)

	// Build base query
	query := DB.Model(&models.Role{})

	// Apply search if provided
	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		query = query.Where("name LIKE ? OR description LIKE ?", searchPattern, searchPattern)
	}

	// Count total rows
	var totalRows int64
	if err := query.Count(&totalRows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count roles"})
		return
	}

	// Validate sortBy field
	allowedSortFields := map[string]bool{
		"id": true, "name": true, "position_level": true, "created_at": true,
	}
	if !allowedSortFields[params.SortBy] {
		params.SortBy = "position_level"
	}

	// Apply pagination and sorting
	var roles []models.Role
	query = utils.ApplyPagination(query, params)
	if err := query.Find(&roles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve roles"})
		return
	}

	// Build paginated response
	response := utils.BuildPaginatedResponse(roles, totalRows, params)
	c.JSON(http.StatusOK, response)
}

// @Summary Get admin roles
// @Description Get a list of all admin roles in the system
// @Tags roles
// @Accept json
// @Produce json
// @Success 200 {array} models.RoleSwagger
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can view roles"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/users/roles/admins [get]
// @Security BearerAuth
func GetRolesAdmins(c *gin.Context) {
	var roles []models.Role
	DB := c.MustGet("db").(*gorm.DB)

	if err := DB.Where("name = ?", models.RoleAdmin).
		Order("position_level desc").Find(&roles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve admin roles"})
		return
	}

	c.JSON(http.StatusOK, roles)
}

// @Summary Get non-admin roles
// @Description Get a list of all non-admin roles in the system
// @Tags roles
// @Accept json
// @Produce json
// @Success 200 {array} models.RoleSwagger
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can view roles"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/users/roles/non-admins [get]
// @Security BearerAuth
func GetRolesNonAdmins(c *gin.Context) {
	var roles []models.Role
	DB := c.MustGet("db").(*gorm.DB)

	if err := DB.Where("name <> ?", models.RoleAdmin).
		Order("position_level desc").Find(&roles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve non-admin roles"})
		return
	}

	c.JSON(http.StatusOK, roles)
}

// @Summary Create new role
// @Description Create a new role in the system
// @Tags roles
// @Accept json
// @Produce json
// @Param role body models.Role true "Role creation data"
// @Success 201 {object} models.RoleSwagger
// @Failure 400 {object} map[string]string "Validation error or role already exists"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can create roles"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/users/roles [post]
// @Security BearerAuth
func CreateRole(c *gin.Context) {
	var role models.Role
	DB := c.MustGet("db").(*gorm.DB)

	// Start transaction
	tx := DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := c.ShouldBindJSON(&role); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Validate request data
	if err := utils.Validate.Struct(role); err != nil {
		errors := utils.FormatValidationErrors(err)
		c.JSON(http.StatusBadRequest, gin.H{"errors": errors})
		return
	}

	// Validate role name
	if role.Name != models.RoleAdmin && role.Name != models.RoleUser {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role name. Must be 'admin' or 'user'"})
		return
	}

	// Check if role already exists
	var exists bool
	if err := tx.Model(&models.Role{}).
		Where("name = ? AND position = ? AND position_level = ?",
			role.Name, role.Position, role.PositionLevel).
		Select("1").Scan(&exists).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if exists {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role already exists with these specifications"})
		return
	}

	// Create the role
	if err := tx.Create(&role).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create role"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit changes"})
		return
	}

	c.JSON(http.StatusCreated, role)
}

// @Summary Update role
// @Description Update an existing role's details
// @Tags roles
// @Accept json
// @Produce json
// @Param id path string true "Role ID"
// @Param role body models.Role true "Updated role data"
// @Success 200 {object} models.RoleSwagger
// @Failure 400 {object} map[string]string "Validation error"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can update roles"
// @Failure 404 {object} map[string]string "Role not found"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/users/roles/{id} [put]
// @Security BearerAuth
func UpdateRole(c *gin.Context) {
	var role, existingRole models.Role
	id := c.Param("id")

	DB := c.MustGet("db").(*gorm.DB)

	// Start transaction
	tx := DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Find existing role
	if err := tx.First(&existingRole, id).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch role"})
		}
		return
	}

	// Bind update data
	if err := c.ShouldBindJSON(&role); err != nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Validate request data
	if err := utils.Validate.Struct(role); err != nil {
		tx.Rollback()
		errors := utils.FormatValidationErrors(err)
		c.JSON(http.StatusBadRequest, gin.H{"errors": errors})
		return
	}

	// Validate role name
	if role.Name != models.RoleAdmin && role.Name != models.RoleUser {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role name. Must be 'admin' or 'user'"})
		return
	}

	// Check if another role exists with the same specifications
	var exists bool
	if err := tx.Model(&models.Role{}).
		Where("id != ? AND name = ? AND position = ? AND position_level = ?",
			id, role.Name, role.Position, role.PositionLevel).
		Select("1").Scan(&exists).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if exists {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Another role already exists with these specifications"})
		return
	}

	// Check if role is in use and position level is being lowered
	if role.PositionLevel < existingRole.PositionLevel {
		var usersCount int64
		if err := tx.Model(&models.User{}).Where("role_id = ?", existingRole.ID).Count(&usersCount).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check role usage"})
			return
		}

		// if usersCount > 0 {
		// 	tx.Rollback()
		// 	c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot lower position level of a role that is currently assigned to users"})
		// 	return
		// }
	}

	// Update the role
	if err := tx.Model(&existingRole).Updates(map[string]interface{}{
		"name":           role.Name,
		"position":       role.Position,
		"position_level": role.PositionLevel,
	}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit changes"})
		return
	}

	c.JSON(http.StatusOK, existingRole)
}

// @Summary Delete role
// @Description Delete an existing role
// @Tags roles
// @Accept json
// @Produce json
// @Param id path string true "Role ID"
// @Success 200 {object} map[string]string "Role deleted successfully"
// @Failure 400 {object} map[string]string "Role is in use by users"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can delete roles"
// @Failure 404 {object} map[string]string "Role not found"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/users/roles/{id} [delete]
// @Security BearerAuth
func DeleteRole(c *gin.Context) {
	var role models.Role
	id := c.Param("id")

	DB := c.MustGet("db").(*gorm.DB)

	// Start transaction
	tx := DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Find the role
	if err := tx.First(&role, id).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch role"})
		}
		return
	}

	// Check if any users are using this role
	var usersCount int64
	if err := tx.Model(&models.User{}).Where("role_id = ?", role.ID).Count(&usersCount).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check role usage"})
		return
	}

	if usersCount > 0 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete role: it is currently assigned to users"})
		return
	}

	// Delete the role
	if err := tx.Delete(&role).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete role"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit changes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role deleted successfully"})
}

// @Summary Get user's subordinates
// @Description Get a list of all users who report to the current user
// @Tags users
// @Accept json
// @Produce json
// @Success 200 {array} models.UserSwagger "List of subordinate users"
// @Failure 401 {object} map[string]string "Unauthorized or invalid token"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/users/subordinates [get]
// @Security BearerAuth
func GetUserSubordinates(c *gin.Context) {
	DB := c.MustGet("db").(*gorm.DB)

	// Get current user ID from JWT token
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
		return
	}

	uid := userID.(uint)

	// First verify that the user exists and get their role
	var currentUser models.User
	if err := DB.Preload("Role").First(&currentUser, uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user data"})
		}
		return
	}

	// Admins cannot have subordinates
	if currentUser.Role.Name == models.RoleAdmin {
		c.JSON(http.StatusOK, []models.User{})
		return
	}

	// Find all users who have this user as their supervisor
	var subordinates []models.User
	if err := DB.Where("supervisor_id = ?", uid).
		Preload("Role").
		Preload("Supervisor").
		Preload("Supervisor.Role").
		Find(&subordinates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve subordinates"})
		return
	}

	// Clear sensitive data
	for i := range subordinates {
		subordinates[i].Password = ""
		if subordinates[i].Supervisor != nil {
			subordinates[i].Supervisor.Password = ""
		}
	}

	c.JSON(http.StatusOK, subordinates)
}

// @Summary Get current user's profile
// @Description Get the profile of the currently authenticated user (non-admin)
// @Tags users
// @Accept json
// @Produce json
// @Success 200 {object} models.UserSwagger "Current user's profile"
// @Failure 401 {object} map[string]string "Unauthorized or invalid token"
// @Failure 404 {object} map[string]string "User not found"
// @Failure 500 {object} map[string]string "Server error"
// @Router /user/profile [get]
// @Security BearerAuth
func GetMyProfile(c *gin.Context) {
	DB := c.MustGet("db").(*gorm.DB)

	// Get current user ID from JWT token
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
		return
	}

	uid := userID.(uint)

	// Load user with all related data
	var user models.User
	if err := DB.Preload("Role").
		Preload("Supervisor").
		Preload("Supervisor.Role").
		First(&user, uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user profile"})
		}
		return
	}

	// Clear sensitive data
	user.Password = ""
	if user.Supervisor != nil {
		user.Supervisor.Password = ""
	}

	c.JSON(http.StatusOK, user)
}

// @Summary Export all users to Excel
// @Description Export all users (including soft-deleted) with complete details to Excel file
// @Tags users
// @Accept json
// @Produce application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
// @Success 200 {file} file "Excel file with all users data"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can export users"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/users/export/excel [get]
// @Security BearerAuth
func ExportUsersToExcel(c *gin.Context) {
	DB := c.MustGet("db").(*gorm.DB)

	// Fetch all users including soft-deleted with relationships
	var users []models.User
	if err := DB.Unscoped().
		Preload("Role").
		Preload("Supervisor").
		Preload("Supervisor.Role").
		Order("id ASC").
		Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	// Create new Excel file
	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			return
		}
	}()

	sheetName := "Users"
	index, err := f.NewSheet(sheetName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Excel sheet"})
		return
	}

	// Set headers
	headers := []string{"ID", "Username", "Name", "Email", "Role Name", "Position", "Position Level", "Supervisor ID", "Supervisor Name", "Created At", "Updated At", "Deleted At"}
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
		f.SetCellStyle(sheetName, "A1", "L1", headerStyle)
	}

	// Write user data
	for i, user := range users {
		row := i + 2

		// ID
		cell, _ := excelize.CoordinatesToCellName(1, row)
		f.SetCellValue(sheetName, cell, user.ID)

		// Username
		cell, _ = excelize.CoordinatesToCellName(2, row)
		f.SetCellValue(sheetName, cell, user.Username)

		// Name
		cell, _ = excelize.CoordinatesToCellName(3, row)
		f.SetCellValue(sheetName, cell, user.Name)

		// Email
		cell, _ = excelize.CoordinatesToCellName(4, row)
		f.SetCellValue(sheetName, cell, user.Email)

		// Role Name
		cell, _ = excelize.CoordinatesToCellName(5, row)
		if user.Role != nil {
			f.SetCellValue(sheetName, cell, user.Role.Name)
		} else {
			f.SetCellValue(sheetName, cell, "")
		}

		// Position
		cell, _ = excelize.CoordinatesToCellName(6, row)
		if user.Role != nil {
			f.SetCellValue(sheetName, cell, user.Role.Position)
		} else {
			f.SetCellValue(sheetName, cell, "")
		}

		// Position Level
		cell, _ = excelize.CoordinatesToCellName(7, row)
		if user.Role != nil {
			f.SetCellValue(sheetName, cell, user.Role.PositionLevel)
		} else {
			f.SetCellValue(sheetName, cell, "")
		}

		// Supervisor ID
		cell, _ = excelize.CoordinatesToCellName(8, row)
		if user.SupervisorID != nil {
			f.SetCellValue(sheetName, cell, *user.SupervisorID)
		} else {
			f.SetCellValue(sheetName, cell, "")
		}

		// Supervisor Name
		cell, _ = excelize.CoordinatesToCellName(9, row)
		if user.Supervisor != nil {
			f.SetCellValue(sheetName, cell, user.Supervisor.Name)
		} else {
			f.SetCellValue(sheetName, cell, "")
		}

		// Created At
		cell, _ = excelize.CoordinatesToCellName(10, row)
		f.SetCellValue(sheetName, cell, user.CreatedAt.Format("2006-01-02 15:04:05"))

		// Updated At
		cell, _ = excelize.CoordinatesToCellName(11, row)
		f.SetCellValue(sheetName, cell, user.UpdatedAt.Format("2006-01-02 15:04:05"))

		// Deleted At
		cell, _ = excelize.CoordinatesToCellName(12, row)
		if user.DeletedAt.Valid {
			f.SetCellValue(sheetName, cell, user.DeletedAt.Time.Format("2006-01-02 15:04:05"))
		} else {
			f.SetCellValue(sheetName, cell, "")
		}
	}

	// Auto-fit columns
	for i := 1; i <= len(headers); i++ {
		col, _ := excelize.ColumnNumberToName(i)
		f.SetColWidth(sheetName, col, col, 15)
	}

	// Set active sheet
	f.SetActiveSheet(index)
	f.DeleteSheet("Sheet1")

	// Generate filename with current date
	filename := fmt.Sprintf("users_%s.xlsx", time.Now().Format("2006-01-02"))

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

// @Summary Export roles to Excel
// @Description Export all roles (including soft-deleted) to Excel file
// @Tags roles
// @Produce application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
// @Success 200 {file} binary "Excel file download"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden - Only admins can export roles"
// @Failure 500 {object} map[string]string "Server error"
// @Router /admin/users/roles/export/excel [get]
// @Security BearerAuth
func ExportRolesToExcel(c *gin.Context) {
	DB := c.MustGet("db").(*gorm.DB)

	// Fetch all roles including soft-deleted
	var roles []models.Role
	if err := DB.Unscoped().
		Order("position_level ASC, id ASC").
		Find(&roles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch roles"})
		return
	}

	// Create new Excel file
	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			return
		}
	}()

	sheetName := "Roles"
	index, err := f.NewSheet(sheetName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Excel sheet"})
		return
	}

	// Set headers
	headers := []string{"ID", "Role", "Position", "Position Level", "Created At", "Updated At", "Deleted At"}
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
		f.SetCellStyle(sheetName, "A1", "G1", headerStyle)
	}

	// Write role data
	for i, role := range roles {
		row := i + 2

		// ID
		cell, _ := excelize.CoordinatesToCellName(1, row)
		f.SetCellValue(sheetName, cell, role.ID)

		// Role Name
		cell, _ = excelize.CoordinatesToCellName(2, row)
		f.SetCellValue(sheetName, cell, role.Name)

		// Position
		cell, _ = excelize.CoordinatesToCellName(3, row)
		f.SetCellValue(sheetName, cell, role.Position)

		// Position Level
		cell, _ = excelize.CoordinatesToCellName(4, row)
		f.SetCellValue(sheetName, cell, role.PositionLevel)

		// Created At
		cell, _ = excelize.CoordinatesToCellName(5, row)
		f.SetCellValue(sheetName, cell, role.CreatedAt.Format("2006-01-02 15:04:05"))

		// Updated At
		cell, _ = excelize.CoordinatesToCellName(6, row)
		f.SetCellValue(sheetName, cell, role.UpdatedAt.Format("2006-01-02 15:04:05"))

		// Deleted At
		cell, _ = excelize.CoordinatesToCellName(7, row)
		if role.DeletedAt.Valid {
			f.SetCellValue(sheetName, cell, role.DeletedAt.Time.Format("2006-01-02 15:04:05"))
		} else {
			f.SetCellValue(sheetName, cell, "")
		}
	}

	// Auto-fit columns
	for i := 1; i <= len(headers); i++ {
		col, _ := excelize.ColumnNumberToName(i)
		f.SetColWidth(sheetName, col, col, 18)
	}

	// Set active sheet
	f.SetActiveSheet(index)
	f.DeleteSheet("Sheet1")

	// Generate filename with current date
	filename := fmt.Sprintf("roles_%s.xlsx", time.Now().Format("2006-01-02"))

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
