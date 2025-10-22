package utils

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// GenerateTestToken creates a long-lived JWT token for testing purposes
func GenerateTestToken(userId uint, username string) (string, error) {
	// Create a new token with admin claims that will expire in 1 year
	claims := &jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().AddDate(1, 0, 0)), // 1 year from now
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		NotBefore: jwt.NewNumericDate(time.Now()),
		Subject:   username,
		ID:        string(userId),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte("your-test-jwt-secret"))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
