# File Upload and Serving Configuration

## Overview
This document explains how file uploads (photos, PDFs) are handled in the Digital Attendance application.

## Backend Configuration

### Directory Structure
```
attendance-app-webapi/
├── uploads/                    # Public uploads directory (served via HTTP)
│   ├── .gitkeep               # Keeps directory in git
│   ├── attendance/            # Attendance photos
│   │   ├── .gitkeep
│   │   └── YYYYMMDDHHMMSS_filename.jpg
│   └── leave/                 # Leave request attachments
│       ├── .gitkeep
│       └── YYYYMMDDHHMMSS_filename.pdf
└── storage/
    ├── config.go              # Storage configuration
    └── storage.go             # File handling logic
```

### Storage Configuration (`storage/config.go`)
- **BasePath**: `./uploads` - Root directory for uploaded files
- **MaxFileSize**: 5MB default limit
- **Allowed Types**:
  - Attendance: `.jpg`, `.jpeg`, `.png`
  - Leave: `.jpg`, `.jpeg`, `.png`, `.pdf`

### File Naming Convention
Files are saved with timestamp prefix to ensure uniqueness:
- Format: `YYYYMMDDHHMMSS_originalname.ext`
- Example: `20251028111105_attendance.jpg`

### URL Format
Files are accessible via HTTP at:
```
http://[backend-host]:[port]/uploads/[category]/[filename]
Example: http://10.0.0.60:8080/uploads/attendance/20251028111105_attendance.jpg
```

## Router Configuration (`router/router.go`)

Static file serving is configured using Gin's `Static` method:
```go
router.Static("/uploads", "./uploads")
```

This maps the URL path `/uploads` to the filesystem directory `./uploads`.

## Frontend Configuration

### Environment Variables (`.env`)
```properties
VITE_API_BASE_URL=http://10.0.0.60:8080/api
```

### URL Construction (`validate.tsx`)
The frontend constructs full URLs by:
1. Getting the base URL from environment: `http://10.0.0.60:8080/api`
2. Removing `/api` suffix: `http://10.0.0.60:8080`
3. Appending the relative path: `/uploads/attendance/file.jpg`
4. Result: `http://10.0.0.60:8080/uploads/attendance/file.jpg`

```typescript
const getFullFileURL = (relativePath: string) => {
  if (!relativePath) return ''
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath
  }
  const baseURL = API_BASE_URL.replace('/api', '')
  return `${baseURL}${relativePath}`
}
```

## Initialization (`main.go`)

On startup, the backend:
1. Creates upload directories if they don't exist
2. Initializes storage configuration
3. Sets up the database and routes

```go
// Initialize uploads directory structure
uploadDirs := []string{
    "./uploads/attendance",
    "./uploads/leave",
}
for _, dir := range uploadDirs {
    if err := os.MkdirAll(dir, 0755); err != nil {
        log.Fatalf("Failed to create upload directory %s: %v", dir, err)
    }
}

// Initialize storage configuration
storage.InitConfig("./uploads")
```

## Git Configuration (`.gitignore`)

Uploaded files are ignored by Git but directories are preserved:
```gitignore
# Uploaded files (photos, PDFs)
attendance-app-webapi/uploads/*
!attendance-app-webapi/uploads/.gitkeep
!attendance-app-webapi/uploads/attendance/.gitkeep
!attendance-app-webapi/uploads/leave/.gitkeep
```

## CORS Configuration

The backend allows cross-origin requests from the frontend:
```go
config.AllowOrigins = []string{
    "http://localhost:3000",
    "http://10.0.0.60:3000",
    // ... other origins
}
```

## Security Considerations

1. **File Type Validation**: Only allowed file types can be uploaded
2. **File Size Limits**: Maximum 5MB per file
3. **Unique Filenames**: Timestamps prevent filename collisions
4. **Directory Isolation**: Files are organized by category (attendance/leave)

## Troubleshooting

### Images Not Loading (404 Error)

**Symptom**: Browser shows 404 when accessing image URLs

**Possible Causes**:
1. Backend not running
2. Files in wrong directory (`storage/uploads` instead of `uploads`)
3. CORS blocking the request
4. Incorrect base URL in frontend environment

**Solutions**:
1. Restart backend server
2. Ensure files are in `./uploads/` directory
3. Check browser console for CORS errors
4. Verify `VITE_API_BASE_URL` matches backend server address

### Files Not Being Saved

**Symptom**: Upload succeeds but files don't appear

**Possible Causes**:
1. Insufficient permissions on upload directory
2. Wrong BasePath configuration
3. Disk space full

**Solutions**:
1. Check directory permissions (should be 0755)
2. Verify `storage.Current.BasePath` is set to `./uploads`
3. Check available disk space

## Migration from Old Structure

If you have files in the old `storage/uploads/` directory:

```powershell
# PowerShell command to copy files
cd attendance-app-webapi
Copy-Item ".\storage\uploads\attendance\*" ".\uploads\attendance\" -Force
Copy-Item ".\storage\uploads\leave\*" ".\uploads\leave\" -Force
```

## Testing

1. **Test File Upload**:
   - Check-in with photo via mobile app
   - Verify file appears in `./uploads/attendance/`

2. **Test File Access**:
   - Open browser
   - Navigate to: `http://[backend]:8080/uploads/attendance/[filename]`
   - Image should display

3. **Test in Validate Modal**:
   - Log in as supervisor
   - Navigate to Validate page
   - Click Approve/Reject on attendance record
   - Photos should display in modal

## Best Practices

1. **Regular Backups**: Backup `./uploads/` directory regularly
2. **Cleanup Old Files**: Implement retention policy for old files
3. **Monitor Disk Space**: Set up alerts for low disk space
4. **Image Optimization**: Consider compressing images before storage
5. **CDN (Production)**: Use CDN for serving static files in production
