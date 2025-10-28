import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          // Don't retry on authentication errors
          if (error instanceof Error && error.message.includes('Session expired')) {
            return false
          }
          return failureCount < 3
        },
        // Reduce staleTime to 30 seconds for more responsive updates
        staleTime: 1000 * 30, // 30 seconds (was 5 minutes)
        // Cache time before garbage collection
        gcTime: 1000 * 60 * 5, // 5 minutes
        // Refetch on window focus to ensure fresh data
        refetchOnWindowFocus: true,
        // Refetch on reconnect
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
      },
    },
  })
  return {
    queryClient,
  }
}

export function Provider({
  children,
  queryClient,
}: {
  children: React.ReactNode
  queryClient: QueryClient
}) {
  const navigate = useNavigate()

  useEffect(() => {
    // Set up global unauthorized handler
    apiClient.setUnauthorizedHandler(() => {
      // Clear all queries
      queryClient.clear()
      
      // Redirect to login
      navigate({
        to: '/login',
        replace: true,
      })
    })
  }, [navigate, queryClient])

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
