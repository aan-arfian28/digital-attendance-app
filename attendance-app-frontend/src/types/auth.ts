// Auth Types
export interface LoginRequest {
    username: string
    password: string
}

export interface LoginResponse {
    token: string
}

export interface LoginError {
    error: string
}

export interface User {
    id: number
    username: string
    // Add other user properties as needed
}