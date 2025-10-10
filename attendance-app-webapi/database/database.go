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

	err = DB.AutoMigrate(
		&models.Location{},
		&models.Role{},
		&models.User{},
		&models.UserDetail{},
		&models.Attendance{},
		&models.LeaveRequest{},
	)

	if err != nil {
		// Jika migrasi gagal, hentikan aplikasi karena ini adalah kesalahan kritis.
		log.Fatalf("Failed to migrate database: %v", err)
	}

	//Create Admin if not exist
	var admin models.User
	if err := DB.Where("username = ?", "admin").First(&admin).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			CreateUser(models.User{
				Username: "admin",
				Password: "admin",
				Email:    "admin@school.com",
				Role:     &models.Role{Name: "admin", Position: "Admin", PositionLevel: 0},
			})
		}
	}

	return DB
}

// CreateUser adds a new user to the database
func CreateUser(user models.User) (models.User, error) {
	if user.Role != nil && user.Role.Name != "" {
		if err := DB.Where(models.Role{
			Name:          user.Role.Name,
			PositionLevel: user.Role.PositionLevel,
		}).FirstOrCreate(user.Role).Error; err != nil {
			return models.User{}, errors.New("failed to find or create role")
		}

		user.RoleID = user.Role.ID
	}

	if user.RoleID == 0 {
		return models.User{}, errors.New("user role is not specified")
	}

	hashedPassword, err := utils.HashPassword(user.Password)
	if err != nil {
		log.Printf("Error hashing password for user %s: %v", user.Username, err)
		return models.User{}, err
	}
	user.Password = hashedPassword

	// --- Step 3: Validate Supervisor (no change here) ---
	if user.SupervisorID != nil {
		// ... your existing supervisor validation logic ...
	}

	// --- Step 4: Create the User ---
	// At this point, user.RoleID is guaranteed to be a valid ID.
	if err := DB.Create(&user).Error; err != nil {
		return models.User{}, err
	}
	return user, nil
}
