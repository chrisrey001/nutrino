import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import LogMeal from './pages/LogMeal'
import WeekView from './pages/WeekView'
import DayDetail from './pages/DayDetail'
import Settings from './pages/Settings'
import Favorites from './pages/Favorites'
import Login from './pages/Login'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/week" element={<WeekView />} />
              <Route path="/day/:date" element={<DayDetail />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="/log" element={<LogMeal />} />
            <Route path="/favorites" element={<Favorites />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
