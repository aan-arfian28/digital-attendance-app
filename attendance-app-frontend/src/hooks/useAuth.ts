import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authService, tokenStorage } from '@/services/auth'
import type { LoginRequest } from '@/types/auth'

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