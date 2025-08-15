import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Building2, TrendingUp, Users, BarChart3, Map, Shield } from 'lucide-react'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl">
          Welcome to <span className="text-emerald-500">DFW LANDS</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Premier Real Estate Solutions for the Dallas-Fort Worth Area
        </p>
        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          {user ? (
            <Link
              to="/dashboard"
              className="flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 md:py-4 md:text-lg md:px-10"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <div className="rounded-md shadow">
                <Link
                  to="/signup"
                  className="flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 md:py-4 md:text-lg md:px-10"
                >
                  Get Started
                </Link>
              </div>
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                <Link
                  to="/login"
                  className="flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-emerald-500 bg-gray-900 hover:bg-gray-800 border-emerald-500 md:py-4 md:text-lg md:px-10"
                >
                  Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">Our Services</h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 hover:border-emerald-600 transition-colors">
            <Building2 className="h-10 w-10 text-emerald-500 mb-4" />
            <h3 className="text-lg font-semibold text-emerald-500">Property Management</h3>
            <p className="mt-2 text-gray-400">
              Comprehensive property management solutions for residential and commercial real estate.
            </p>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 hover:border-emerald-600 transition-colors">
            <TrendingUp className="h-10 w-10 text-emerald-500 mb-4" />
            <h3 className="text-lg font-semibold text-emerald-500">Investment Analysis</h3>
            <p className="mt-2 text-gray-400">
              Data-driven insights and market analysis for smart real estate investments.
            </p>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 hover:border-emerald-600 transition-colors">
            <Users className="h-10 w-10 text-emerald-500 mb-4" />
            <h3 className="text-lg font-semibold text-emerald-500">Lead Generation</h3>
            <p className="mt-2 text-gray-400">
              AI-powered lead generation and automated outreach for maximum efficiency.
            </p>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 hover:border-emerald-600 transition-colors">
            <BarChart3 className="h-10 w-10 text-emerald-500 mb-4" />
            <h3 className="text-lg font-semibold text-emerald-500">Market Research</h3>
            <p className="mt-2 text-gray-400">
              Comprehensive market research and competitor analysis for strategic positioning.
            </p>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 hover:border-emerald-600 transition-colors">
            <Map className="h-10 w-10 text-emerald-500 mb-4" />
            <h3 className="text-lg font-semibold text-emerald-500">Territory Mapping</h3>
            <p className="mt-2 text-gray-400">
              Advanced geographic analysis and territory planning for optimal coverage.
            </p>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 hover:border-emerald-600 transition-colors">
            <Shield className="h-10 w-10 text-emerald-500 mb-4" />
            <h3 className="text-lg font-semibold text-emerald-500">Secure Data Management</h3>
            <p className="mt-2 text-gray-400">
              Enterprise-grade security for your property data and client information.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-20 text-center">
        <div className="bg-gradient-to-r from-emerald-900/20 to-green-900/20 rounded-lg p-12 border border-emerald-800">
          <h2 className="text-3xl font-bold text-white mb-4">
            Transform Your Real Estate Business
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-8">
            Join hundreds of real estate professionals who are using DFW LANDS to streamline their operations, 
            generate more leads, and close deals faster with AI-powered tools.
          </p>
          {!user && (
            <Link
              to="/signup"
              className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
            >
              Start Free Trial
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}