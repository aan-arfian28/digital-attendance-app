# Attendance App Frontend

> A modern, type-safe attendance management system built with React, TanStack Router, and TailwindCSS.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Design System](#design-system)
- [Project Structure](#project-structure)
- [Key Patterns](#key-patterns)
- [Getting Started](#getting-started)
- [Development Guide](#development-guide)
- [API Integration](#api-integration)

---

## 🎯 Overview

The Attendance App Frontend is a Single Page Application (SPA) designed for digital attendance management. It provides different interfaces for employees, supervisors, managers, and administrators to manage attendance, leave requests, and user management.

### Key Features

- **Role-Based Access Control**: Different views and permissions for admin, supervisor, manager, and employee roles
- **Attendance Management**: Check-in/check-out functionality with validation workflows
- **Leave Request System**: Submit and manage leave requests (sick leave, permits)
- **User & Role Management**: Admin panel for managing users and roles
- **Validation Workflow**: Supervisor/manager validation of attendance records
- **Responsive Design**: Mobile-first design that works on all screen sizes

---

## 🛠 Tech Stack

### Core Framework
- **React 19.0.0**: UI library with latest features
- **TypeScript 5.7.2**: Type-safe development
- **Vite 7.1.7**: Lightning-fast build tool and dev server

### Routing & State Management
- **@tanstack/react-router 1.132.0**: Type-safe file-based routing
- **@tanstack/react-query 5.66.5**: Server state management with caching
- **React Context API**: Client-side global state (user context)

### UI Components & Styling
- **shadcn/ui**: High-quality, accessible component library (New York variant)
- **TailwindCSS 4.0.6**: Utility-first CSS framework
- **Radix UI**: Unstyled, accessible component primitives
- **Lucide React**: Beautiful icon library
- **class-variance-authority**: Type-safe variant components

### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Vitest**: Unit testing framework
- **@testing-library/react**: Component testing utilities

---

## 🏗 Architecture

### Application Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Entry Point                     │
│                      (index.html)                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Root Route (__root.tsx)                  │
│  • Meta tags, global styles, dev tools                      │
│  • Wraps entire app with providers                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Router Configuration                      │
│                      (router.tsx)                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  TanStack Query Provider                              │  │
│  │    └─ UserProvider (Context)                          │  │
│  │         └─ App Routes                                 │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Route Tree                             │
│  ┌────────────────┬───────────────┬──────────────────────┐  │
│  │  Public Routes │ Auth Required │   Role-Based Routes  │  │
│  ├────────────────┼───────────────┼──────────────────────┤  │
│  │  /             │  /dashboard   │  /dashboard/         │  │
│  │  /login        │               │  user-management     │  │
│  │  /404          │               │  role-management     │  │
│  │                │               │  settings (admin)    │  │
│  │                │               │  history (employee)  │  │
│  │                │               │  validate (super.)   │  │
│  └────────────────┴───────────────┴──────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Page Components                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  AuthGuard / RoleGuard                                │  │
│  │    └─ DashboardLayout                                 │  │
│  │         ├─ Sidebar (navigation)                       │  │
│  │         ├─ DashboardHeader (user dropdown)            │  │
│  │         └─ Page Content (dashboard/history/etc)       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### State Management Architecture

#### 1. **Server State** (TanStack Query)
- Handles all API data fetching, caching, and synchronization
- Automatic background refetching and cache invalidation
- Optimistic updates for better UX
- Located in: `src/hooks/useApiClient.ts`, individual query hooks

```typescript
// Example: Fetching attendance records
const { data, isLoading } = useQuery({
  queryKey: ['my-attendance-records'],
  queryFn: fetchMyAttendanceRecords,
  staleTime: 2 * 60 * 1000, // 2 minutes
  refetchOnWindowFocus: false,
})
```

#### 2. **Client State** (React Context)
- User authentication state
- Current user profile data
- Persisted in localStorage for session persistence
- Located in: `src/contexts/UserContext.tsx`

```typescript
// UserContext provides:
{
  user: UserProfile | null,      // Current user data
  setUser: (user) => void,        // Update user
  isLoading: boolean,             // Loading state
  refreshUser: () => Promise,     // Refresh user data
  clearUser: () => void          // Clear on logout
}
```

#### 3. **Local Component State** (useState)
- UI-specific state (modals, forms, toggles)
- Temporary data that doesn't need global access

---

## 🎨 Design System

### Color Palette

The application uses a **zinc-based color scheme** with **OKLCH color space** for better perceptual uniformity.

#### Light Mode (Default)
```css
--background: oklch(1 0 0)                      /* Pure white */
--foreground: oklch(0.141 0.005 285.823)        /* Near black */
--primary: oklch(0.21 0.006 285.885)            /* Dark zinc */
--primary-foreground: oklch(0.985 0 0)          /* White */
--accent: #428bff                                /* Brand blue */
--border: oklch(0.92 0.004 286.32)              /* Light gray */
--muted: oklch(0.967 0.001 286.375)             /* Very light gray */
```

#### Dark Mode
```css
--background: oklch(0.141 0.005 285.823)        /* Dark zinc */
--foreground: oklch(0.985 0 0)                  /* White */
--primary: oklch(0.985 0 0)                     /* White */
--primary-foreground: oklch(0.21 0.006 285.885) /* Dark zinc */
--accent: #428bff                                /* Brand blue */
```

#### Custom Dashboard Colors
```css
.dashboard-bg: white
.dashboard-border: #141414 (near black)
.dashboard-accent: #428bff (primary blue)
.dashboard-accent-hover: #3b7ee6 (darker blue)
```

### Typography

#### Font Family
```css
/* Body Text */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
             'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
             'Helvetica Neue', sans-serif;

/* Code/Monospace */
font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
```

#### Font Smoothing
- `-webkit-font-smoothing: antialiased`
- `-moz-osx-font-smoothing: grayscale`

#### Type Scale
- **Page Title**: `text-2xl font-bold` (24px)
- **Section Heading**: `text-lg font-semibold` (18px)
- **Card Title**: `text-lg font-semibold` (18px)
- **Body Text**: `text-sm` or `text-base` (14px/16px)
- **Small Text**: `text-sm` (14px)

### Spacing & Layout

#### Border Radius
```css
--radius: 0.625rem (10px) - Base radius

--radius-sm: calc(var(--radius) - 4px)  /* 6px */
--radius-md: calc(var(--radius) - 2px)  /* 8px */
--radius-lg: var(--radius)              /* 10px */
--radius-xl: calc(var(--radius) + 4px)  /* 14px */
```

**Usage**: Most components use `rounded-sm` (smaller radius) for a cleaner, more modern look with subtle roundness, components that not using `rounded-sm` should be change to use it.

#### Spacing Scale
Following TailwindCSS default spacing:
- `p-4` = 16px
- `p-6` = 24px
- `gap-2` = 8px
- `gap-4` = 16px
- `mb-6` = 24px

### Component Styling Patterns

#### 1. **Card Pattern**
```tsx
<div className="bg-white border border-gray-300 rounded-sm p-6 hover:bg-gray-50">
  {/* Card content */}
</div>
```

#### 2. **Button Pattern**
Uses Class Variance Authority (CVA) for type-safe variants:

```tsx
// Primary Button
<Button variant="default" size="default">
  Submit
</Button>

// Variants: default, destructive, outline, secondary, ghost, link
// Sizes: default, sm, lg, icon
```

#### 3. **Input Pattern**
```tsx
<Input
  className="h-10 w-full rounded-sm border border-gray-300"
  placeholder="Enter value"
/>
```

#### 4. **Layout Pattern**
```tsx
// Page Container
<div className="p-6">
  {/* Page title */}
  <div className="mb-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Title</h1>
    <p className="text-gray-600">Description</p>
  </div>

  {/* Content sections */}
  <div className="mb-8">
    {/* Section content */}
  </div>
</div>
```

### Responsive Design

#### Breakpoints (TailwindCSS defaults)
```
sm: 640px   (mobile landscape)
md: 768px   (tablet)
lg: 1024px  (desktop)
xl: 1280px  (large desktop)
2xl: 1536px (extra large)
```

#### Sidebar Behavior
- **Desktop** (`md:` and up): Toggleable sidebar (64px collapsed, 256px expanded)
- **Mobile**: Overlay sidebar with backdrop, hidden by default
- **Transition**: `transition-all duration-300 ease-in-out`

#### Grid Layouts
```tsx
// Responsive grid example (dashboard cards)
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {/* 1 column on mobile, 3 columns on desktop */}
</div>
```

---

## 📁 Project Structure

```
attendance-app-frontend/
├── public/                      # Static assets
├── src/
│   ├── components/              # React components
│   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── alert.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   └── textarea.tsx
│   │   ├── AttendanceModal.tsx  # Check-in/out modal
│   │   ├── AuthGuard.tsx        # Authentication guard
│   │   ├── DashboardHeader.tsx  # Top header with user menu
│   │   ├── DashboardLayout.tsx  # Main layout wrapper
│   │   ├── LeaveModal.tsx       # Leave request modal
│   │   ├── RoleGuard.tsx        # Role-based access guard
│   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   ├── SubordinateGuard.tsx # Subordinate access guard
│   │   └── UserDropdown.tsx     # User profile dropdown
│   │
│   ├── config/                  # Configuration files
│   ├── contexts/                # React Context providers
│   │   └── UserContext.tsx      # User state management
│   │
│   ├── data/                    # Static data/constants
│   ├── hooks/                   # Custom React hooks
│   │   ├── useApiClient.ts      # API client hook
│   │   ├── useAuth.ts           # Authentication hooks
│   │   ├── useSubordinates.ts   # Subordinate data hook
│   │   └── useUserData.ts       # User data hook
│   │
│   ├── integrations/            # Third-party integrations
│   │   └── tanstack-query/      # TanStack Query setup
│   │
│   ├── lib/                     # Utility libraries
│   │   └── utils.ts             # Utility functions (cn)
│   │
│   ├── routes/                  # File-based routes
│   │   ├── dashboard/           # Dashboard subroutes
│   │   │   ├── history.tsx
│   │   │   ├── index.tsx
│   │   │   ├── profile.tsx
│   │   │   ├── role-management.tsx
│   │   │   ├── settings.tsx
│   │   │   ├── user-management.tsx
│   │   │   └── validate.tsx
│   │   ├── __root.tsx           # Root layout
│   │   ├── 404.tsx              # Not found page
│   │   ├── dashboard.tsx        # Dashboard layout
│   │   ├── index.tsx            # Home/landing
│   │   └── login.tsx            # Login page
│   │
│   ├── services/                # API service layer
│   │   └── auth.ts              # Authentication service
│   │
│   ├── types/                   # TypeScript type definitions
│   │   └── auth.ts              # Auth-related types
│   │
│   ├── routeTree.gen.ts         # Generated route tree
│   ├── router.tsx               # Router configuration
│   └── styles.css               # Global styles
│
├── components.json              # shadcn/ui configuration
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite configuration
└── README.md                    # This file
```

### Folder Conventions

- **`components/ui/`**: Only shadcn/ui components (installed via CLI)
- **`components/`**: Custom application components
- **`routes/`**: File-based routing (automatically generates route tree)
- **`hooks/`**: Reusable React hooks
- **`services/`**: API client and external service integrations
- **`types/`**: Shared TypeScript interfaces and types
- **`lib/`**: Utility functions and helpers

---

## 🔑 Key Patterns

### 1. Component Composition Pattern

Components are built using composition for maximum reusability:

```tsx
// DashboardLayout composes Sidebar + Header + Content
<DashboardLayout onLogout={handleLogout}>
  <PageContent />
</DashboardLayout>

// Sidebar uses conditional rendering based on role
const menuItems = allMenuItems.filter(item => {
  if (item.isAdminOnly) return isAdmin
  if (item.isUserOnly) return !isAdmin
  return true
})
```

### 2. Utility-First CSS with `cn()` Helper

The `cn()` function combines `clsx` and `tailwind-merge` for dynamic class names:

```tsx
import { cn } from '@/lib/utils'

<div className={cn(
  'base-classes',
  condition && 'conditional-classes',
  { 'object-syntax': isActive }
)}>
```

**Why?**: Safely merges Tailwind classes and prevents conflicts.

### 3. Class Variance Authority (CVA)

Used for components with multiple variants:

```tsx
const buttonVariants = cva(
  "base-classes", // Base styles
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-input bg-background",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

### 4. File-Based Routing

Routes are automatically generated from the `routes/` folder structure:

```
routes/
  __root.tsx           → /
  index.tsx            → /
  login.tsx            → /login
  dashboard.tsx        → /dashboard (layout)
  dashboard/
    index.tsx          → /dashboard/
    profile.tsx        → /dashboard/profile
    history.tsx        → /dashboard/history
```

**Route Tree Generation**: Run automatically on save, generates `routeTree.gen.ts`

### 5. Authentication & Guards

#### AuthGuard
Protects routes that require authentication:

```tsx
<AuthGuard>
  <ProtectedPage />
</AuthGuard>
```

- Checks token existence and expiration
- Redirects to `/login` if unauthenticated
- Shows loading state during verification
- Monitors token expiration every 60 seconds

#### RoleGuard
Restricts access based on user role:

```tsx
<RoleGuard allowedRoles={['admin']}>
  <AdminOnlyContent />
</RoleGuard>
```

#### SubordinateGuard
Shows content only if user has subordinates:

```tsx
<SubordinateGuard>
  <ValidateAttendancePage />
</SubordinateGuard>
```

### 6. API Client Pattern

Centralized API calls using TanStack Query:

```tsx
// Define query function
const fetchMyAttendanceRecords = async () => {
  const response = await fetch(`${API_BASE_URL}/user/attendance/my-records`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch')
  return response.json()
}

// Use in component
const { data, isLoading, error } = useQuery({
  queryKey: ['my-attendance-records'],
  queryFn: fetchMyAttendanceRecords,
  staleTime: 2 * 60 * 1000,
})
```

**Benefits**:
- Automatic caching
- Background refetching
- Loading & error states
- Optimistic updates

### 7. Modal Pattern

Reusable modal components with controlled state:

```tsx
const [modalOpen, setModalOpen] = useState(false)

<AttendanceModal
  isOpen={modalOpen}
  type="check-in"
  onClose={() => setModalOpen(false)}
  onSubmit={async (data) => {
    await submitAttendance(data)
    setModalOpen(false)
  }}
/>
```

### 8. Token Storage Pattern

Secure token management with localStorage:

```tsx
// services/auth.ts
export const tokenStorage = {
  get: () => localStorage.getItem('auth_token'),
  set: (token: string) => localStorage.setItem('auth_token', token),
  remove: () => localStorage.removeItem('auth_token'),
}

// JWT decoding
export const decodeJWT = (token: string) => {
  const payload = token.split('.')[1]
  return JSON.parse(atob(payload))
}
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20.x)
- npm or pnpm (pnpm recommended)

### Installation

1. **Clone the repository**
   ```bash
   cd attendance-app-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_BASE_URL=http://localhost:8080/api
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

### Available Scripts

```bash
npm run dev          # Start dev server on port 3000
npm run build        # Build for production
npm run preview      # Preview production build
npm run serve        # Serve production build
npm run test         # Run unit tests
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run check        # Format + Lint fix
```

---

## 💻 Development Guide

### Adding New Components

#### 1. shadcn/ui Components

```bash
# Install a new shadcn component
pnpx shadcn@latest add [component-name]

# Example:
pnpx shadcn@latest add card
pnpx shadcn@latest add table
```

Components will be added to `src/components/ui/`

#### 2. Custom Components

Create in `src/components/`:

```tsx
// src/components/MyComponent.tsx
import { cn } from '@/lib/utils'

interface MyComponentProps {
  className?: string
  children: React.ReactNode
}

export default function MyComponent({ className, children }: MyComponentProps) {
  return (
    <div className={cn('base-classes', className)}>
      {children}
    </div>
  )
}
```

### Adding New Routes

1. **Create route file** in `src/routes/`:
   ```tsx
   // src/routes/dashboard/my-page.tsx
   import { createFileRoute } from '@tanstack/react-router'

   export const Route = createFileRoute('/dashboard/my-page')({
     component: MyPage,
   })

   function MyPage() {
     return <div>My Page Content</div>
   }
   ```

2. **Route tree updates automatically** on file save

3. **Add navigation link** in `Sidebar.tsx`:
   ```tsx
   const menuItems = [
     // ...
     { id: 'my-page', label: 'My Page', icon: Icon, href: '/dashboard/my-page' },
   ]
   ```

### Adding New API Endpoints

1. **Define query function**:
   ```tsx
   // Extract outside component for performance
   const fetchMyData = async () => {
     const response = await fetch(`${API_BASE_URL}/my-endpoint`, {
       headers: getAuthHeaders(),
     })
     if (!response.ok) throw new Error('Failed to fetch')
     return response.json()
   }
   ```

2. **Use in component**:
   ```tsx
   const { data, isLoading } = useQuery({
     queryKey: ['my-data'],
     queryFn: fetchMyData,
     staleTime: 2 * 60 * 1000,
   })
   ```

3. **For mutations** (POST/PUT/DELETE):
   ```tsx
   const mutation = useMutation({
     mutationFn: (data) => submitData(data),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['my-data'] })
     },
   })
   ```

### State Management Guidelines

#### When to use each:

- **TanStack Query**: Server data, API responses, cached data
- **Context**: User session, theme, global UI state
- **useState**: Component-local UI state (modals, forms, toggles)
- **useRef**: DOM references, non-reactive values

### Code Style Guidelines

#### Import Order
```tsx
// 1. React & framework imports
import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'

// 2. Third-party libraries
import { useQuery } from '@tanstack/react-query'

// 3. Internal imports
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// 4. Types
import type { User } from '@/types/auth'
```

#### Component Structure
```tsx
// 1. Types/Interfaces
interface ComponentProps {
  // ...
}

// 2. Constants (outside component)
const CONSTANTS = {}

// 3. Component
export default function Component({ props }: ComponentProps) {
  // 3.1. Hooks
  const [state, setState] = useState()
  const { data } = useQuery()

  // 3.2. Derived values
  const computedValue = useMemo(() => {}, [deps])

  // 3.3. Event handlers
  const handleClick = () => {}

  // 3.4. Effects
  useEffect(() => {}, [])

  // 3.5. Render
  return <div>...</div>
}
```

#### Naming Conventions
- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.ts`)
- **Utilities**: camelCase (`utils.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Types**: PascalCase (`UserProfile`, `LoginRequest`)

### Testing

```tsx
// Component test example
import { render, screen } from '@testing-library/react'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

Run tests:
```bash
npm run test
```

---

## 🔌 API Integration

### Base URL Configuration

Set in `.env`:
```env
VITE_API_BASE_URL=http://localhost:8080/api
```

Access in code:
```tsx
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
```

### Authentication Headers

```tsx
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}
```

### Available Endpoints

#### Authentication
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user profile
- `GET /admin/users/:id` - Get user by ID (admin)

#### Attendance
- `GET /user/attendance/my-records` - Get user's attendance records
- `POST /user/attendance/check-in` - Submit check-in
- `POST /user/attendance/check-out` - Submit check-out
- `GET /user/attendance/subordinates` - Get subordinate attendance (supervisor)

#### Leave Requests
- `GET /user/leave/my-requests` - Get user's leave requests
- `POST /user/leave/request` - Submit leave request

#### User Management (Admin)
- `GET /admin/users` - Get all users
- `POST /admin/users` - Create user
- `PUT /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Delete user

#### Role Management (Admin)
- `GET /admin/roles` - Get all roles
- `POST /admin/roles` - Create role
- `PUT /admin/roles/:id` - Update role
- `DELETE /admin/roles/:id` - Delete role

### Error Handling

```tsx
const { data, error, isError } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  retry: 3, // Retry failed requests
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
})

if (isError) {
  return <div>Error: {error.message}</div>
}
```

---

## 📝 Additional Notes

### Performance Optimizations

1. **Query Optimization**
   - Extract query functions outside components
   - Set appropriate `staleTime` to reduce refetches
   - Disable `refetchOnWindowFocus` for static data

2. **Code Splitting**
   - Routes are automatically code-split by TanStack Router
   - Lazy load heavy components with `React.lazy()`

3. **Memoization**
   - Use `useMemo` for expensive calculations
   - Use `useCallback` for event handlers passed to children

### Security Considerations

1. **Token Management**
   - Tokens stored in localStorage (consider httpOnly cookies for production)
   - Automatic token expiration checking
   - Clear tokens on logout

2. **Route Protection**
   - All dashboard routes wrapped in `AuthGuard`
   - Role-based access with `RoleGuard`
   - Server-side validation required for all API endpoints

3. **Input Validation**
   - Client-side validation in forms
   - Sanitize user inputs
   - Use TypeScript for type safety

### Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

### Troubleshooting

#### Routes not found
1. Check if route file exists in `src/routes/`
2. Verify `routeTree.gen.ts` has been regenerated
3. Restart dev server

#### Authentication issues
1. Check token in localStorage
2. Verify API_BASE_URL is correct
3. Check browser console for errors

#### Styling issues
1. Clear browser cache (Ctrl + Shift + R)
2. Verify TailwindCSS classes are correct
3. Check for conflicting class names

---

## 📚 Resources

- [TanStack Router Docs](https://tanstack.com/router)
- [TanStack Query Docs](https://tanstack.com/query)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [TailwindCSS Docs](https://tailwindcss.com)
- [Radix UI Docs](https://www.radix-ui.com)
- [Lucide Icons](https://lucide.dev)

---

## 🤝 Contributing

When contributing to this project:

1. Follow the established code patterns
2. Write TypeScript types for all data structures
3. Add JSDoc comments for complex functions
4. Test your changes thoroughly
5. Keep components small and focused
6. Use the design system consistently

---

## 📄 License

This project is proprietary and confidential.

---

**Last Updated**: 2025
**Version**: 1.0.0
**Framework**: React 19 + TanStack Stack
