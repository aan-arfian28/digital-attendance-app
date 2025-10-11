import { 
  Users, 
  Shield, 
  Clock, 
  History, 
  CheckCircle, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Home
} from 'lucide-react'
import { Link, useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  onMobileMenuClose?: () => void
}

interface MenuItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' },
  { id: 'user-management', label: 'User Management', icon: Users, href: '/dashboard/user-management' },
  { id: 'role-management', label: 'Role Management', icon: Shield, href: '/dashboard/role-management' },
  { id: 'attendance', label: 'Attendance', icon: Clock, href: '/dashboard/attendance' },
  { id: 'history', label: 'History', icon: History, href: '/dashboard/history' },
  { id: 'validate', label: 'Validate', icon: CheckCircle, href: '/dashboard/validate' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/dashboard/settings' },
]

export default function Sidebar({ isOpen, onToggle, onMobileMenuClose }: SidebarProps) {
  const location = useLocation()
  return (
    <div 
      className={cn(
        'flex flex-col h-full bg-white border-r transition-all duration-300 ease-in-out',
        'border-gray-300',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      {/* Logo Section */}
      <div className="flex items-center justify-between p-4 border-b border-gray-300 h-[65px]">
        {isOpen ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#428bff] flex items-center justify-center text-white font-bold text-sm">
                T
              </div>
              <span className="font-bold text-lg text-gray-900">TEKS LOGO</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="flex justify-center w-full">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon
            const isActive = location.pathname === item.href
            
            return (
              <Link
                key={item.id}
                to={item.href}
                onClick={onMobileMenuClose}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-200',
                  'border border-transparent hover:border-gray-300 hover:bg-gray-50 no-underline',
                  isActive && 'bg-[#428bff] text-white border-gray-300',
                  !isActive && 'text-gray-700 hover:text-gray-900'
                )}
                title={!isOpen ? item.label : undefined}
              >
                <IconComponent 
                  className={cn(
                    'h-5 w-5 flex-shrink-0',
                    isActive ? 'text-white' : 'text-gray-600'
                  )} 
                />
                {isOpen && (
                  <span className="font-medium">
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}