package router

import (
	"attendance-app/handlers"
	UserManagement "attendance-app/handlers/userManagement"
	"attendance-app/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRouter(DB *gorm.DB) *gin.Engine {
	router := gin.Default()

	api := router.Group("/api")
	api.Use(middleware.DBMiddleware(DB))
	api.Use(middleware.XSSProtection())
	{
		api.POST("/login", handlers.Login)

		// Authenticated routes
		auth := api.Group("/admin")
		auth.Use(middleware.AuthMiddleware())
		{
			auth.POST("/logout", handlers.Logout)
			users := auth.Group("/users")
			{
				users.POST("/", UserManagement.CreateUser)
				users.GET("/:id", UserManagement.GetUser)
				users.PUT("/:id", UserManagement.UpdateUser)
				users.DELETE("/:id", UserManagement.DeleteUser)
				users.GET("/admins", UserManagement.GetAllAdminUsers)
				users.GET("/non-admins", UserManagement.GetAllNonAdminUsers)
			}
		}
	}
	return router
}
