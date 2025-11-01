import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Lock, User, AlertCircle, Loader2 } from 'lucide-react'
import { useLogin, useAuth } from '@/hooks/useAuth'
import type { LoginRequest } from '@/types/auth'

export const Route = createFileRoute('/login')({
  component: Login,
})

function Login() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()
  const loginMutation = useLogin()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<LoginRequest>({
    username: '',
    password: '',
  })

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate({
        to: '/dashboard',
        replace: true,
      })
    }
  }, [isAuthenticated, isLoading, navigate])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#428bff] text-white font-bold text-xl mb-4 animate-pulse">
            T
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render login form if already authenticated
  if (isAuthenticated) {
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.username && formData.password) {
      loginMutation.mutate(formData)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#428bff] text-white font-bold text-xl mb-4">
            T
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ATTENDAPP</h1>
          <p className="text-gray-600">Digital Attendance App</p>
        </div>

        {/* Login Form */}
        <div className="border border-gray-300 p-8 rounded-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            Login to Your Account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            {loginMutation.isError && (
              <Alert variant="destructive" className="rounded-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {loginMutation.error?.message ||
                    'Login failed. Please try again.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Username Field */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#428bff] focus:border-transparent"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={(e) =>
                    handleInputChange('username', e.target.value)
                  }
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#428bff] focus:border-transparent"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange('password', e.target.value)
                  }
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-[#428bff] hover:bg-[#3b7ee6] text-white font-medium py-2 px-4 rounded-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
