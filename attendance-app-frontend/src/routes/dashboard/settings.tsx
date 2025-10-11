import { createFileRoute } from '@tanstack/react-router'
import { Settings, Save, Bell, Lock, Globe, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/dashboard/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-[#428bff]" />
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
        <Button className="bg-[#428bff] hover:bg-[#3b7ee6] text-white">
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <p className="text-gray-600 mb-8">
        Configure application settings and preferences.
      </p>

      <div className="space-y-8">
        {/* General Settings */}
        <div className="border border-gray-300 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="h-5 w-5 text-[#428bff]" />
            <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input 
                type="text" 
                className="w-full p-3 border border-gray-300 bg-white"
                defaultValue="Digital Attendance Company"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Zone
              </label>
              <select className="w-full p-3 border border-gray-300 bg-white">
                <option>UTC+7 (Jakarta)</option>
                <option>UTC+0 (London)</option>
                <option>UTC-5 (New York)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Working Hours Start
              </label>
              <input 
                type="time" 
                className="w-full p-3 border border-gray-300 bg-white"
                defaultValue="08:00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Working Hours End
              </label>
              <input 
                type="time" 
                className="w-full p-3 border border-gray-300 bg-white"
                defaultValue="17:00"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="border border-gray-300 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-5 w-5 text-[#428bff]" />
            <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Late Arrival Notifications</h3>
                <p className="text-sm text-gray-600">Notify managers when employees arrive late</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#428bff]"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Email Reports</h3>
                <p className="text-sm text-gray-600">Send daily attendance reports via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#428bff]"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Mobile Push Notifications</h3>
                <p className="text-sm text-gray-600">Send push notifications to mobile devices</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#428bff]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="border border-gray-300 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="h-5 w-5 text-[#428bff]" />
            <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout (minutes)
              </label>
              <input 
                type="number" 
                className="w-full p-3 border border-gray-300 bg-white"
                defaultValue="60"
                min="15"
                max="480"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password Policy
              </label>
              <select className="w-full p-3 border border-gray-300 bg-white">
                <option>Strong (8+ chars, mixed case, numbers, symbols)</option>
                <option>Medium (8+ chars, mixed case, numbers)</option>
                <option>Basic (6+ chars)</option>
              </select>
            </div>
          </div>
          
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-600">Require 2FA for admin accounts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#428bff]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Data & Backup */}
        <div className="border border-gray-300 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-5 w-5 text-[#428bff]" />
            <h2 className="text-lg font-semibold text-gray-900">Data & Backup</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto Backup Frequency
              </label>
              <select className="w-full p-3 border border-gray-300 bg-white">
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Retention (months)
              </label>
              <input 
                type="number" 
                className="w-full p-3 border border-gray-300 bg-white"
                defaultValue="12"
                min="1"
                max="120"
              />
            </div>
          </div>
          
          <div className="mt-6 flex gap-4">
            <Button variant="outline" className="border-gray-300">
              Export Data
            </Button>
            <Button variant="outline" className="border-gray-300">
              Create Backup
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}