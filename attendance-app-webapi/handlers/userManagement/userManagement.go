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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := utils.Validate.Struct(user); err != nil {
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
		log.Println(user.Role)
		if err := DB.Create(&user.Role).Error; err != nil {
			log.Println(err)
			c.JSON(500, gin.H{"error": "failed to create role"})
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

	log.Println(user)
	if err := DB.Create(&user).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to create user"})
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

func UpdateUser(c *gin.Context) {
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

	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := utils.Validate.Struct(user); err != nil {
		errors := utils.FormatValidationErrors(err)
		c.JSON(http.StatusBadRequest, gin.H{"errors": errors})
		return
	}

	if user.Password != "" {
		hashedPassword, err := utils.HashPassword(user.Password)
		if err != nil {
			errorMessage := fmt.Sprintf("Error hashing password for user %v: %v", user.UserDetail.Name, err)
			c.JSON(500, gin.H{"error": errorMessage})
			return
		}
		user.Password = hashedPassword
	}

	if err := DB.Model(&user).Updates(user).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to update user"})
		return
	}

	if user.UserDetail.Name != "" {
		var userDetail models.UserDetail
		if err := DB.Where("user_id = ?", user.ID).First(&userDetail).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "user detail not found"})
			return
		}
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

func GetAllAdminUsers(c *gin.Context) {
	var users []models.User
	db, exists := c.Get("db")
	if !exists {
		c.JSON(500, gin.H{"error": "database connection not found"})
		return
	}

	DB := db.(*gorm.DB)

	if err := DB.Joins("Role").Joins("UserDetail").Where("Role.name = ?", "admin").Find(&users).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to retrieve admin users"})
		return
	}

	c.JSON(http.StatusOK, users)
}

func GetAllNonAdminUsers(c *gin.Context) {
	var users []models.User
	db, exists := c.Get("db")
	if !exists {
		c.JSON(500, gin.H{"error": "database connection not found"})
		return
	}

	DB := db.(*gorm.DB)

	if err := DB.Joins("Role").Joins("UserDetail").Where("Role.name <> ?", "admin").Find(&users).Error; err != nil {
		c.JSON(500, gin.H{"error": "failed to retrieve non-admin users"})
		return
	}

	c.JSON(http.StatusOK, users)
}
