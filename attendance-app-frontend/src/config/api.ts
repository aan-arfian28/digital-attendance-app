// API Configuration
export const API_CONFIG = {
    BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
} as const

// API Endpoints
export const API_ENDPOINTS = {
    LOGIN: '/login',
    LOGOUT: '/admin/logout',
    USERS: '/admin/users',
    ROLES: '/admin/users/roles',
    SUBORDINATES: '/admin/users/subordinates',
} as const

// Helper function to build full API URL
export const buildApiUrl = (endpoint: string): string => {
    return `${API_CONFIG.BASE_URL}${endpoint}`
}