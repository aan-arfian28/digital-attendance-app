package models

import (
	"time"

	"gorm.io/gorm"
)

// User defines the user model with all its relationships.
type User struct {
	gorm.Model
	Username string `json:"Username" validate:"required,min=3,max=32" gorm:"not null"`
	Password string `json:"Password" validate:"required,min=8,max=72" gorm:"not null"`
	Email    string `json:"Email" validate:"required,email"`
	Name     string `json:"Name"`
	RoleID   uint
	Role     *Role `json:"Role" gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`

	// Supervisor/Subordinate Relationship (Corrected)
	// The constraint is defined here as the primary direction of the relationship.
	SupervisorID *uint  `json:"SupervisorID,omitempty"`
	Supervisor   *User  `gorm:"foreignKey:SupervisorID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
	Subordinates []User `json:"Subordinates,omitempty" gorm:"foreignKey:SupervisorID;references:ID;"` // No constraint tag here to avoid conflict

	// One-to-Many Relationships
	Attendances   []Attendance   `json:"Attendances,omitempty" gorm:"foreignKey:UserID"`
	LeaveRequests []LeaveRequest `json:"LeaveRequests,omitempty" gorm:"foreignKey:UserID"`
}

type RoleName string

const (
	RoleAdmin RoleName = "admin"
	RoleUser  RoleName = "user"
)

// Role defines the user's role and position level.
type Role struct {
	// Manually define fields from gorm.Model to add tags
	ID        uint `gorm:"primarykey"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index;uniqueIndex:idx_role_position_deleted"` // Add index and uniqueIndex tag

	// Your fields
	Name RoleName `json:"Name" validate:"required" gorm:"type:varchar(255);not null;check:name IN ('user', 'admin')"`

	// Remove 'unique' tag and use 'uniqueIndex' instead
	Position string `json:"Position" validate:"required" gorm:"type:varchar(255);uniqueIndex:idx_role_position_deleted"`

	PositionLevel uint `json:"PositionLevel" validate:"gte=0"`
}
