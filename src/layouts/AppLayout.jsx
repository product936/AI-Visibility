import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import Topbar from '../components/Topbar.jsx'

export default function AppLayout() {
  return (
    <div className="min-h-screen flex bg-[#f7f8fa]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 px-8 py-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
