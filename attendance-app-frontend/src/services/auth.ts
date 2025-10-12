import { buildApiUrl, API_ENDPOINTS } from '@/config/api'
import type { LoginRequest, LoginResponse } from '@/types/auth'

// Auth Service
export const authService = {
    login: async (credentials: LoginRequest): Promise<LoginResponse> => {
        const response = await fetch(buildApiUrl(API_ENDPOINTS.LOGIN), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error ? errorData.error : 'Login failed')
        }

        return response.json()
    },

    logout: async (token: string): Promise<void> => {
        const response = await fetch(buildApiUrl(API_ENDPOINTS.LOGOUT), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Logout failed')
        }
    },
}

// Token management
export const tokenStorage = {
    set: (token: string) => {
        localStorage.setItem('auth_token', token)
    },

    get: (): string | null => {
        return localStorage.getItem('auth_token')
    },

    remove: () => {
        localStorage.removeItem('auth_token')
    },
}