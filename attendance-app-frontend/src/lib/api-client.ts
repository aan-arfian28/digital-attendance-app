/**
 * API Client utility with automatic token expiration handling
 */

import { tokenStorage, userStorage } from '@/services/auth'

class ApiClient {
    private baseURL: string
    private onUnauthorized?: () => void

    constructor(baseURL: string) {
        this.baseURL = baseURL
    }

    /**
     * Set callback for unauthorized responses (401)
     */
    setUnauthorizedHandler(handler: () => void) {
        this.onUnauthorized = handler
    }

    /**
     * Get default headers with authentication
     */
    private getHeaders(customHeaders?: HeadersInit): Record<string, string> {
        const token = tokenStorage.get()
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(customHeaders as Record<string, string>),
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        return headers
    }

    /**
     * Handle response and check for authentication errors
     */
    private async handleResponse<T>(response: Response): Promise<T> {
        // Handle 401 Unauthorized - Token expired or invalid
        if (response.status === 401) {
            // Clear stored credentials
            tokenStorage.remove()
            userStorage.remove()

            // Trigger unauthorized callback (redirect to login)
            if (this.onUnauthorized) {
                this.onUnauthorized()
            }

            throw new Error('Session expired. Please login again.')
        }

        // Handle 403 Forbidden
        if (response.status === 403) {
            throw new Error('You do not have permission to access this resource.')
        }

        // Handle other errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
            throw new Error(errorData.error || `Request failed with status ${response.status}`)
        }

        // Handle empty responses (204 No Content)
        if (response.status === 204) {
            return {} as T
        }

        return response.json()
    }

    /**
     * GET request
     */
    async get<T>(endpoint: string, customHeaders?: HeadersInit): Promise<T> {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'GET',
            headers: this.getHeaders(customHeaders),
        })

        return this.handleResponse<T>(response)
    }

    /**
     * POST request with JSON body
     */
    async post<T>(endpoint: string, data?: unknown, customHeaders?: HeadersInit): Promise<T> {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(customHeaders),
            body: data ? JSON.stringify(data) : undefined,
        })

        return this.handleResponse<T>(response)
    }

    /**
     * POST request with FormData
     */
    async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
        const token = tokenStorage.get()
        const headers: Record<string, string> = {}

        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData,
        })

        return this.handleResponse<T>(response)
    }

    /**
     * PUT request
     */
    async put<T>(endpoint: string, data?: unknown, customHeaders?: HeadersInit): Promise<T> {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(customHeaders),
            body: data ? JSON.stringify(data) : undefined,
        })

        return this.handleResponse<T>(response)
    }

    /**
     * DELETE request
     */
    async delete<T>(endpoint: string, customHeaders?: HeadersInit): Promise<T> {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders(customHeaders),
        })

        return this.handleResponse<T>(response)
    }
}

// Create and export singleton instance
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
export const apiClient = new ApiClient(API_BASE_URL)
