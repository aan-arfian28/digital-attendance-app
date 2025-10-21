package router

import (
	"attendance-app/handlers"
	"attendance-app/handlers/attendance"
	"attendance-app/handlers/leave"
	UserManagement "attendance-app/handlers/userManagement"
	"attendance-app/middleware"
	"attendance-app/models"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRouter(DB *gorm.DB) *gin.Engine {
	router := gin.Default()

	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	router.Use(cors.New(config))

	api := router.Group("/api")
	api.Use(middleware.DBMiddleware(DB))
	api.Use(middleware.XSSProtection())
	{
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
					leaves.POST("/", leave.SubmitLeaveRequest)
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
