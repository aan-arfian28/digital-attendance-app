# User Data Management System

This document explains how to use the user data management system in the Digital Attendance App.

## Overview

The system provides global access to logged-in user data across all components and pages in the application. It automatically fetches and caches user profile information after login and makes it available through convenient hooks.

## Features

- ✅ **Global User State**: Access user data from any component
- ✅ **Automatic Fetching**: User profile is fetched after login
- ✅ **Persistent Storage**: User data persists across browser sessions
- ✅ **Permission Helpers**: Built-in role and permission checking
- ✅ **Type Safety**: Full TypeScript support
- ✅ **Loading States**: Proper loading indicators during data fetching

## Available User Data

The system provides access to the following user information:

### Basic Information
- `userId`: User's unique ID
- `username`: User's login username
- `name`: User's display name
- `email`: User's email address

### Role Information
- `roleId`: Role's unique ID
- `roleName`: Role name (`admin` | `employee` | `supervisor` | `manager`)
- `rolePosition`: Position title
- `roleLevel`: Position level (higher = more authority)

### Supervisor Information
- `supervisorId`: Supervisor's user ID (if applicable)
- `supervisorName`: Supervisor's display name

### Permission Helpers
- `isAdmin`: Boolean - is user an admin
- `isEmployee`: Boolean - is user an employee
- `isSupervisor`: Boolean - is user a supervisor
- `isManager`: Boolean - is user a manager
- `canManageUsers`: Boolean - can user manage other users
- `hasRole(role)`: Function - check if user has specific role
- `hasMinimumLevel(level)`: Function - check if user has minimum authority level

### Display Helpers
- `displayName`: Best available display name (Name → Username → 'User')
- `initials`: User's initials for avatars

## Usage Examples

### Basic Usage in Components

```tsx
import { useUserData } from '@/hooks/useUserData'

function MyComponent() {
  const { displayName, roleName, isAdmin } = useUserData()

  return (
    <div>
      <h1>Welcome, {displayName}!</h1>
      <p>Role: {roleName}</p>
      {isAdmin && <p>You have admin privileges</p>}
    </div>
  )
}
```

### Permission-Based UI

```tsx
import { useUserData } from '@/hooks/useUserData'

function UserManagementPage() {
  const { canManageUsers, roleName } = useUserData()

  return (
    <div>
      <h1>User Management</h1>
      
      {canManageUsers ? (
        <div>
          <button>Add User</button>
          <button>Edit Users</button>
        </div>
      ) : (
        <p>You don't have permission to manage users.</p>
      )}
    </div>
  )
}
```

### Role-Specific Content

```tsx
import { useUserData } from '@/hooks/useUserData'

function Dashboard() {
  const { hasRole, hasMinimumLevel } = useUserData()

  return (
    <div>
      {hasRole('admin') && (
        <AdminPanel />
      )}
      
      {hasMinimumLevel(5) && (
        <ManagerTools />
      )}
    </div>
  )
}
```

### Access Raw User Object

```tsx
import { useUserData } from '@/hooks/useUserData'

function UserProfile() {
  const { user, refreshUser } = useUserData()

  if (!user) return <div>Loading...</div>

  return (
    <div>
      <h2>{user.UserDetail.Name}</h2>
      <p>Email: {user.Email}</p>
      <p>Role: {user.Role.Name}</p>
      <p>Position: {user.Role.Position}</p>
      <p>Level: {user.Role.PositionLevel}</p>
      
      {user.Supervisor && (
        <p>Supervisor: {user.Supervisor.SupervisorName}</p>
      )}
      
      <button onClick={refreshUser}>
        Refresh Profile
      </button>
    </div>
  )
}
```

### Loading States

```tsx
import { useUserData } from '@/hooks/useUserData'

function MyComponent() {
  const { user, isLoading, displayName } = useUserData()

  if (isLoading) {
    return <div>Loading user data...</div>
  }

  if (!user) {
    return <div>No user data available</div>
  }

  return (
    <div>Welcome, {displayName}!</div>
  )
}
```

## System Architecture

### Components Overview

1. **UserContext (`/src/contexts/UserContext.tsx`)**
   - Provides the user context and state management
   - Handles initialization, fetching, and caching

2. **useUserData Hook (`/src/hooks/useUserData.ts`)**
   - Convenient hook with getters and permission helpers
   - Main interface for accessing user data

3. **Auth Service (`/src/services/auth.ts`)**
   - Handles API calls for authentication and user profile
   - Manages token and user data storage

4. **Types (`/src/types/auth.ts`)**
   - TypeScript interfaces for user data and roles
   - Ensures type safety across the application

### Data Flow

1. **Login** → Token saved → User profile fetched → Data cached
2. **App Load** → Check token → Load cached data → Refresh if needed
3. **Component Use** → Access via hook → Real-time data available
4. **Logout** → Clear token → Clear user data → Redirect to login

## Type Definitions

```typescript
// User Profile Structure
interface UserProfile {
  ID: number
  Username: string
  Email: string
  SupervisorID?: number
  Role: {
    ID: number
    Name: 'admin' | 'employee' | 'supervisor' | 'manager'
    Position: string
    PositionLevel: number
  }
  UserDetail: {
    Name: string
  }
  Supervisor?: {
    SupervisorID: number
    SupervisorName: string
  }
}
```

## Configuration

The system is automatically configured and initialized in the router setup:

```tsx
// router.tsx
<TanstackQuery.Provider>
  <UserProvider>
    {props.children}
  </UserProvider>
</TanstackQuery.Provider>
```

## Best Practices

1. **Use Permission Helpers**: Instead of checking `user.Role.Name === 'admin'`, use `isAdmin` or `hasRole('admin')`

2. **Handle Loading States**: Always check `isLoading` when the component first renders

3. **Fallback Values**: Use `displayName` instead of accessing nested properties directly

4. **Type Safety**: Import types from the hook: `import type { UserProfile, RoleName } from '@/hooks/useUserData'`

5. **Refresh When Needed**: Use `refreshUser()` after operations that might change user data

## API Integration

The system automatically calls the following API endpoints:

- `POST /api/login` - Login and get token
- `GET /api/admin/users/:id` - Fetch user profile
- `POST /api/admin/logout` - Logout

Make sure these endpoints are available and return the expected data format.

## Troubleshooting

### User Data Not Loading
- Check if token exists in localStorage (`auth_token`)
- Verify API endpoints are accessible
- Check browser console for error messages

### Permission Issues
- Verify user has correct role in database
- Check if role levels are set correctly
- Ensure role names match the expected values

### Type Errors
- Import types from the correct location
- Use the provided interfaces for type safety
- Check that API response matches expected format