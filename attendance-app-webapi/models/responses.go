package models

import "time"

// ErrorResponse represents a standard error response
type ErrorResponse struct {
	Error string `json:"error" example:"Error message description"`
}

// MessageResponse represents a simple message response
type MessageResponse struct {
	Message string `json:"message" example:"Operation completed successfully"`
}

// AttendanceSwagger represents attendance for Swagger (without gorm.Model to avoid parsing errors)
type AttendanceSwagger struct {
	ID                uint             `json:"ID"`
	CreatedAt         time.Time        `json:"CreatedAt"`
	UpdatedAt         time.Time        `json:"UpdatedAt"`
	UserID            uint             `json:"UserID"`
	LocationID        *uint            `json:"LocationID"`
	CheckInTime       *time.Time       `json:"CheckInTime"`
	CheckOutTime      *time.Time       `json:"CheckOutTime"`
	CheckInLatitude   float64          `json:"CheckInLatitude"`
	CheckInLongitude  float64          `json:"CheckInLongitude"`
	CheckOutLatitude  float64          `json:"CheckOutLatitude"`
	CheckOutLongitude float64          `json:"CheckOutLongitude"`
	CheckInPhotoURL   string           `json:"CheckInPhotoURL"`
	CheckOutPhotoURL  string           `json:"CheckOutPhotoURL"`
	Status            AttendanceStatus `json:"Status"`
	ValidationStatus  ValidationStatus `json:"ValidationStatus"`
	ValidatorID       *uint            `json:"ValidatorID"`
	Notes             string           `json:"Notes"`
}

// UserSwagger represents user for Swagger (without gorm.Model)
type UserSwagger struct {
	ID        uint         `json:"ID"`
	CreatedAt time.Time    `json:"CreatedAt"`
	UpdatedAt time.Time    `json:"UpdatedAt"`
	Username  string       `json:"Username"`
	Email     string       `json:"Email"`
	RoleID    uint         `json:"RoleID"`
	Role      *RoleSwagger `json:"Role"`
}

// RoleSwagger represents role for Swagger (without gorm.DeletedAt)
type RoleSwagger struct {
	ID            uint      `json:"ID"`
	CreatedAt     time.Time `json:"CreatedAt"`
	UpdatedAt     time.Time `json:"UpdatedAt"`
	Name          RoleName  `json:"Name"`
	Position      string    `json:"Position"`
	PositionLevel uint      `json:"PositionLevel"`
}

// LeaveRequestSwagger represents leave request for Swagger (without gorm.Model)
type LeaveRequestSwagger struct {
	ID            uint               `json:"ID"`
	CreatedAt     time.Time          `json:"CreatedAt"`
	UpdatedAt     time.Time          `json:"UpdatedAt"`
	UserID        uint               `json:"UserID"`
	LeaveType     LeaveType          `json:"LeaveType"`
	StartDate     time.Time          `json:"StartDate"`
	EndDate       time.Time          `json:"EndDate"`
	Reason        string             `json:"Reason"`
	AttachmentURL string             `json:"AttachmentURL"`
	Status        LeaveRequestStatus `json:"Status"`
	ApproverID    *uint              `json:"ApproverID"`
	ApproverNotes string             `json:"ApproverNotes"`
}

// LocationSwagger represents location for Swagger (without gorm.Model)
type LocationSwagger struct {
	ID        uint      `json:"ID"`
	CreatedAt time.Time `json:"CreatedAt"`
	UpdatedAt time.Time `json:"UpdatedAt"`
	Name      string    `json:"Name"`
	Address   string    `json:"Address"`
	Latitude  float64   `json:"Latitude"`
	Longitude float64   `json:"Longitude"`
	Radius    uint      `json:"Radius"`
}
