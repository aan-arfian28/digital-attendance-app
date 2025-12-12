package models

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
)

// Setting defines application configuration stored as key-value pairs.
type Setting struct {
	gorm.Model
	Key       string `json:"Key" gorm:"unique;not null;index" validate:"required,max=255"`
	Value     string `json:"Value" gorm:"type:text"`
	UpdatedBy *uint  `json:"UpdatedBy,omitempty"`
}

// TableName overrides the table name used by Setting to `settings`
func (Setting) TableName() string {
	return "settings"
}

// SchedulerConfig holds the email scheduler configuration
type SchedulerConfig struct {
	Enabled        bool
	AllowedDays    []int  // 1=Monday, 2=Tuesday, ..., 7=Sunday
	MorningTime    string // HH:MM format
	MorningEnabled bool
	EveningTime    string // HH:MM format
	EveningEnabled bool
	Timezone       string // IANA timezone (e.g., "Asia/Jakarta")
}

// GetSchedulerSettings loads scheduler configuration from database
func GetSchedulerSettings(db *gorm.DB) (*SchedulerConfig, error) {
	var settings []Setting
	keys := []string{
		"email_scheduler_enabled",
		"email_scheduler_days",
		"email_morning_time",
		"email_morning_enabled",
		"email_evening_time",
		"email_evening_enabled",
		"email_scheduler_timezone",
	}

	if err := db.Where("`key` IN ?", keys).Find(&settings).Error; err != nil {
		return nil, fmt.Errorf("failed to load scheduler settings: %w", err)
	}

	// Create a map for easy lookup
	settingsMap := make(map[string]string)
	for _, s := range settings {
		settingsMap[s.Key] = s.Value
	}

	// Parse settings with defaults
	config := &SchedulerConfig{
		Enabled:        parseBool(settingsMap["email_scheduler_enabled"], true),
		MorningTime:    getStringValue(settingsMap["email_morning_time"], "07:30"),
		MorningEnabled: parseBool(settingsMap["email_morning_enabled"], true),
		EveningTime:    getStringValue(settingsMap["email_evening_time"], "17:00"),
		EveningEnabled: parseBool(settingsMap["email_evening_enabled"], true),
		Timezone:       getStringValue(settingsMap["email_scheduler_timezone"], "Asia/Jakarta"),
	}

	// Parse allowed days
	daysStr := getStringValue(settingsMap["email_scheduler_days"], "1,2,3,4,5")
	days, err := ParseDaysOfWeek(daysStr)
	if err != nil {
		return nil, fmt.Errorf("failed to parse scheduler days: %w", err)
	}
	config.AllowedDays = days

	return config, nil
}

// ParseDaysOfWeek parses a comma-separated list of day numbers (1=Monday, 7=Sunday)
func ParseDaysOfWeek(daysString string) ([]int, error) {
	if daysString == "" {
		return []int{1, 2, 3, 4, 5}, nil // Default to weekdays
	}

	parts := strings.Split(daysString, ",")
	days := make([]int, 0, len(parts))

	for _, part := range parts {
		day, err := strconv.Atoi(strings.TrimSpace(part))
		if err != nil {
			return nil, fmt.Errorf("invalid day number: %s", part)
		}
		if day < 1 || day > 7 {
			return nil, fmt.Errorf("day number must be between 1 and 7, got: %d", day)
		}
		days = append(days, day)
	}

	return days, nil
}

// BuildCronExpression builds a cron expression from time and days
// Format: "minute hour * * days"
// Example: "30 7 * * 1-5" for 07:30 on weekdays
func BuildCronExpression(timeStr string, days []int) (string, error) {
	// Parse time (HH:MM format)
	parts := strings.Split(timeStr, ":")
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid time format, expected HH:MM, got: %s", timeStr)
	}

	hour, err := strconv.Atoi(parts[0])
	if err != nil || hour < 0 || hour > 23 {
		return "", fmt.Errorf("invalid hour: %s", parts[0])
	}

	minute, err := strconv.Atoi(parts[1])
	if err != nil || minute < 0 || minute > 59 {
		return "", fmt.Errorf("invalid minute: %s", parts[1])
	}

	// Build day part of cron expression
	dayPart := formatDaysForCron(days)

	// Build cron expression: "minute hour * * days"
	cronExpr := fmt.Sprintf("%d %d * * %s", minute, hour, dayPart)
	return cronExpr, nil
}

// formatDaysForCron formats day numbers for cron expression
// Converts Go time.Weekday (0=Sunday) to cron format (0=Sunday, 1=Monday)
// Input days are 1=Monday, 7=Sunday, so we need to adjust
func formatDaysForCron(days []int) string {
	if len(days) == 0 {
		return "*" // All days
	}

	// Convert to cron format (0=Sunday in cron, 1=Monday in our format)
	// Our format: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
	// Cron format: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
	cronDays := make([]string, len(days))
	for i, day := range days {
		cronDay := day % 7 // Convert 7 (Sunday) to 0
		cronDays[i] = strconv.Itoa(cronDay)
	}

	// Check if we can use a range (e.g., 1-5 for weekdays)
	if isConsecutive(days) {
		first := days[0] % 7
		last := days[len(days)-1] % 7
		return fmt.Sprintf("%d-%d", first, last)
	}

	// Otherwise, use comma-separated list
	return strings.Join(cronDays, ",")
}

// isConsecutive checks if days are consecutive
func isConsecutive(days []int) bool {
	if len(days) <= 1 {
		return false
	}

	for i := 1; i < len(days); i++ {
		if days[i] != days[i-1]+1 {
			return false
		}
	}
	return true
}

// IsTodayAllowed checks if today is in the allowed days list
func (c *SchedulerConfig) IsTodayAllowed() bool {
	today := time.Now().Weekday()
	// Convert Go Weekday (0=Sunday) to our format (1=Monday, 7=Sunday)
	dayNum := int(today)
	if dayNum == 0 {
		dayNum = 7 // Sunday
	}

	for _, allowedDay := range c.AllowedDays {
		if allowedDay == dayNum {
			return true
		}
	}
	return false
}

// Helper functions
func parseBool(value string, defaultValue bool) bool {
	if value == "" {
		return defaultValue
	}
	return value == "true" || value == "1" || value == "yes"
}

func getStringValue(value, defaultValue string) string {
	if value == "" {
		return defaultValue
	}
	return value
}
