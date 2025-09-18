package handlers

import (
	"attendance-app/blocklist"
	"attendance-app/config"
	"attendance-app/models"
	"attendance-app/utils"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

var jwtKey = []byte(config.Config("JWT_SECRET_KEY"))

// JWT Datas Template
type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

type loginPayload struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Login(c *gin.Context) {

	var payload loginPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request payload"})
		return
	}

	if err := utils.Validate.Struct(payload); err != nil {
		errors := utils.FormatValidationErrors(err)
		c.JSON(http.StatusBadRequest, gin.H{"errors": errors})
		return
	}

	log.Printf("Login Request Body: %+v", payload)

	db, _ := c.Get("db")
	conn := db.(*gorm.DB)

	var user models.User
	if err := conn.Where("username = ?", payload.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid username or password"})
		return
	}

	if !utils.CheckPasswordHash(payload.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid username or password"})
		return
	}

	jwtExpiryTime, err := time.ParseDuration(config.Config("JWT_EXP_TIME"))
	if err != nil {
		log.Fatalf("Invalid JWT_EXP_TIME configuration: %v", err)
	}

	expirationTime := time.Now().Add(jwtExpiryTime)
	claims := &Claims{
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": tokenString})
}

func Logout(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")

	jwtExpiryTime, err := time.ParseDuration(config.Config("JWT_EXP_TIME"))
	if err != nil {
		log.Fatalf("Invalid JWT_EXP_TIME configuration: %v", err)
	}

	blocklist.Add(tokenString, jwtExpiryTime)

	c.JSON(http.StatusOK, gin.H{"message": "successfully logged out"})
}
