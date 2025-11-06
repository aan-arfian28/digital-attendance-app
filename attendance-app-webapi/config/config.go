package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

func Config(key string) string {
	// Try to load .env file, silently ignore if not exists
	// In Docker, env vars are provided via docker-compose.yml
	_ = godotenv.Load(".env")
	return os.Getenv(key)
}

func DBURL() string {
	return fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		Config("DB_USER"),
		Config("DB_PASSWORD"),
		Config("DB_HOST"),
		Config("DB_PORT"),
		Config("DB_NAME"),
	)
}

// SMTPConfig holds SMTP server configuration
type SMTPConfig struct {
	Host        string
	Port        int
	User        string
	Password    string
	SenderEmail string
	SenderName  string
}

// GetSMTPConfig returns SMTP configuration from environment variables
func GetSMTPConfig() SMTPConfig {
	port, _ := strconv.Atoi(Config("SMTP_PORT"))
	if port == 0 {
		port = 587 // Default SMTP port for TLS
	}

	return SMTPConfig{
		Host:        Config("SMTP_HOST"),
		Port:        port,
		User:        Config("SMTP_USER"),
		Password:    Config("SMTP_PASSWORD"),
		SenderEmail: Config("SMTP_SENDER_EMAIL"),
		SenderName:  Config("SMTP_SENDER_NAME"),
	}
}
