import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import UserDropdown from './UserDropdown'

interface HeaderProps {
  onMobileMenuToggle: () => void
  userName?: string
  userAvatar?: string
  onLogout?: () => void
  onProfile?: () => void
}

export default function Header({ 
  onMobileMenuToggle, 
  userName, 
  userAvatar, 
  onLogout, 
  onProfile 
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-[65px] px-4 bg-white border-b border-gray-300">
      {/* Mobile Menu Button - Only visible on mobile */}
      <div className="flex items-center md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileMenuToggle}
          className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Desktop spacing */}
      <div className="hidden md:block"></div>

      {/* User Section */}
      <div className="flex items-center">
        <UserDropdown
          userName={userName}
          userAvatar={userAvatar}
          onLogout={onLogout}
          onProfile={onProfile}
        />
      </div>
    </header>
  )
}