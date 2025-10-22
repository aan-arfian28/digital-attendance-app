import { buildApiUrl, API_ENDPOINTS } from '@/config/api'
import type { LoginRequest, LoginResponse, UserProfile } from '@/types/auth'

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

    // Get user profile by ID
    getUserProfile: async (userId: number, token: string): Promise<UserProfile> => {
        const response = await fetch(buildApiUrl(`${API_ENDPOINTS.USERS}/${userId}`), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to fetch user profile')
        }

        return response.json()
    },

    // Get current user's profile (for non-admin users)
    getMyProfile: async (token: string): Promise<UserProfile> => {
        const response = await fetch(buildApiUrl(API_ENDPOINTS.MY_PROFILE), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to fetch profile')
        }

        return response.json()
    },

    // Get user subordinates
    getSubordinates: async (token: string): Promise<UserProfile[]> => {
        const response = await fetch(buildApiUrl(API_ENDPOINTS.SUBORDINATES), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to fetch subordinates')
        }

        return response.json()
    },

    // Submit attendance with selfie and location
    submitAttendance: async (data: {
        type: 'check-in' | 'check-out'
        photo: string
        latitude: number
        longitude: number
        accuracy?: number
    }, token?: string): Promise<void> => {
        let authToken = token || tokenStorage.get() || undefined
        if (!authToken) {
            throw new Error('Authentication token not found')
        }

        // Convert base64 photo to blob
        const base64 = data.photo.replace(/^data:image\/\w+;base64,/, '')
        const binaryString = atob(base64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }
        const photoBlob = new Blob([bytes], { type: 'image/jpeg' })

        // Create form data
        const formData = new FormData()
        formData.append('type', data.type)
        formData.append('photo', photoBlob, 'attendance.jpg')
        formData.append('latitude', data.latitude.toString())
        formData.append('longitude', data.longitude.toString())
        if (data.accuracy) {
            formData.append('accuracy', data.accuracy.toString())
        }

        const endpoint = data.type === 'check-in'
            ? API_ENDPOINTS.ATTENDANCE_CHECKIN
            : API_ENDPOINTS.ATTENDANCE_CHECKOUT

        const response = await fetch(buildApiUrl(endpoint), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
            body: formData,
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to submit attendance' }))
            throw new Error(errorData.error || 'Failed to submit attendance')
        }
    },

    // Submit leave request
    submitLeaveRequest: async (data: {
        leaveType: 'SICK' | 'PERMIT'
        startDate: string
        endDate: string
        reason: string
        attachment: File
    }, token?: string): Promise<void> => {
        let authToken = token || tokenStorage.get() || undefined
        if (!authToken) {
            throw new Error('Authentication token not found')
        }

        // Create form data
        const formData = new FormData()
        formData.append('leaveType', data.leaveType)
        formData.append('startDate', data.startDate)
        formData.append('endDate', data.endDate)
        formData.append('reason', data.reason)
        formData.append('attachment', data.attachment)

        const response = await fetch(buildApiUrl(API_ENDPOINTS.LEAVE_SUBMIT), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
            body: formData,
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to submit leave request' }))
            throw new Error(errorData.error || 'Failed to submit leave request')
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

// User data management
export const userStorage = {
    set: (user: UserProfile) => {
        localStorage.setItem('user_data', JSON.stringify(user))
    },

    get: (): UserProfile | null => {
        const userData = localStorage.getItem('user_data')
        return userData ? JSON.parse(userData) : null
    },

    remove: () => {
        localStorage.removeItem('user_data')
    },
}

// JWT token decoder utility
export const decodeJWT = (token: string): { id: number; username: string } | null => {
    try {
        const payload = token.split('.')[1]
        const decoded = JSON.parse(atob(payload))
        return {
            id: decoded.id,
            username: decoded.username
        }
    } catch (error) {
        console.error('Failed to decode JWT:', error)
        return null
    }
}