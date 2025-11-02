package storage

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type FileStorage interface {
	Save(file *multipart.FileHeader, folder string) (string, error)
	Delete(path string) error
	ValidateFileType(filename string, allowedTypes []string) error
	ValidateFileSize(size int64, maxSize int64) error
}

type LocalStorage struct {
	BasePath    string
	MaxFileSize int64
}

func NewLocalStorage(basePath string) *LocalStorage {
	return &LocalStorage{
		BasePath:    basePath,
		MaxFileSize: 5 * 1024 * 1024, // 5MB default max size
	}
}

func (ls *LocalStorage) Save(file *multipart.FileHeader, folder string) (string, error) {
	// Generate unique filename with timestamp and original extension
	ext := filepath.Ext(file.Filename)
	timestamp := time.Now().Format("20060102150405")
	filename := fmt.Sprintf("%s_%s%s", timestamp, strings.TrimSuffix(file.Filename, ext), ext)

	// Create folder if not exists
	fullPath := filepath.Join(ls.BasePath, folder)
	if err := os.MkdirAll(fullPath, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	// Open source file
	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer src.Close()

	// Create destination file
	dst, err := os.Create(filepath.Join(fullPath, filename))
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	// Copy file content
	if _, err = io.Copy(dst, src); err != nil {
		return "", fmt.Errorf("failed to copy file: %w", err)
	}

	// Return the relative path
	return filepath.Join("/uploads", folder, filename), nil
}

func (ls *LocalStorage) Delete(path string) error {
	// Remove /uploads prefix from path
	path = strings.TrimPrefix(path, "/uploads")
	fullPath := filepath.Join(ls.BasePath, path)

	if err := os.Remove(fullPath); err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}
	return nil
}

func (ls *LocalStorage) ValidateFileType(filename string, allowedTypes []string) error {
	ext := strings.ToLower(filepath.Ext(filename))
	for _, allowedType := range allowedTypes {
		if ext == strings.ToLower(allowedType) {
			return nil
		}
	}
	return fmt.Errorf("file type %s not allowed. Allowed types: %s", ext, strings.Join(allowedTypes, ", "))
}

func (ls *LocalStorage) ValidateFileSize(size int64, maxSize int64) error {
	if size > maxSize {
		return fmt.Errorf("file size exceeds maximum allowed size of %d MB", maxSize/1024/1024)
	}
	return nil
}
