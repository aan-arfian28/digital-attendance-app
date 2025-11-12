// @title Digital Attendance API
// @version 1.0
// @description API service for digital attendance system with role-based access control.
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8080
// @BasePath /api
// @schemes http

// @securityDefinitions.http BearerAuth
// @in header
// @name Authorization
// @scheme bearer
// @bearerFormat JWT
// @description Enter your JWT token in the format: Bearer {token}. For testing, you can use this admin test token (valid for 1 year): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc5MzMyODc5OX0.sKEg9JeUxDqHyD4vGwAb6pk9iLrebJfBpTJGPRnMSrY

package main

import (
	"log"
	"net/http"
	"os"

	"attendance-app/database"
	"attendance-app/router"
	"attendance-app/scheduler"
	"attendance-app/storage"

	docs "attendance-app/docs"

	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @Summary Main entry point of the application
// @Description Initializes the database, sets up routes, and starts the server
func main() {
	// Initialize uploads directory structure
	uploadDirs := []string{
		"./uploads/attendance",
		"./uploads/leave",
	}
	for _, dir := range uploadDirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Fatalf("Failed to create upload directory %s: %v", dir, err)
		}
	}
	log.Println("Upload directories initialized")

	// Initialize storage configuration
	storage.InitConfig("./uploads")

	DB := database.InitDB()

	// Initialize and start the attendance scheduler
	attendanceScheduler := scheduler.NewAttendanceScheduler(DB)
	attendanceScheduler.Start()
	defer attendanceScheduler.Stop()

	// Initialize and start the reminder scheduler (for email notifications)
	reminderScheduler := scheduler.NewReminderScheduler(DB)
	reminderScheduler.Start()
	defer reminderScheduler.Stop()

	// Set up Swagger info
	docs.SwaggerInfo.Title = "Digital Attendance API"
	docs.SwaggerInfo.Description = "API service for digital attendance system with role-based access control"
	docs.SwaggerInfo.Version = "1.0"
	docs.SwaggerInfo.Host = "localhost:8080"
	docs.SwaggerInfo.BasePath = "/api"
	docs.SwaggerInfo.Schemes = []string{"http"}

	r := router.SetupRouter(DB)

	// Add Swagger endpoint
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	log.Println("Server starting on localhost:8080 ...")
	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
