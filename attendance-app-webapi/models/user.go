package models

import (
	"gorm.io/gorm"
)

// User defines the user model with all its relationships.
type User struct {
	gorm.Model
	CreatedAt string `json:"-"`
	UpdatedAt string `json:"-"`
	DeletedAt string `json:"-"`
	Username  string `json:"Username" validate:"required,min=3,max=32" gorm:"not null"`
	Password  string `json:"-" validate:"required,min=8,max=72" gorm:"not null"`
	Email     string `json:"Email" validate:"required,email"`
	RoleID    uint
	Role      *Role `json:"Role" gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`

	// Supervisor/Subordinate Relationship (Corrected)
	// The constraint is defined here as the primary direction of the relationship.
	SupervisorID *uint  `json:"SupervisorID,omitempty"`
	Supervisor   *User  `gorm:"foreignKey:SupervisorID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
	Subordinates []User `json:"Subordinates,omitempty" gorm:"foreignKey:SupervisorID;references:ID;"` // No constraint tag here to avoid conflict

	// UserDetail Relationship (Corrected)
	// This tag only informs GORM how to join, the actual constraint is in UserDetail model.
	UserDetail UserDetail `gorm:"foreignKey:UserID"`

	// One-to-Many Relationships
	Attendances   []Attendance   `json:"Attendances,omitempty" gorm:"foreignKey:UserID"`
	LeaveRequests []LeaveRequest `json:"LeaveRequests,omitempty" gorm:"foreignKey:UserID"`
}

// UserDetail stores additional information about the user. (Corrected)
type UserDetail struct {
	gorm.Model
	CreatedAt string `json:"-"`
	UpdatedAt string `json:"-"`
	DeletedAt string `json:"-"`
	// The 'unique' tag enforces the one-to-one relationship at the database level.
	UserID uint   `gorm:"not null;unique"`
	Name   string `json:"Name"`

	// The constraint is now defined explicitly and only here.
	User *User `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}

type RoleName string

const (
	RoleAdmin RoleName = "admin"
	RoleUser  RoleName = "user"
)

// Role defines the user's role and position level.
type Role struct {
	gorm.Model
	CreatedAt     string   `json:"-"`
	UpdatedAt     string   `json:"-"`
	DeletedAt     string   `json:"-"`
	Name          RoleName `json:"Name" validate:"required" gorm:"type:varchar(255);not null;check:name IN ('user', 'admin')""`
	Position      string   `json:"Position" validate:"required" gorm:"type:varchar(255);unique"`
	PositionLevel uint     `json:"PositionLevel" validate:"gte=0"`
}
