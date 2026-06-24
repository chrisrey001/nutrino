import { Outlet } from 'react-router-dom'
import NavBar from './NavBar'

export default function Layout() {
  return (
    <div className="flex flex-col h-dvh bg-gray-50">
      <div className="flex-1 overflow-y-auto min-h-0">
        <main className="max-w-md mx-auto">
          <Outlet />
        </main>
      </div>
      <NavBar />
    </div>
  )
}
