# 🚀 Quick Start Guide - File Serving Fix

## ✅ Changes Applied

All necessary changes have been made to fix the image/PDF serving issue:

### Backend Changes
- ✅ Storage configuration updated to use `./uploads` directory
- ✅ Main.go now auto-creates upload directories on startup
- ✅ Router configured to serve static files from `/uploads`
- ✅ Existing files migrated to new location

### Frontend Changes
- ✅ URL helper function added to construct full file URLs
- ✅ All image and PDF sources updated to use full URLs
- ✅ Error handling added for missing images

## 🎯 What You Need to Do Now

### 1. Restart Backend Server

Open PowerShell in the project root and run:

```powershell
cd attendance-app-webapi
go run .\main.go
```

You should see:
```
Upload directories initialized
Server starting on localhost:8080 ...
```

### 2. Test File Access

Open your browser and test direct file access:

```
http://10.0.0.60:8080/uploads/attendance/20251028111105_attendance.jpg
```

You should see the image displayed.

### 3. Test in Application

1. **Login** to the application
2. Navigate to **Validate** page
3. Click **Approve** or **Reject** on any attendance record
4. **Check** if photos display in the modal
5. Try **clicking** on images to open them in a new tab

## 🔍 Verification Checklist

- [ ] Backend server starts without errors
- [ ] Direct URL access works (`http://10.0.0.60:8080/uploads/attendance/[filename]`)
- [ ] Images display in validate modal
- [ ] Click-to-expand works for images
- [ ] PDF preview works in iframe
- [ ] "Open in New Tab" button works for PDFs
- [ ] Missing images show placeholder instead of broken image icon

## 📁 File Structure

```
attendance-app-webapi/
├── uploads/                          ← Files served from here
│   ├── attendance/
│   │   ├── 20251028111105_attendance.jpg  ← Accessible via /uploads/attendance/...
│   │   └── ...
│   └── leave/
│       └── ...
└── main.go                           ← Auto-creates directories on startup
```

## 🌐 URL Mapping

| Database Path                  | Full URL                                            | Filesystem                      |
| ------------------------------ | --------------------------------------------------- | ------------------------------- |
| `/uploads/attendance/file.jpg` | `http://10.0.0.60:8080/uploads/attendance/file.jpg` | `./uploads/attendance/file.jpg` |
| `/uploads/leave/doc.pdf`       | `http://10.0.0.60:8080/uploads/leave/doc.pdf`       | `./uploads/leave/doc.pdf`       |

## 🐛 Troubleshooting

### Still Getting 404 Errors?

1. **Check backend is running**: Look for "Server starting on localhost:8080" message
2. **Verify files exist**: Check `attendance-app-webapi/uploads/attendance/` directory
3. **Check browser console**: Look for actual URL being requested
4. **Verify .env file**: Ensure `VITE_API_BASE_URL=http://10.0.0.60:8080/api`

### Images Not Displaying?

1. **Hard refresh**: Press Ctrl+Shift+R in browser
2. **Check network tab**: See if files are being requested from correct URL
3. **Test direct access**: Try accessing image URL directly in browser
4. **Check CORS**: Browser console should show CORS errors if blocked

### Backend Won't Start?

1. **Check port 8080**: Ensure nothing else is using port 8080
2. **Check permissions**: Ensure you have write permissions for `./uploads/`
3. **Review logs**: Look for specific error messages

## 📚 Documentation

For detailed information, see:
- `FILE_UPLOAD_DOCUMENTATION.md` - Complete technical documentation
- `CHANGES_SUMMARY.md` - Detailed list of all changes made

## 🎉 Expected Result

After restarting the backend, when you open the validate modal:

1. **Attendance records** will show check-in and check-out photos
2. **Leave requests** will show attached PDFs or images
3. Clicking on any image will **open it in a new tab**
4. PDFs will display in an **embedded iframe** with "Open in New Tab" button
5. If an image fails to load, you'll see a **gray placeholder** instead of a broken icon

## ⚡ Performance Tips

- Images are served directly from filesystem (fast)
- No authentication required for static files
- CORS is properly configured
- Browser caching is enabled

## 🔒 Security Notes

- File uploads are validated (type and size)
- Unique filenames prevent collisions
- Files are served from isolated directory
- No directory listing is exposed

---

**Ready to test?** Restart your backend server and navigate to the validate page! 🚀
