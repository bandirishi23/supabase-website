import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import ImportData from './pages/ImportData'
import MyDatasets from './pages/MyDatasets'
import PitchManagement from './pages/PitchManagement'
import PitchHistory from './pages/PitchHistory'
import EmailSettings from './pages/EmailSettings'
import Login from './components/auth/Login'
import Signup from './components/auth/Signup'

function AppContent() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <Layout>
            <Home />
          </Layout>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/import-data"
        element={
          <ProtectedRoute>
            <Layout>
              <ImportData />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-datasets"
        element={
          <ProtectedRoute>
            <Layout>
              <MyDatasets />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pitch-management"
        element={
          <ProtectedRoute>
            <Layout>
              <PitchManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pitch-history"
        element={
          <ProtectedRoute>
            <Layout>
              <PitchHistory />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/email-settings"
        element={
          <ProtectedRoute>
            <Layout>
              <EmailSettings />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App