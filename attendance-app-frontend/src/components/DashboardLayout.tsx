import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import Sidebar from './Sidebar'
import DashboardHeader from './DashboardHeader'

interface DashboardLayoutProps {
  children?: React.ReactNode
  userName?: string
  userAvatar?: string
  onLogout?: () => void
  onProfile?: () => void
}

export default function DashboardLayout({
  children,
  userName = "Admin User",
  userAvatar,
  onLogout,
  onProfile
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if screen is mobile size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      } else {
        setMobileMenuOpen(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen)
    } else {
      setSidebarOpen(!sidebarOpen)
    }
  }

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const handleMobileMenuClose = () => {
    if (isMobile) {
      setMobileMenuOpen(false)
    }
  }

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && mobileMenuOpen) {
        const target = event.target as Element
        if (!target.closest('.mobile-sidebar') && !target.closest('.mobile-menu-button')) {
          setMobileMenuOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMobile, mobileMenuOpen])

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Desktop Sidebar */}
      <div
        className={cn(
          'hidden md:flex transition-all duration-300 ease-in-out flex-shrink-0',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={handleSidebarToggle}
          onMobileMenuClose={handleMobileMenuClose}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" />
          <div className="mobile-sidebar fixed left-0 top-0 h-full w-64 z-50">
            <Sidebar
              isOpen={true}
              onToggle={handleMobileMenuToggle}
              onMobileMenuClose={handleMobileMenuClose}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <DashboardHeader
          onMobileMenuToggle={handleMobileMenuToggle}
          userName={userName}
          userAvatar={userAvatar}
          onLogout={onLogout}
          onProfile={onProfile}
        />

        {/* Content Panel */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}