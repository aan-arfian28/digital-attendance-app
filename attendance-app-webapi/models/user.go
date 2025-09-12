package models

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Username     string `json:"username" validate:"required,min=3,max=32" gorm:"not null"`
	Password     string `json:"password" validate:"required,min=8,max=72" gorm:"not null"`
	Email        string `json:"email" validate:"required,email"`
	RoleID       uint
	Role         *Role `json:"role" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	SupervisorID *uint     `json:"supervisor_id,omitempty"`
	Supervisor   *User     `gorm:"foreignKey:SupervisorID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`

	UserDetail UserDetail `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}

type Role struct {
	gorm.Model
	Name          string `json:"name" validate:"required" gorm:"not null;unique"`
	Position      string `json:"position" validate:"required" gorm:"type:varchar(255);uniqueIndex:idx_name_position,priority:1"`
	PositionLevel uint   `json:"position_level" validate:"required,gte=1" gorm:"uniqueIndex:idx_name_position,priority:2"`
}

type UserDetail struct {
	gorm.Model
	UserID uint `gorm:"not null"`
	Name   string
}
