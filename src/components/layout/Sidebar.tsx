import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Home,
  LayoutDashboard,
  FileSpreadsheet,
  Upload,
  Mail,
  MessageSquare,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Building2,
  History,
  Users
} from 'lucide-react'

interface Dataset {
  id: string
  name: string
  total_rows: number
  updated_at: string
}

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const sidebarRef = useRef<HTMLDivElement>(null)
  
  // State
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [leadsDropdownOpen, setLeadsDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => 
    localStorage.getItem('sidebarCollapsed') === 'true'
  )
  const [isHovering, setIsHovering] = useState(false)
  
  // Auto-expand on hover
  const hoverTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  
  const handleMouseEnter = () => {
    if (isCollapsed) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovering(true)
      }, 300)
    }
  }
  
  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setIsHovering(false)
  }

  const isExpanded = !isCollapsed || isHovering

  useEffect(() => {
    if (user) {
      fetchDatasets()
    }
  }, [user])

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isCollapsed))
    // Dispatch custom event for same-window updates
    window.dispatchEvent(new Event('sidebarToggle'))
  }, [isCollapsed])

  const fetchDatasets = async () => {
    try {
      const { data, error } = await supabase
        .from('datasets')
        .select('id, name, total_rows, updated_at')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setDatasets(data || [])
      
      // Auto-select first dataset if none selected
      const savedDatasetId = localStorage.getItem('selectedDatasetId')
      if (data && data.length > 0) {
        const dataset = savedDatasetId 
          ? data.find(d => d.id === savedDatasetId) || data[0]
          : data[0]
        setSelectedDataset(dataset)
        localStorage.setItem('selectedDatasetId', dataset.id)
      }
    } catch (err) {
      console.error('Error fetching datasets:', err)
    }
  }

  const handleDatasetSelect = (dataset: Dataset) => {
    setSelectedDataset(dataset)
    localStorage.setItem('selectedDatasetId', dataset.id)
    // Navigate to My Properties page when dataset is selected
    if (location.pathname !== '/my-datasets') {
      navigate('/my-datasets')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navigationItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, requireAuth: true },
    { name: 'Import Data', href: '/import-data', icon: Upload, requireAuth: true },
    { name: 'My Properties', href: '/my-datasets', icon: FileSpreadsheet, requireAuth: true },
    { name: 'Pitch Templates', href: '/pitch-management', icon: MessageSquare, requireAuth: true },
    { name: 'Pitch History', href: '/pitch-history', icon: History, requireAuth: true },
    { name: 'Email Settings', href: '/email-settings', icon: Mail, requireAuth: true },
  ]

  const isActive = (href: string) => location.pathname === href

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className={`px-4 py-5 border-b border-dark-border transition-all duration-200 ${isExpanded ? '' : 'px-3'}`}>
        <Link to="/" className="flex items-center space-x-3">
          <Building2 className={`h-8 w-8 text-brand flex-shrink-0 transition-all duration-200 ${!isExpanded ? 'h-7 w-7' : ''}`} />
          {isExpanded && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-semibold text-brand whitespace-nowrap">DFW LANDS</h1>
              <p className="text-xs text-gray-500 whitespace-nowrap">Real Estate Solutions</p>
            </div>
          )}
        </Link>
      </div>

      {/* Collapse Toggle (Desktop only) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`hidden lg:flex absolute top-6 -right-3 z-10 p-1 bg-dark-200 border border-dark-border rounded-full hover:bg-dark-100 transition-all duration-200 ${!isExpanded ? 'opacity-0' : 'opacity-100'}`}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* My Leads Dropdown */}
      {user && datasets.length > 0 && (
        <div className={`px-3 py-3 border-b border-dark-border ${!isExpanded ? 'px-2' : ''}`}>
          <button
            onClick={() => setLeadsDropdownOpen(!leadsDropdownOpen)}
            className={`w-full flex items-center justify-between px-2 py-2 bg-dark-200 rounded-lg hover:bg-dark-100 transition-all duration-200 ${!isExpanded ? 'justify-center' : ''}`}
          >
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-brand flex-shrink-0" />
              {isExpanded && (
                <div className="text-left">
                  <p className="text-xs text-gray-500">My Leads</p>
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {selectedDataset ? selectedDataset.name : 'Select Dataset'}
                  </p>
                </div>
              )}
            </div>
            {isExpanded && (
              leadsDropdownOpen ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )
            )}
          </button>

          {/* Dropdown Menu */}
          {leadsDropdownOpen && isExpanded && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {datasets.map((dataset) => (
                <button
                  key={dataset.id}
                  onClick={() => handleDatasetSelect(dataset)}
                  className={`w-full text-left px-3 py-1.5 rounded-md hover:bg-dark-100 transition-colors ${
                    selectedDataset?.id === dataset.id ? 'bg-dark-100 border-l-2 border-brand' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-gray-200 truncate">{dataset.name}</p>
                  <p className="text-xs text-gray-500">
                    {dataset.total_rows} leads
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 px-3 py-4 space-y-1 overflow-y-auto ${!isExpanded ? 'px-2' : ''}`}>
        {navigationItems.map((item) => {
          if (item.requireAuth && !user) return null
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                isActive(item.href)
                  ? 'bg-dark-200 text-brand'
                  : 'text-gray-400 hover:bg-dark-100 hover:text-gray-200'
              } ${!isExpanded ? 'justify-center px-2' : ''}`}
              onClick={() => setMobileOpen(false)}
              title={!isExpanded ? item.name : undefined}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${isActive(item.href) ? 'text-brand' : 'group-hover:text-brand'}`} />
              {isExpanded && (
                <span className="text-sm font-medium whitespace-nowrap">{item.name}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className={`px-3 py-4 border-t border-dark-border ${!isExpanded ? 'px-2' : ''}`}>
        {user ? (
          <div className="space-y-2">
            {isExpanded && (
              <div className="px-3 py-2">
                <p className="text-xs text-gray-500">Signed in as</p>
                <p className="text-sm font-medium text-gray-200 truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className={`w-full flex items-center space-x-3 px-3 py-2 text-gray-400 hover:bg-dark-100 hover:text-gray-200 rounded-lg transition-all duration-200 ${!isExpanded ? 'justify-center px-2' : ''}`}
              title={!isExpanded ? 'Sign Out' : undefined}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {isExpanded && (
                <span className="text-sm font-medium">Sign Out</span>
              )}
            </button>
          </div>
        ) : (
          isExpanded && (
            <div className="space-y-2">
              <Link
                to="/login"
                className="block w-full px-3 py-2 text-center text-sm font-medium text-white bg-brand hover:bg-brand-hover rounded-lg transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="block w-full px-3 py-2 text-center text-sm font-medium text-brand border border-brand hover:bg-brand/10 rounded-lg transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          )
        )}
      </div>
    </div>
  )

  const sidebarWidth = isExpanded ? 'w-64' : 'w-16'

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-dark-200 text-white rounded-lg shadow-lg border border-dark-border"
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Desktop Sidebar */}
      <div 
        ref={sidebarRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 ${sidebarWidth} bg-dark-400 border-r border-dark-border transition-all duration-200 z-40`}
      >
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="lg:hidden fixed inset-y-0 left-0 w-64 bg-dark-400 z-50 flex flex-col border-r border-dark-border">
            <SidebarContent />
          </div>
        </>
      )}
    </>
  )
}