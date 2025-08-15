import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { 
  Building2, 
  TrendingUp, 
  Users, 
  DollarSign, 
  FileText,
  Activity,
  Home,
  MapPin,
  Calendar,
  ChartBar
} from 'lucide-react'

interface DashboardStats {
  totalProperties: number
  totalPitches: number
  emailsSent: number
  datasets: number
}

interface RecentProperty {
  id: string
  address?: string
  city?: string
  state?: string
  price?: string | number
  bedrooms?: string | number
  bathrooms?: string | number
  created_at: string
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalPitches: 0,
    emailsSent: 0,
    datasets: 0
  })
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchDashboardStats()
    }
  }, [user])

  const fetchDashboardStats = async () => {
    setIsLoading(true)
    try {
      // Fetch datasets count and total properties
      const { data: datasets, error: datasetsError } = await supabase
        .from('datasets')
        .select('id, total_rows')
        .eq('user_id', user?.id)

      if (!datasetsError && datasets) {
        const totalProperties = datasets.reduce((sum, dataset) => sum + (dataset.total_rows || 0), 0)
        setStats(prev => ({
          ...prev,
          datasets: datasets.length,
          totalProperties
        }))
      }

      // Fetch pitch statistics
      const { data: pitches, error: pitchesError } = await supabase
        .from('generated_pitches')
        .select('id, status')
        .eq('user_id', user?.id)

      if (!pitchesError && pitches) {
        const emailsSent = pitches.filter(p => p.status === 'sent').length
        setStats(prev => ({
          ...prev,
          totalPitches: pitches.length,
          emailsSent
        }))
      }

      // Fetch recent properties from dataset_rows
      if (datasets && datasets.length > 0) {
        const { data: rows, error: rowsError } = await supabase
          .from('dataset_rows')
          .select('*')
          .in('dataset_id', datasets.map(d => d.id))
          .order('created_at', { ascending: false })
          .limit(3)

        if (!rowsError && rows) {
          setRecentProperties(rows.map(row => ({
            id: row.id,
            address: row.data?.address || row.data?.property_address || row.data?.street_address,
            city: row.data?.city,
            state: row.data?.state || 'TX',
            price: row.data?.price || row.data?.listing_price || row.data?.sale_price,
            bedrooms: row.data?.bedrooms || row.data?.beds,
            bathrooms: row.data?.bathrooms || row.data?.baths,
            created_at: row.created_at
          })))
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-2 text-gray-400">
          Welcome back, {user?.email}! Here's your real estate portfolio overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Properties</p>
              <p className="text-2xl font-bold text-white mt-1">
                {isLoading ? '...' : stats.totalProperties.toLocaleString()}
              </p>
            </div>
            <Building2 className="h-10 w-10 text-emerald-500 opacity-75" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Across {stats.datasets} datasets</p>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Pitches Generated</p>
              <p className="text-2xl font-bold text-white mt-1">
                {isLoading ? '...' : stats.totalPitches.toLocaleString()}
              </p>
            </div>
            <FileText className="h-10 w-10 text-emerald-500 opacity-75" />
          </div>
          <p className="text-xs text-gray-500 mt-2">AI-powered pitches</p>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Emails Sent</p>
              <p className="text-2xl font-bold text-white mt-1">
                {isLoading ? '...' : stats.emailsSent.toLocaleString()}
              </p>
            </div>
            <Users className="h-10 w-10 text-emerald-500 opacity-75" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Outreach campaigns</p>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Success Rate</p>
              <p className="text-2xl font-bold text-white mt-1">
                {stats.emailsSent > 0 
                  ? `${Math.round((stats.emailsSent / stats.totalPitches) * 100)}%`
                  : '0%'
                }
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-emerald-500 opacity-75" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Email delivery rate</p>
        </div>
      </div>

      {/* Recent Activity & Featured Properties */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Properties */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Properties</h2>
            <Home className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="space-y-4">
            {recentProperties.length > 0 ? (
              recentProperties.map((property) => (
                <div key={property.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-white font-medium">
                      {property.address || 'Property'}{property.city ? `, ${property.city}` : ''}{property.state ? `, ${property.state}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">
                      {property.bedrooms ? `${property.bedrooms} beds` : 'N/A'} • {property.bathrooms ? `${property.bathrooms} baths` : 'N/A'}
                    </p>
                  </div>
                  <p className="text-emerald-500 font-semibold">
                    {property.price ? 
                      (typeof property.price === 'number' ? `$${property.price.toLocaleString()}` : property.price) : 
                      'Price TBD'
                    }
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No properties imported yet</p>
                <button
                  onClick={() => navigate('/import-data')}
                  className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm"
                >
                  Import Properties
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Activity Insights */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Activity Insights</h2>
            <ChartBar className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="space-y-4">
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Email Success Rate</span>
                <span className="text-white font-medium">
                  {stats.totalPitches > 0 
                    ? `${Math.round((stats.emailsSent / stats.totalPitches) * 100)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full" 
                  style={{ width: stats.totalPitches > 0 ? `${(stats.emailsSent / stats.totalPitches) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Properties per Dataset</span>
                <span className="text-white font-medium">
                  {stats.datasets > 0 ? Math.round(stats.totalProperties / stats.datasets) : 0}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Pitches per Property</span>
                <span className="text-white font-medium">
                  {stats.totalProperties > 0 
                    ? (stats.totalPitches / stats.totalProperties).toFixed(1)
                    : '0'
                  }
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full" 
                  style={{ 
                    width: stats.totalProperties > 0 
                      ? `${Math.min(((stats.totalPitches / stats.totalProperties) / 5) * 100, 100)}%` 
                      : '0%' 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-emerald-900/20 to-green-900/20 rounded-lg p-6 border border-emerald-800">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/import-data')}
            className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-emerald-600 transition-colors text-left"
          >
            <DollarSign className="h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-white font-medium">Import Properties</p>
            <p className="text-xs text-gray-400">Add new property listings</p>
          </button>
          <button
            onClick={() => navigate('/pitch-management')}
            className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-emerald-600 transition-colors text-left"
          >
            <FileText className="h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-white font-medium">Create Pitch</p>
            <p className="text-xs text-gray-400">Generate AI-powered pitches</p>
          </button>
          <button
            onClick={() => navigate('/my-datasets')}
            className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-emerald-600 transition-colors text-left"
          >
            <Activity className="h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-white font-medium">View Portfolio</p>
            <p className="text-xs text-gray-400">Manage your properties</p>
          </button>
        </div>
      </div>

      {/* DFW Office Info */}
      <div className="mt-8 bg-gray-900 rounded-lg p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">DFW LANDS Office</h2>
          <MapPin className="h-5 w-5 text-emerald-500" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-400 text-sm mb-1">Main Office</p>
            <p className="text-white">1234 Business Pkwy, Suite 100</p>
            <p className="text-white">Dallas, TX 75201</p>
            <p className="text-emerald-500 mt-2">(214) 555-0100</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Office Hours</p>
            <p className="text-white">Monday - Friday: 9:00 AM - 6:00 PM</p>
            <p className="text-white">Saturday: 10:00 AM - 4:00 PM</p>
            <p className="text-gray-500">Sunday: Closed</p>
          </div>
        </div>
      </div>
    </div>
  )
}