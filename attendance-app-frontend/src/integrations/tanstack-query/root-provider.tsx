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
          // Only retry once on other errors
          return failureCount < 1
        },
        // Optimized cache timings for production performance
        staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
        gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time
        // Disable aggressive refetching to reduce memory & network usage
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: true, // Only refetch when component mounts
      },
      mutations: {
        retry: false, // Never retry mutations
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
