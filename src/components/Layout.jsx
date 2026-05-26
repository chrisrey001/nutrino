import { Outlet } from 'react-router-dom'
import NavBar from './NavBar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-md mx-auto">
        <Outlet />
      </main>
      <NavBar />
    </div>
  )
}
