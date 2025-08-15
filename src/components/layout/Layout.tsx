import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => 
    localStorage.getItem('sidebarCollapsed') === 'true'
  )

  useEffect(() => {
    const handleStorageChange = () => {
      setSidebarCollapsed(localStorage.getItem('sidebarCollapsed') === 'true')
    }

    // Listen for sidebar state changes
    window.addEventListener('storage', handleStorageChange)
    
    // Custom event for same-window updates
    window.addEventListener('sidebarToggle', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('sidebarToggle', handleStorageChange)
    }
  }, [])

  const marginLeft = sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'

  return (
    <div className="min-h-screen bg-dark-400">
      <Sidebar />
      <main className={`${marginLeft} transition-all duration-200`}>
        <div className="min-h-screen bg-dark-300">
          {children}
        </div>
      </main>
    </div>
  )
}