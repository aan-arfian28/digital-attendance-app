package router

import (
	"attendance-app/handlers"
	"attendance-app/handlers/attendance"
	emailHandler "attendance-app/handlers/email"
	"attendance-app/handlers/leave"
	"attendance-app/handlers/locations"
	"attendance-app/handlers/settings"
	UserManagement "attendance-app/handlers/userManagement"
	"attendance-app/middleware"
	"attendance-app/models"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRouter(DB *gorm.DB) *gin.Engine {
	router := gin.Default()

	// CORS Configuration - Allow local network access for mobile testing
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{
		"http://localhost:3000",
		"http://localhost:3001",
		"http://localhost:8081", // Docker frontend port
		"http://127.0.0.1:3000",
		"http://127.0.0.1:3001",
		"http://127.0.0.1:8081", // Docker frontend port
		"http://192.168.1.11:3000",
		"http://192.168.1.11:3001",
		"http://10.60.208.240:3000",
		"http://10.209.125.240:3001",
		"https://cluster-gotten-sciences-marathon.trycloudflare.com", // Cloudflared tunnel
	}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	config.AllowCredentials = true
	config.ExposeHeaders = []string{"Content-Length"}
	router.Use(cors.New(config))

	// Serve static files (photos, PDFs, etc.) from the uploads directory
	router.Static("/uploads", "./uploads")

	api := router.Group("/api")
	api.Use(middleware.DBMiddleware(DB))
	api.Use(middleware.XSSProtection())
	{
		// Health check endpoint (supports both GET and HEAD for Docker health checks)
		api.Any("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		api.POST("/login", handlers.Login)

		// Auth required routes
		auth := api.Group("")
		auth.Use(middleware.AuthMiddleware())
		{
			auth.POST("/logout", handlers.Logout)

			// Admin-only routes
			admin := auth.Group("/admin")
			admin.Use(middleware.RoleMiddleware(models.RoleAdmin))
			{
				// Settings endpoints
				adminSettings := admin.Group("/settings")
				{
					adminSettings.GET("", settings.GetAllSettings)
					adminSettings.GET("/:key", settings.GetSettingByKey)
					adminSettings.PUT("", settings.UpdateSettings)
				}

				// Locations endpoints
				adminLocations := admin.Group("/locations")
				{
					adminLocations.GET("", locations.GetAllLocations)
					adminLocations.GET("/:id", locations.GetLocationByID)
					adminLocations.POST("", locations.CreateLocation)
					adminLocations.PUT("/:id", locations.UpdateLocation)
					adminLocations.DELETE("/:id", locations.DeleteLocation)
				}

				// Email endpoints (testing and manual sending)
				adminEmail := admin.Group("/email")
				{
					adminEmail.POST("/test", emailHandler.TestEmail)
					adminEmail.POST("/send-reminder", emailHandler.SendReminderToAll)
					adminEmail.GET("/scheduler-status", emailHandler.GetSchedulerStatus)
				}

				users := admin.Group("/users")
				{
					users.POST("/", UserManagement.CreateUser)
					users.GET("/:id", UserManagement.GetUser)
					users.PUT("/:id", UserManagement.UpdateUser)
					users.DELETE("/:id", UserManagement.DeleteUser)
					users.GET("/admins", UserManagement.GetAllAdminUsers)
					users.GET("/non-admins", UserManagement.GetAllNonAdminUsers)
					users.GET("/subordinates", UserManagement.GetUserSubordinates)

					roles := users.Group("/roles")
					{
						roles.GET("", UserManagement.GetRoles)
						roles.POST("", UserManagement.CreateRole)
						roles.PUT("/:id", UserManagement.UpdateRole)
						roles.DELETE("/:id", UserManagement.DeleteRole)
						roles.GET("/admins", UserManagement.GetRolesAdmins)
						roles.GET("/non-admins", UserManagement.GetRolesNonAdmins)
					}
				}
			}

			// User routes (accessible by all authenticated users)
			user := auth.Group("/user")
			user.Use(middleware.RoleMiddleware(models.RoleUser, models.RoleAdmin))
			{
				// Profile endpoint - get current user's profile
				user.GET("/profile", UserManagement.GetMyProfile)

				// Subordinates endpoint - get current user's subordinates
				user.GET("/subordinates", UserManagement.GetUserSubordinates)

				// Attendance endpoints
				attendances := user.Group("/attendance")
				{
					attendances.POST("/check-in", attendance.CheckIn)
					attendances.POST("/check-out", attendance.CheckOut)
					attendances.GET("/my-records", attendance.GetMyAttendanceRecords)

					// Supervisor-only endpoints
					attendances.GET("/subordinates", attendance.GetSubordinateAttendanceRecords)
					attendances.PUT("/update/:id", attendance.UpdateSubordinateAttendanceRecord)
				}

				// Leave request endpoints
				leaves := user.Group("/leave")
				{
					leaves.POST("", leave.SubmitLeaveRequest)
					leaves.GET("/my-requests", leave.GetMyLeaveRequests)

					// Supervisor-only endpoints
					leaves.GET("/subordinates", leave.GetSubordinateLeaveRequests)
					leaves.PUT("/validate/:id", leave.ValidateLeaveRequest)
				}
			}
		}
	}
	return router
}
