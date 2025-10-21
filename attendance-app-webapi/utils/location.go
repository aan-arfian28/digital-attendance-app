package utils

import (
	"math"
)

// CalculateDistance calculates the distance between two points on Earth using the Haversine formula
func CalculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371000 // Earth's radius in meters

	// Convert degrees to radians
	φ1 := lat1 * math.Pi / 180
	φ2 := lat2 * math.Pi / 180
	Δφ := (lat2 - lat1) * math.Pi / 180
	Δλ := (lon2 - lon1) * math.Pi / 180

	a := math.Sin(Δφ/2)*math.Sin(Δφ/2) +
		math.Cos(φ1)*math.Cos(φ2)*
			math.Sin(Δλ/2)*math.Sin(Δλ/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c // Distance in meters
}

// IsLocationValid checks if a given coordinate is within the allowed radius of a location
func IsLocationValid(userLat, userLon, locationLat, locationLon float64, radiusMeters uint) bool {
	distance := CalculateDistance(userLat, userLon, locationLat, locationLon)
	return distance <= float64(radiusMeters)
}
