import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
const COMPANY_NAME_STORAGE_KEY = 'app_company_name'
const DEFAULT_COMPANY_NAME = 'ATTENDAPP'

// Helper to get auth token
const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token')
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
    }
}

// Fetch settings from API
const fetchCompanySettings = async () => {
    const response = await fetch(`${API_BASE_URL}/user/settings`, {
        headers: getAuthHeaders(),
    })
    if (!response.ok) throw new Error('Failed to fetch settings')
    return response.json()
}

interface UseCompanySettingsReturn {
    companyName: string
    isLoading: boolean
    isError: boolean
}

export const useCompanySettings = (): UseCompanySettingsReturn => {
    const [companyName, setCompanyName] = useState<string>(() => {
        // Initialize from localStorage
        if (typeof window !== 'undefined') {
            return localStorage.getItem(COMPANY_NAME_STORAGE_KEY) || DEFAULT_COMPANY_NAME
        }
        return DEFAULT_COMPANY_NAME
    })

    // Fetch settings from API
    const { data: settings, isLoading, isError } = useQuery({
        queryKey: ['company-settings'],
        queryFn: fetchCompanySettings,
        staleTime: 10 * 60 * 1000, // 10 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        refetchOnWindowFocus: true,
        retry: 1,
    })

    // Update localStorage when API data changes
    useEffect(() => {
        if (settings?.company_name) {
            setCompanyName(settings.company_name)
            localStorage.setItem(COMPANY_NAME_STORAGE_KEY, settings.company_name)
        }
    }, [settings?.company_name])

    return {
        companyName,
        isLoading,
        isError,
    }
}

// Helper to update company settings in localStorage
export const updateCompanyNameInStorage = (companyName: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(COMPANY_NAME_STORAGE_KEY, companyName)
    }
}
