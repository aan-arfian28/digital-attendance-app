
package utils

import (
	"fmt"
	"github.com/go-playground/validator/v10"
)

var Validate = validator.New()

// FormatValidationErrors formats the validation errors into a readable format
func FormatValidationErrors(err error) map[string]string {
	errors := make(map[string]string)
	for _, err := range err.(validator.ValidationErrors) {
		errors[err.Field()] = fmt.Sprintf("Field validation for '%s' failed on the '%s' tag", err.Field(), err.Tag())
	}
	return errors
}
