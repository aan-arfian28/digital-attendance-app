package models

import (
	"time"

	"gorm.io/gorm"
)

type AttendanceStatus string

const (
	OnTime AttendanceStatus = "ON_TIME"
	Late   AttendanceStatus = "LATE"
)

type ValidationStatus string

const (
	Pending       ValidationStatus = "PENDING"
	Present       ValidationStatus = "PRESENT"
	Absent        ValidationStatus = "ABSENT"
	Leave         ValidationStatus = "LEAVE"
	Rejected      ValidationStatus = "REJECTED"
	DidntCheckout ValidationStatus = "DIDNT_CHECKOUT"
)

type LeaveRequestStatus string

const (
	LeavePending  LeaveRequestStatus = "PENDING"
	LeaveApproved LeaveRequestStatus = "APPROVED"
	LeaveRejected LeaveRequestStatus = "REJECTED"
)

type LeaveType string

const (
	Sick   LeaveType = "SICK"
	Permit LeaveType = "PERMIT"
)

// Location defines a valid geographical area for attendance.
type Location struct {
	gorm.Model
	Name        string       `json:"Name" gorm:"not null"`
	Address     string       `json:"Address"`
	Latitude    float64      `json:"Latitude" gorm:"not null"`
	Longitude   float64      `json:"Longitude" gorm:"not null"`
	Radius      uint         `json:"Radius" gorm:"not null;comment:Radius in meters"`
	Attendances []Attendance `json:"Attendances,omitempty" gorm:"foreignKey:LocationID"`
}

// Attendance stores a single attendance record for a user.
type Attendance struct {
	gorm.Model
	UserID     uint     `json:"UserID" gorm:"not null;index:idx_user_date"`
	User       User     `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`
	LocationID uint     `json:"LocationID" gorm:"not null"`
	Location   Location `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	CheckInTime       *time.Time `json:"CheckInTime" gorm:"not null;index:idx_user_date"`
	CheckOutTime      *time.Time `json:"CheckOutTime"`
	CheckInLatitude   float64    `json:"CheckInLatitude" gorm:"not null"`
	CheckInLongitude  float64    `json:"CheckInLongitude" gorm:"not null"`
	CheckOutLatitude  float64    `json:"CheckOutLatitude"`
	CheckOutLongitude float64    `json:"CheckOutLongitude"`
	CheckInPhotoURL   string     `json:"CheckInPhotoURL" gorm:"not null"`
	CheckOutPhotoURL  string     `json:"CheckOutPhotoURL"`

	Status           AttendanceStatus `json:"Status" gorm:"type:varchar(20);default:'ON_TIME'"`
	ValidationStatus ValidationStatus `json:"ValidationStatus" gorm:"type:varchar(20);default:'PENDING';index"`
	ValidatorID      *uint            `json:"ValidatorID"`
	Validator        *User            `json:"Validator" gorm:"foreignKey:ValidatorID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
	Notes            string           `json:"Notes" gorm:"type:text"`
}

// LeaveRequest stores a user's request for leave.
type LeaveRequest struct {
	gorm.Model
	UserID        uint               `json:"UserID" gorm:"not null;index"`
	User          User               `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	LeaveType     LeaveType          `json:"LeaveType" gorm:"type:varchar(20);not null"`
	StartDate     time.Time          `json:"StartDate" gorm:"not null"`
	EndDate       time.Time          `json:"EndDate" gorm:"not null"`
	Reason        string             `json:"Reason" gorm:"type:text;not null"`
	AttachmentURL string             `json:"AttachmentURL"`
	Status        LeaveRequestStatus `json:"Status" gorm:"type:varchar(20);default:'PENDING';index"`
	ApproverID    *uint              `json:"ApproverID"`
	Approver      *User              `json:"Approver" gorm:"foreignKey:ApproverID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
	ApproverNotes string             `json:"ApproverNotes" gorm:"type:text"`
}
