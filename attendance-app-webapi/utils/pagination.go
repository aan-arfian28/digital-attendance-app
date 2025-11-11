package utils

import (
	"math"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PaginationParams struct {
	Page      int
	PageSize  int
	Search    string
	SortBy    string
	SortOrder string
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Page       int         `json:"page"`
	PageSize   int         `json:"pageSize"`
	TotalRows  int64       `json:"totalRows"`
	TotalPages int         `json:"totalPages"`
}

func GetPaginationParams(c *gin.Context) PaginationParams {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	search := c.Query("search")
	sortBy := c.DefaultQuery("sortBy", "id")
	sortOrder := c.DefaultQuery("sortOrder", "desc")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}

	return PaginationParams{
		Page:      page,
		PageSize:  pageSize,
		Search:    search,
		SortBy:    sortBy,
		SortOrder: sortOrder,
	}
}

func ApplyPagination(db *gorm.DB, params PaginationParams) *gorm.DB {
	offset := (params.Page - 1) * params.PageSize
	orderClause := params.SortBy + " " + params.SortOrder
	return db.Offset(offset).Limit(params.PageSize).Order(orderClause)
}

func BuildPaginatedResponse(data interface{}, totalRows int64, params PaginationParams) PaginatedResponse {
	totalPages := int(math.Ceil(float64(totalRows) / float64(params.PageSize)))

	return PaginatedResponse{
		Data:       data,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalRows:  totalRows,
		TotalPages: totalPages,
	}
}
