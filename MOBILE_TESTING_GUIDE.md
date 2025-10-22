# Mobile Testing Guide - Local Network Access

This guide explains how to test the attendance app on your mobile phone using your local network.

## Problem
When accessing the frontend from your phone at `http://192.168.1.11:3000`, API requests fail with CORS errors because:
1. The frontend tries to call `localhost:8080` (which refers to the phone, not your computer)
2. CORS policy blocks requests from different origins

## Solution

### Step 1: Find Your Computer's Local IP Address

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with `192.168.x.x`)

**Mac/Linux:**
```bash
ifconfig
# or
ip addr show
```

Example: `192.168.1.11`

### Step 2: Update Backend CORS Configuration

The backend `router.go` has been updated to allow requests from local network IPs:

```go
config.AllowOrigins = []string{
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://192.168.1.11:3000",  // ⚠️ UPDATE THIS to your computer's IP
    "http://192.168.1.11:3001",
}
```

**Important:** Replace `192.168.1.11` with YOUR computer's actual IP address!

### Step 3: Create Frontend Environment File

Create a `.env` file in `attendance-app-frontend/` directory:

**For Desktop Testing:**
```bash
VITE_API_BASE_URL=http://localhost:8080/api
```

**For Mobile Testing:**
```bash
VITE_API_BASE_URL=http://192.168.1.11:8080/api
```
⚠️ Replace `192.168.1.11` with your computer's IP address!

### Step 4: Start Backend Server

```bash
cd attendance-app-webapi
go run main.go
```

The backend should be accessible at:
- From computer: `http://localhost:8080`
- From phone: `http://192.168.1.11:8080`

### Step 5: Start Frontend with Mobile Access

```bash
cd attendance-app-frontend
npm run dev -- --host
```

The `--host` flag allows external devices to access the dev server.

Output will show:
```
➜  Local:   http://localhost:3001/
➜  Network: http://192.168.1.11:3001/
```

### Step 6: Access from Mobile Phone

1. **Ensure your phone is on the same WiFi network as your computer**
2. **Open browser on phone** and go to: `http://192.168.1.11:3001/`
3. **Test the app** - login, take selfies, check location permissions

## Testing Camera and Location on Mobile

The attendance modal requires:
- **Camera Permission** - Browser will prompt for camera access
- **Location Permission** - Browser will prompt for GPS access
- **HTTPS Note:** Some browsers require HTTPS for camera/location. If issues occur, use Chrome or Firefox mobile.

## Troubleshooting

### CORS Error Still Appears
1. Verify backend `router.go` has your correct IP in `AllowOrigins`
2. Restart the backend server after changes
3. Clear browser cache on phone

### Cannot Access Frontend from Phone
1. Check firewall settings - allow port 3000/3001
2. Verify both devices are on same network
3. Try: `npm run dev -- --host 0.0.0.0`

### Backend Not Accessible from Phone
1. Backend must listen on `0.0.0.0:8080` not just `localhost:8080`
2. Check `main.go` for: `router.Run("0.0.0.0:8080")` or `router.Run(":8080")`
3. Allow port 8080 through firewall

### Camera/Location Not Working
1. Use HTTPS (or use `ngrok` for HTTPS tunnel)
2. Grant permissions when browser prompts
3. Try different mobile browser (Chrome/Firefox recommended)

## Security Notes

✅ **Safe for local testing** - Only allows connections from:
- localhost (development machine)
- Your specific local network IP

❌ **NOT for production** - This configuration:
- Exposes your backend to local network
- Should be disabled before deploying to production
- Use environment variables for production CORS settings

## Production Deployment

Before deploying, update CORS to only allow your production domain:

```go
config.AllowOrigins = []string{
    "https://yourdomain.com",
}
```

Or use environment variables:
```go
allowedOrigins := os.Getenv("ALLOWED_ORIGINS") // "https://yourdomain.com,https://www.yourdomain.com"
config.AllowOrigins = strings.Split(allowedOrigins, ",")
```
