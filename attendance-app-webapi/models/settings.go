package models

import (
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
