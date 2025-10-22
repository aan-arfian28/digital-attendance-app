import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { authService, tokenStorage, decodeJWT } from '@/services/auth'
import { useUser } from '@/contexts/UserContext'
import type { LoginRequest } from '@/types/auth'

// Hook to check if user is authenticated
export const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const { user } = useUser()

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

    return { isAuthenticated, isLoading, user }
}

// Hook to require authentication
export const useRequireAuth = () => {
    const navigate = useNavigate()
    const { isAuthenticated, isLoading, user } = useAuth()

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate({
                to: '/login',
                replace: true
            })
        }
    }, [isAuthenticated, isLoading, navigate])

    return { isAuthenticated, isLoading, user }
}

export const useLogin = () => {
    const navigate = useNavigate()
    const { setUser } = useUser()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (credentials: LoginRequest) => authService.login(credentials),
        onSuccess: async (data) => {
            try {
                // Clear all cached queries from previous user
                queryClient.clear()

                // Save token to localStorage
                tokenStorage.set(data.token)

                // Fetch user profile using the new endpoint
                try {
                    // Try the non-admin profile endpoint first
                    const userProfile = await authService.getMyProfile(data.token)
                    setUser(userProfile)
                } catch (error) {
                    // If that fails, try the admin endpoint (for backward compatibility)
                    const decodedToken = decodeJWT(data.token)
                    if (decodedToken) {
                        const userProfile = await authService.getUserProfile(decodedToken.id, data.token)
                        setUser(userProfile)
                    }
                }

                // Navigate to dashboard
                navigate({
                    to: '/dashboard',
                    replace: true
                })
            } catch (error) {
                console.error('Failed to fetch user profile after login:', error)
                // Still navigate to dashboard even if profile fetch fails
                navigate({
                    to: '/dashboard',
                    replace: true
                })
            }
        },
        onError: (error) => {
            console.error('Login failed:', error)
        },
    })
}

export const useLogout = () => {
    const navigate = useNavigate()
    const { clearUser } = useUser()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: () => {
            const token = tokenStorage.get()
            if (!token) throw new Error('No token found')
            return authService.logout(token)
        },
        onMutate: () => {
            // Immediately clear everything to prevent race conditions
            tokenStorage.remove()
            clearUser()
            // Clear all cached queries
            queryClient.clear()
        },
        onSuccess: () => {
            // Navigate to login
            navigate({
                to: '/login',
                replace: true
            })
        },
        onError: (error) => {
            console.error('Logout failed:', error)
            // Data is already cleared in onMutate, just navigate
            navigate({
                to: '/login',
                replace: true
            })
        },
    })
}