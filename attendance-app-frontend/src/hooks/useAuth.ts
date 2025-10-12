import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { authService, tokenStorage } from '@/services/auth'
import type { LoginRequest } from '@/types/auth'

// Hook to check if user is authenticated
export const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(true)

    useEffect(() => {
        const checkAuth = () => {
            const token = tokenStorage.get()
            setIsAuthenticated(!!token)
            setIsLoading(false)
        }

        checkAuth()

        // Listen for storage changes (e.g., logout in another tab)
        const handleStorageChange = () => {
            checkAuth()
        }

        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
    }, [])

    return { isAuthenticated, isLoading }
}

// Hook to require authentication
export const useRequireAuth = () => {
    const navigate = useNavigate()
    const { isAuthenticated, isLoading } = useAuth()

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate({
                to: '/login',
                replace: true
            })
        }
    }, [isAuthenticated, isLoading, navigate])

    return { isAuthenticated, isLoading }
}

export const useLogin = () => {
    const navigate = useNavigate()

    return useMutation({
        mutationFn: (credentials: LoginRequest) => authService.login(credentials),
        onSuccess: (data) => {
            // Save token to localStorage
            tokenStorage.set(data.token)

            // Navigate to dashboard
            navigate({
                to: '/dashboard',
                replace: true
            })
        },
        onError: (error) => {
            console.error('Login failed:', error)
        },
    })
}

export const useLogout = () => {
    const navigate = useNavigate()

    return useMutation({
        mutationFn: () => {
            const token = tokenStorage.get()
            if (!token) throw new Error('No token found')
            return authService.logout(token)
        },
        onSuccess: () => {
            // Remove token from localStorage
            tokenStorage.remove()

            // Navigate to login
            navigate({
                to: '/login',
                replace: true
            })
        },
        onError: (error) => {
            console.error('Logout failed:', error)
            // Even if logout fails, clear local token and redirect
            tokenStorage.remove()
            navigate({
                to: '/login',
                replace: true
            })
        },
    })
}