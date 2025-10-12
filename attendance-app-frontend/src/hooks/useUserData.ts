import { useUser } from '@/contexts/UserContext'
import type { UserProfile, RoleName } from '@/types/auth'

// Hook to get user data with convenient getters
export const useUserData = () => {
    const { user, isLoading, refreshUser, clearUser } = useUser()

    return {
        // Raw user data
        user,
        isLoading,
        refreshUser,
        clearUser,

        // Convenient getters
        userId: user?.ID,
        username: user?.Username,
        name: user?.UserDetail?.Name,
        email: user?.Email,
        roleId: user?.Role?.ID,
        roleName: user?.Role?.Name as RoleName | undefined,
        rolePosition: user?.Role?.Position,
        roleLevel: user?.Role?.PositionLevel,
        supervisorId: user?.SupervisorID,
        supervisorName: user?.Supervisor?.SupervisorName,

        // Role checks
        isAdmin: user?.Role?.Name === 'admin',
        isEmployee: user?.Role?.Name === 'employee',
        isSupervisor: user?.Role?.Name === 'supervisor',
        isManager: user?.Role?.Name === 'manager',

        // Display helpers
        displayName: user?.UserDetail?.Name || user?.Username || 'User',
        initials: getInitials(user?.UserDetail?.Name || user?.Username),

        // Permission helpers
        hasRole: (role: RoleName) => user?.Role?.Name === role,
        hasMinimumLevel: (level: number) => (user?.Role?.PositionLevel ?? 0) >= level,
        canManageUsers: user?.Role?.Name === 'admin' || user?.Role?.Name === 'manager',
    }
}

// Helper function to get initials from name
function getInitials(name?: string): string {
    if (!name) return 'U'

    const names = name.split(' ')
    if (names.length === 1) {
        return names[0].charAt(0).toUpperCase()
    }

    return names
        .map(n => n.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase()
}

// Export user data type for convenience
export type { UserProfile, RoleName }