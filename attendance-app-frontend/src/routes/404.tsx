import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/404')({
  component: NotFound,
})

function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <AlertTriangle className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
          <p className="text-gray-600 mb-8">
            The page you're looking for doesn't exist or you don't have permission to access it.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link to="/dashboard">
            <Button className="bg-[#428bff] hover:bg-[#3b7ee6] text-white w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <Link to="/">
            <Button variant="outline" className="border-gray-300 w-full">
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
