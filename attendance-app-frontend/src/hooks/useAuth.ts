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
    const { setUser, clearUser } = useUser()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (credentials: LoginRequest) => authService.login(credentials),
        onMutate: () => {
            // IMPORTANT: Clear old user data BEFORE login to prevent stale data
            console.log('🧹 Clearing old user data before login...')
            clearUser()
            tokenStorage.remove()
            queryClient.clear()
        },
        onSuccess: async (data) => {
            try {
                console.log('✅ Login successful, fetching new user profile...')

                // Save NEW token to localStorage
                tokenStorage.set(data.token)

                // Fetch NEW user profile
                try {
                    // Try the non-admin profile endpoint first
                    const userProfile = await authService.getMyProfile()
                    console.log('👤 New user profile loaded:', userProfile.Username)
                    setUser(userProfile)
                } catch (error) {
                    // If that fails, try the admin endpoint (for backward compatibility)
                    const decodedToken = decodeJWT(data.token)
                    if (decodedToken) {
                        const userProfile = await authService.getUserProfile(decodedToken.id)
                        console.log('👤 New user profile loaded (admin):', userProfile.Username)
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
                // Clear everything if profile fetch fails
                clearUser()
                tokenStorage.remove()
                throw error
            }
        },
        onError: (error) => {
            console.error('Login failed:', error)
            // Make sure everything is cleared on error
            clearUser()
            tokenStorage.remove()
            queryClient.clear()
        },
    })
}

export const useLogout = () => {
    const navigate = useNavigate()
    const { clearUser } = useUser()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: () => {
            return authService.logout()
        },
        onMutate: () => {
            console.log('🚪 Logging out, clearing all data...')
            // Immediately clear everything to prevent race conditions
            tokenStorage.remove()
            clearUser()
            // Clear all cached queries
            queryClient.clear()
        },
        onSuccess: () => {
            console.log('✅ Logout successful')
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