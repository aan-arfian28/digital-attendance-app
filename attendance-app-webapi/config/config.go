package config

import (
	"fmt"
	"os"

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
