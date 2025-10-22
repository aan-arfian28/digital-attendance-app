// API Configuration
// Automatically use the same host as the frontend for backend requests
// This allows both localhost and mobile IP access (e.g., 192.168.1.11:3001)
const getApiBaseUrl = (): string => {
    const envUrl = import.meta.env.VITE_API_BASE_URL
    if (envUrl) {
        return envUrl
    }

    // In development, use the same host but with backend port (8080)
    const hostname = window.location.hostname
    const backendPort = 8080
    return `http://${hostname}:${backendPort}/api`
}

export const API_CONFIG = {
    BASE_URL: getApiBaseUrl(),
} as const

// API Endpoints
export const API_ENDPOINTS = {
    LOGIN: '/login',
    LOGOUT: '/logout',
    USERS: '/admin/users',
    ROLES: '/admin/users/roles',
    SUBORDINATES: '/user/subordinates',
    MY_PROFILE: '/user/profile',
    ATTENDANCE_CHECKIN: '/user/attendance/check-in',
    ATTENDANCE_CHECKOUT: '/user/attendance/check-out',
} as const

// Helper function to build full API URL
export const buildApiUrl = (endpoint: string): string => {
    return `${API_CONFIG.BASE_URL}${endpoint}`
}