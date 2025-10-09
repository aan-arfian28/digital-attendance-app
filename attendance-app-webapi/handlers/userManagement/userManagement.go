package UserManagement

import (
	"errors"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"attendance-app/models"
	"attendance-app/utils"
)

func CreateUser(c *gin.Context) {
	var user models.User

	db, exists := c.Get("db")
	if !exists {
		c.JSON(500, gin.H{"error": "database connection not found"})
		return
	}

	DB := db.(*gorm.DB)

	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload, " + err.Error()})
		return
	}

	if err := utils.Validate.Struct(user); err != nil {
		log.Printf("%+v\n", user)
		errors := utils.FormatValidationErrors(err)
		c.JSON(http.StatusBadRequest, gin.H{"errors": errors})
		return
	}

	// Check if role already exists
	var existingRole models.Role
	if err := DB.Where("name = ? AND position = ? AND position_level = ?", user.Role.Name, user.Role.Position, user.Role.PositionLevel).First(&existingRole).Error; err == nil {
		user.RoleID = existingRole.ID
		user.Role = &existingRole
	} else {
		if err := DB.Create(&user.Role).Error; err != nil {
			c.JSON(500, gin.H{"error": "failed to create role, " + err.Error()})
			return
		}
	}

	hashedPassword, err := utils.HashPassword(user.Password)
	if err != nil {
		errorMessage := fmt.Sprintf("Error hashing password for user %v: %v", user, err)
		c.JSON(500, gin.H{"error": errorMessage})
	}
	user.Password = hashedPassword

	user, err = checkSupervisor(user, DB)
	if err != nil {
		errorMessage := fmt.Sprintf("Supervisor not found %v: %v", user, err)
		c.JSON(500, gin.H{"error": errorMessage})
	}

	if err := DB.Create(&user).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to create user, " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, user)
}

func GetUser(c *gin.Context) {
	var user models.User
	id := c.Param("id")

	db, exists := c.Get("db")
	if !exists {
		c.JSON(500, gin.H{"error": "database connection not found"})
		return
	}

	DB := db.(*gorm.DB)

	if err := DB.Preload("Role").Preload("UserDetail").First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// Define the struct for the inner 'Role' object
type Role struct {
	Name          models.RoleName `json:"Name" validate:"required"`
	Position      string          `json:"Position" validate:"omitempty"`
	PositionLevel uint            `json:"PositionLevel" validate:"gte=0"`
}

// Define the struct for the inner 'UserDetail' object
type UserDetail struct {
	Name string `json:"Name" validate:"omitempty"`
}

// Define the main struct for the entire payload
type UserPayload struct {
	Username   string     `json:"Username" validate:"omitempty,min=3,max=32"`
	Password   *string    `json:"Password" validate:"omitempty,min=8,max=72"`
	Email      string     `json:"Email" validate:"omitempty,email"`
	Role       Role       `json:"Role" `
	UserDetail UserDetail `json:"UserDetail"`
}

func UpdateUser(c *gin.Context) {
	var user models.User
	var payload UserPayload
	id := c.Param("id")

	db, exists := c.Get("db")
	if !exists {
		c.JSON(500, gin.H{"error": "database connection not found"})
		return
	}

	DB := db.(*gorm.DB)

	if err := DB.Preload("Role").Preload("UserDetail").First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	log.Println("userdetail = ", user.UserDetail)

	if err := c.ShouldBindJSON(&payload); err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload untuk user"})
		return
	}
	log.Println("payload", payload)

	if err := utils.Validate.Struct(payload); err != nil {
		errors := utils.FormatValidationErrors(err)
		c.JSON(http.StatusBadRequest, gin.H{"errors": errors})
		return
	}

	updates := make(map[string]interface{})

	if payload.Username != "" {
		user.Username = payload.Username
		updates["Username"] = user.Username
	}

	if payload.Email != "" {
		user.Email = payload.Email
		updates["Email"] = user.Email
	}

	if payload.Password != nil {
		if *payload.Password != "" {
			log.Println("mencoba mengbuah password")
			hashedPassword, err := utils.HashPassword(*payload.Password)
			if err != nil {
				errorMessage := fmt.Sprintf("Error hashing password for user %v: %v", user.UserDetail.User.ID, err)
				c.JSON(500, gin.H{"error": errorMessage})
				return
			}
			user.Password = hashedPassword
			updates["Password"] = user.Password
		} else {
			log.Println("skip mengbuah password")
		}
	}

	if payload.Role.Name != "" || payload.Role.Position != "" {
		var role models.Role
		if payload.Role.Name != "" {
			user.Role.Name = payload.Role.Name
		}
		if payload.Role.Position != "" {
			user.Role.Position = payload.Role.Position
		}
		user.Role.PositionLevel = payload.Role.PositionLevel
		if err := DB.Where("name = ? AND position = ? AND position_level = ?", user.Role.Name, user.Role.Position, user.Role.PositionLevel).First(&role).Error; err == nil {
			log.Println("ketemu!! : ", user.Role)
			user.RoleID = role.ID
			user.Role = &role
		} else {
			role = models.Role{}
			role.Name, role.Position, role.PositionLevel = user.Role.Name, user.Role.Position, user.Role.PositionLevel
			log.Println("bikin role!! : ", role)
			if err := DB.Create(&role).Error; err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
		}
	}

	if err := DB.Model(&user).Updates(user).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to update user"})
		return
	}

	if payload.UserDetail.Name != "" {
		var userDetail models.UserDetail
		if err := DB.Where("user_id = ?", user.ID).First(&userDetail).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "user detail not found"})
			return
		}
		user.UserDetail.Name = payload.UserDetail.Name
		userDetail.Name = user.UserDetail.Name
		if err := DB.Save(&userDetail).Error; err != nil {
			c.JSON(500, gin.H{"error": "failed to update user detail"})
			return
		}
	}

	c.JSON(http.StatusOK, user)
}

func DeleteUser(c *gin.Context) {
	var user models.User
	id := c.Param("id")

	db, exists := c.Get("db")
	if !exists {
		c.JSON(500, gin.H{"error": "database connection not found"})
		return
	}

	DB := db.(*gorm.DB)

	if err := DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if err := DB.Delete(&user).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "user deleted successfully"})
}

func checkSupervisor(user models.User, DB *gorm.DB) (models.User, error) {
	if user.SupervisorID != nil {
		var supervisor models.User
		if err := DB.First(&supervisor, *user.SupervisorID).Error; err != nil {
			return user, errors.New("supervisor not found")
		}

		// var userRole models.Role
		// if err := DB.First(&userRole, user.RoleID).Error; err != nil {
		// 	return user, errors.New("user role not found")
		// }

		var supervisorRole models.Role
		if err := DB.First(&supervisorRole, supervisor.RoleID).Error; err != nil {
			return user, errors.New("supervisor role not found")
		}

		// if userRole.PositionLevel >= supervisorRole.PositionLevel {
		if user.Role.PositionLevel < supervisorRole.PositionLevel {
			return user, errors.New("user can only be supervised by someone with a higher position level")
		}
	}
	return user, nil
}

type GetAllAdminUsersResponse struct {
	ID       uint            `json:"ID"`
	Username string          `json:"Username"`
	Name     string          `json:"Name"`
	Email    string          `json:"Email"`
	Role     models.RoleName `json:"Role"`
}

func GetAllAdminUsers(c *gin.Context) {
	var users []models.User
	db, exists := c.Get("db")
	if !exists {
		c.JSON(500, gin.H{"error": "database connection not found"})
		return
	}

	DB := db.(*gorm.DB)

	if err := DB.Joins("Role").Joins("UserDetail").Where("Role.name = ?", "admin").Preload("Supervisor").Preload("Supervisor.UserDetail").Find(&users).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to retrieve non-admin users"})
		return
	}

	// log.Println(users)

	var userResponses []GetAllNonAdminUsersResponse
	for _, user := range users {
		response := GetAllNonAdminUsersResponse{
			ID:            user.ID,
			Username:      user.Username,
			Name:          user.UserDetail.Name,
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
				SupervisorName: user.Supervisor.UserDetail.Name,
			}
		}
		userResponses = append(userResponses, response)
	}

	c.JSON(http.StatusOK, userResponses)
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

func GetAllNonAdminUsers(c *gin.Context) {
	var users []models.User
	db, exists := c.Get("db")
	if !exists {
		c.JSON(500, gin.H{"error": "database connection not found"})
		return
	}

	DB := db.(*gorm.DB)

	if err := DB.Joins("Role").Joins("UserDetail").Where("Role.name <> ?", "admin").Preload("Supervisor").Preload("Supervisor.UserDetail").Find(&users).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to retrieve non-admin users"})
		return
	}

	// log.Println(users)

	var userResponses []GetAllNonAdminUsersResponse
	for _, user := range users {
		response := GetAllNonAdminUsersResponse{
			ID:            user.ID,
			Username:      user.Username,
			Name:          user.UserDetail.Name,
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
				SupervisorName: user.Supervisor.UserDetail.Name,
			}
		}
		userResponses = append(userResponses, response)
	}

	c.JSON(http.StatusOK, userResponses)
}

// type GetAllAdminUsersResponse struct {
// 	ID       uint            `json:"ID"`
// 	Username string          `json:"Username"`
// 	Name     string          `json:"Name"`
// 	Email    string          `json:"Email"`
// 	Role     models.RoleName `json:"Role"`
// }

func GetRoles(c *gin.Context) {
	var role []models.Role
	db, exists := c.Get("db")
	if !exists {
		c.JSON(500, gin.H{"error": "database connection not found"})
		return
	}

	DB := db.(*gorm.DB)

	if err := DB.Find(&role).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no roles not found"})
		return
	}

	c.JSON(http.StatusOK, role)
}

func GetRolesAdmins(c *gin.Context) {
	var role []models.Role
	db, exists := c.Get("db")
	if !exists {
		c.JSON(500, gin.H{"error": "database connection not found"})
		return
	}

	DB := db.(*gorm.DB)

	if err := DB.Model(&role).Where("name = ?", "admin").Find(&role).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no roles not found"})
		return
	}

	c.JSON(http.StatusOK, role)
}

func GetRolesNonAdmins(c *gin.Context) {
	var role []models.Role
	db, exists := c.Get("db")
	if !exists {
		c.JSON(500, gin.H{"error": "database connection not found"})
		return
	}

	DB := db.(*gorm.DB)

	if err := DB.Model(&role).Where("name <> ?", "admin").Find(&role).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no roles not found"})
		return
	}

	c.JSON(http.StatusOK, role)
}

func CreateRole(c *gin.Context) {
	var role models.Role

	db, exists := c.Get("db")
	if !exists {
		c.JSON(500, gin.H{"error": "database connection not found"})
		return
	}

	DB := db.(*gorm.DB)

	if err := c.ShouldBindJSON(&role); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload, " + err.Error()})
		return
	}

	if err := utils.Validate.Struct(role); err != nil {
		errors := utils.FormatValidationErrors(err)
		c.JSON(http.StatusBadRequest, gin.H{"errors": errors})
		return
	}

	// Check if role already exists
	if err := DB.Where("name = ? AND position = ? AND position_level = ?", role.Name, role.Position, role.PositionLevel).First(&role).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": "role already exist"})
		return
	} else {
		if err := DB.Create(&role).Error; err != nil {
			c.JSON(500, gin.H{"error": "failed to create role, " + err.Error()})
			return
		}
	}

	c.JSON(http.StatusCreated, role)
}

func UpdateRole(c *gin.Context) {
	var role models.Role
	id := c.Param("id")

	db, exists := c.Get("db")
	if !exists {
		c.JSON(500, gin.H{"error": "database connection not found"})
		return
	}

	DB := db.(*gorm.DB)

	if err := DB.First(&role, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found" + err.Error()})
		return
	}

	if err := c.ShouldBindJSON(&role); err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload untuk user"})
		return
	}

	if err := utils.Validate.Struct(role); err != nil {
		errors := utils.FormatValidationErrors(err)
		c.JSON(http.StatusBadRequest, gin.H{"errors": errors})
		return
	}

	updateData := map[string]interface{}{
		"name":           role.Name,
		"position":       role.Position,
		"position_level": role.PositionLevel,
		// Add any other fields from the 'role' struct you wish to update
	}

	if err := DB.Model(&role).Updates(updateData).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to update role: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, role)
}

func DeleteRole(c *gin.Context) {
	var role models.Role
	id := c.Param("id")

	db, exists := c.Get("db")
	if !exists {
		c.JSON(500, gin.H{"error": "database connection not found"})
		return
	}

	DB := db.(*gorm.DB)

	if err := DB.First(&role, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if err := DB.Delete(&role).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "user deleted successfully"})
}
