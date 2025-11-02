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

// Role Types
export type RoleName = 'admin' | 'employee' | 'supervisor' | 'manager'

export interface Role {
    ID: number
    Name: RoleName
    Position: string
    PositionLevel: number
}

export interface UserDetail {
    Name: string
}

export interface Supervisor {
    SupervisorID: number
    SupervisorName: string
}

// Complete User Interface
export interface User {
    ID: number
    Username: string
    Email: string
    SupervisorID?: number
    Role: Role
    UserDetail: UserDetail
    Supervisor?: Supervisor
}

// User Profile Response (what we get from API)
export interface UserProfile {
    ID: number
    Username: string
    Email: string
    SupervisorID?: number
    Role: Role
    UserDetail: UserDetail
    Supervisor?: Supervisor
}