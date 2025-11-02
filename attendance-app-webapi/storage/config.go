package storage

// Configuration for file storage
type Config struct {
	BasePath     string
	MaxFileSize  int64
	AllowedTypes map[string][]string
}

// Default configuration
var DefaultConfig = Config{
	BasePath:    "./uploads",
	MaxFileSize: 5 * 1024 * 1024, // 5MB default
	AllowedTypes: map[string][]string{
		"attendance": {".jpg", ".jpeg", ".png"},
		"leave":      {".jpg", ".jpeg", ".png", ".pdf"},
	},
}

// Current configuration
var Current = DefaultConfig

// Initialize storage configuration
func InitConfig(basePath string) {
	Current.BasePath = basePath
}
