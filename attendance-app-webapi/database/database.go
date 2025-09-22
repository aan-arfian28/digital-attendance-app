package database

import (
	"errors"
	"log"

	"attendance-app/config"
	"attendance-app/models"
	"attendance-app/utils"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() *gorm.DB {

	dsn := config.DBURL()

	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}



	//Create Admin if not exist
	var admin models.User
	if err := DB.Where("username = ?", "admin").First(&admin).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			CreateUser(models.User{
				Username: "admin",
				Password: "admin",
				Email:    "admin@school.com",
				Role:      &models.Role{Name: "admin", Position: "Admin", PositionLevel: 0},
			})
		}
	}

	return DB
}

// CreateUser adds a new user to the database
func CreateUser(user models.User) (models.User, error) {
	// Hash the password before saving
	hashedPassword, err := utils.HashPassword(user.Password)
	if err != nil {
		log.Printf("Error hashing password for user %s: %v", user.Username, err)
		return models.User{}, err
	}
	user.Password = hashedPassword

	// Validate supervisor
	if user.SupervisorID != nil {
		var supervisor models.User
		if err := DB.First(&supervisor, *user.SupervisorID).Error; err != nil {
			return models.User{}, errors.New("supervisor not found")
		}

		var userRole models.Role
		if err := DB.First(&userRole, user.RoleID).Error; err != nil {
			return models.User{}, errors.New("user role not found")
		}

		var supervisorRole models.Role
		if err := DB.First(&supervisorRole, supervisor.RoleID).Error; err != nil {
			return models.User{}, errors.New("supervisor role not found")
		}

		if userRole.PositionLevel >= supervisorRole.PositionLevel {
			return models.User{}, errors.New("user can only be supervised by someone with a higher position level")
		}
	}

	if err := DB.Create(&user).Error; err != nil {
		return models.User{}, err
	}
	return user, nil
}
