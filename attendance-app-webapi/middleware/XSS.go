package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/microcosm-cc/bluemonday"
)

func XSSProtection() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
			bodyBytes, err := io.ReadAll(c.Request.Body)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
				return
			}

			var data map[string]interface{}
			if err := json.Unmarshal(bodyBytes, &data); err != nil {
				// if it's not a json, just pass it through
				c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
				c.Next()
				return
			}

			p := bluemonday.UGCPolicy()
			for key, value := range data {
				if str, ok := value.(string); ok {
					data[key] = p.Sanitize(str)
				}
			}

			sanitizedBody, err := json.Marshal(data)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to sanitize request body"})
				return
			}

			c.Request.Body = io.NopCloser(bytes.NewBuffer(sanitizedBody))
		}
		c.Next()
	}
}
