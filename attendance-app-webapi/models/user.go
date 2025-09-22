package models

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Username     string `json:"Username" validate:"required,min=3,max=32" gorm:"not null"`
	Password     string `json:"Password" validate:"required,min=8,max=72" gorm:"not null"`
	Email        string `json:"Email" validate:"required,email"`
	RoleID       uint
	Role         *Role `json:"Role" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	SupervisorID *uint `json:"SupervisorID,omitempty"`
	Supervisor   *User `gorm:"foreignKey:SupervisorID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`

	UserDetail UserDetail `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}

type Role struct {
	gorm.Model
	Name          string `json:"Name" validate:"required" gorm:"not null"`
	Position      string `json:"Position" validate:"required" gorm:"type:varchar(255);uniqueIndex:idx_name_position,priority:1"`
	PositionLevel uint   `json:"PositionLevel" validate:"required,gte=1" gorm:"uniqueIndex:idx_name_position,priority:2"`
}

type UserDetail struct {
	gorm.Model
	UserID uint   `gorm:"not null"`
	Name   string `json:"Name"`
}
