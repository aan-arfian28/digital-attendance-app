/**
 * Hook to use API client with automatic error handling
 */

import { apiClient } from '@/lib/api-client'
import { useCallback } from 'react'

export const useApiClient = () => {
    const get = useCallback(async <T,>(endpoint: string, customHeaders?: HeadersInit): Promise<T> => {
        return apiClient.get<T>(endpoint, customHeaders)
    }, [])

    const post = useCallback(async <T,>(endpoint: string, data?: unknown, customHeaders?: HeadersInit): Promise<T> => {
        return apiClient.post<T>(endpoint, data, customHeaders)
    }, [])

    const postFormData = useCallback(async <T,>(endpoint: string, formData: FormData): Promise<T> => {
        return apiClient.postFormData<T>(endpoint, formData)
    }, [])

    const put = useCallback(async <T,>(endpoint: string, data?: unknown, customHeaders?: HeadersInit): Promise<T> => {
        return apiClient.put<T>(endpoint, data, customHeaders)
    }, [])

    const del = useCallback(async <T,>(endpoint: string, customHeaders?: HeadersInit): Promise<T> => {
        return apiClient.delete<T>(endpoint, customHeaders)
    }, [])

    return {
        get,
        post,
        postFormData,
        put,
        delete: del,
    }
}
