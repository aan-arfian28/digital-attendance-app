package docs

// Response structures for API documentation

// ErrorResponse represents a standard error response
type ErrorResponse struct {
	Error string `json:"error" example:"Error message description"`
}

// ValidationErrorResponse represents validation error details
type ValidationErrorResponse struct {
	Errors map[string]string `json:"errors" example:"{\"field\":\"validation error message\"}"`
}

// MessageResponse represents a simple message response
type MessageResponse struct {
	Message string `json:"message" example:"Operation completed successfully"`
}

// ListResponse represents a paginated list response
type ListResponse struct {
	Data       interface{} `json:"data"`
	TotalItems int64      `json:"total_items" example:"100"`
	Page       int        `json:"page" example:"1"`
	PageSize   int        `json:"page_size" example:"10"`
}