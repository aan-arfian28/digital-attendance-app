import { useQuery } from '@tanstack/react-query'
import { authService, tokenStorage } from '@/services/auth'
import { useUserData } from '@/hooks/useUserData'
import { useAuth } from '@/hooks/useAuth'

export const useSubordinates = () => {
    const token = tokenStorage.get()
    const { userId, isLoading: userLoading } = useUserData()
    const { isAuthenticated, isLoading: authLoading } = useAuth()

    const query = useQuery({
        queryKey: ['subordinates', userId, isAuthenticated], // Include auth state for better cache management
        queryFn: async () => {
            if (!token) throw new Error('No token available')
            console.log('Fetching subordinates for user:', userId)
            const result = await authService.getSubordinates(token)
            console.log('Subordinates response:', result)
            return result
        },
        enabled: !!token && !!userId && isAuthenticated && !userLoading && !authLoading, // More comprehensive enabled condition
        staleTime: 30 * 1000, // Reduce to 30 seconds for even more responsive updates during login/logout
        gcTime: 0, // Don't keep cache when component unmounts (was cacheTime in older versions)
        retry: 2,
        refetchOnWindowFocus: true, // Refetch when window gains focus
        refetchOnMount: true, // Always refetch on component mount
    })

    console.log('Subordinates query state:', {
        enabled: !!token && !!userId && isAuthenticated && !userLoading && !authLoading,
        token: !!token,
        userId,
        isAuthenticated,
        userLoading,
        authLoading,
        data: query.data,
        isLoading: query.isLoading,
        error: query.error
    })

    return query
}

export const useHasSubordinates = () => {
    const { data: subordinates, isLoading, error } = useSubordinates()

    return {
        hasSubordinates: (subordinates?.length ?? 0) > 0,
        subordinatesCount: subordinates?.length ?? 0,
        subordinates,
        isLoading,
        error
    }
}