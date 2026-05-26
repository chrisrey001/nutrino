import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import LogMeal from './pages/LogMeal'
import WeekView from './pages/WeekView'
import DayDetail from './pages/DayDetail'
import Settings from './pages/Settings'

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/week" element={<WeekView />} />
              <Route path="/day/:date" element={<DayDetail />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="/log" element={<LogMeal />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  )
}
