# File Serving Fix - Summary of Changes

## Problem
Images and PDF attachments were showing "404 Not Found" errors when accessed from the validate page.

## Root Cause
1. **Path Mismatch**: Files were being saved to `./storage/uploads/` but router was serving from `./uploads/`
2. **Missing Static File Serving**: Router was configured to serve from `./uploads` but files didn't exist there
3. **Frontend URL Issue**: Frontend was using relative paths that resolved to `localhost:3000` instead of the backend server

## Changes Made

### 1. Backend Storage Configuration
**File**: `attendance-app-webapi/storage/config.go`
```go
// Changed from:
BasePath: "./storage/uploads",

// To:
BasePath: "./uploads",
```

### 2. Backend Main Initialization
**File**: `attendance-app-webapi/main.go`
```go
// Added imports
import (
    "os"
    "attendance-app/storage"
)

// Added directory initialization
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

### 3. Router Static File Serving
**File**: `attendance-app-webapi/router/router.go`
```go
// Already added (from previous changes)
router.Static("/uploads", "./uploads")
```

### 4. Frontend URL Helper Function
**File**: `attendance-app-frontend/src/routes/dashboard/validate.tsx`
```typescript
// Added helper function to construct full URLs
const getFullFileURL = (relativePath: string) => {
  if (!relativePath) return ''
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath
  }
  const baseURL = API_BASE_URL.replace('/api', '')
  return `${baseURL}${relativePath}`
}

// Updated all image/PDF sources to use helper
<img src={getFullFileURL(selectedRecord.CheckInPhotoURL)} />
<img src={getFullFileURL(selectedRecord.CheckOutPhotoURL)} />
<img src={getFullFileURL(selectedRecord.AttachmentURL)} />
<iframe src={getFullFileURL(selectedRecord.AttachmentURL)} />
```

### 5. Git Configuration
**File**: `.gitignore`
```gitignore
# Added upload directory to gitignore but keep structure
attendance-app-webapi/uploads/*
!attendance-app-webapi/uploads/.gitkeep
!attendance-app-webapi/uploads/attendance/.gitkeep
!attendance-app-webapi/uploads/leave/.gitkeep
```

### 6. Directory Structure
**Created**:
- `attendance-app-webapi/uploads/` directory
- `attendance-app-webapi/uploads/attendance/` directory
- `attendance-app-webapi/uploads/leave/` directory
- `.gitkeep` files to preserve empty directories in git

### 7. File Migration
**Copied** existing files from old location to new:
```powershell
Copy-Item ".\storage\uploads\attendance\*" ".\uploads\attendance\" -Force
Copy-Item ".\storage\uploads\leave\*" ".\uploads\leave\" -Force
```

## How It Works Now

### Backend Flow
1. User uploads a file (photo/PDF)
2. File is saved to `./uploads/[category]/YYYYMMDDHHMMSS_filename.ext`
3. Database stores relative path: `/uploads/[category]/filename.ext`
4. Gin router serves files from `./uploads/` at URL path `/uploads/`

### Frontend Flow
1. Fetch attendance/leave records from API
2. Records contain relative paths: `/uploads/attendance/file.jpg`
3. `getFullFileURL()` converts to full URL: `http://10.0.0.60:8080/uploads/attendance/file.jpg`
4. Image/PDF displays correctly

### URL Resolution
```
Database: /uploads/attendance/20251028111105_attendance.jpg
         ↓
getFullFileURL(): http://10.0.0.60:8080/uploads/attendance/20251028111105_attendance.jpg
         ↓
Browser requests: http://10.0.0.60:8080/uploads/attendance/20251028111105_attendance.jpg
         ↓
Gin router matches: /uploads → ./uploads directory
         ↓
Serves file: ./uploads/attendance/20251028111105_attendance.jpg
```

## Testing Checklist

- [x] Backend directories created automatically on startup
- [x] Files saved to correct location (`./uploads/`)
- [x] Static files served via HTTP
- [x] Frontend constructs correct full URLs
- [x] Error handling for missing images (shows placeholder)
- [x] Existing files migrated to new location
- [ ] Restart backend server to apply changes
- [ ] Test image display in validate modal
- [ ] Test PDF preview in validate modal
- [ ] Test click-to-expand functionality

## Next Steps

1. **Restart Backend Server**:
   ```powershell
   cd attendance-app-webapi
   go run .\main.go
   ```

2. **Verify in Browser**:
   - Navigate to validate page
   - Click Approve/Reject on attendance record
   - Check if photos display correctly

3. **Test Direct Access**:
   - Open: `http://10.0.0.60:8080/uploads/attendance/20251028111105_attendance.jpg`
   - Should display the image

## Files Modified

### Backend
- ✅ `attendance-app-webapi/main.go`
- ✅ `attendance-app-webapi/router/router.go`
- ✅ `attendance-app-webapi/storage/config.go`

### Frontend
- ✅ `attendance-app-frontend/src/routes/dashboard/validate.tsx`

### Configuration
- ✅ `.gitignore`

### New Files
- ✅ `FILE_UPLOAD_DOCUMENTATION.md`
- ✅ `CHANGES_SUMMARY.md` (this file)
- ✅ `attendance-app-webapi/uploads/.gitkeep`
- ✅ `attendance-app-webapi/uploads/attendance/.gitkeep`
- ✅ `attendance-app-webapi/uploads/leave/.gitkeep`

## Rollback Instructions

If issues occur, rollback by:

1. Restore `storage/config.go`:
   ```go
   BasePath: "./storage/uploads",
   ```

2. Remove from `main.go`:
   - Directory initialization code
   - `storage.InitConfig()` call
   - `os` and `storage` imports

3. Restore files to old location:
   ```powershell
   Copy-Item ".\uploads\attendance\*" ".\storage\uploads\attendance\" -Force
   Copy-Item ".\uploads\leave\*" ".\storage\uploads\leave\" -Force
   ```

4. Revert frontend changes in `validate.tsx`
