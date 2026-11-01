import { Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { Navbar } from './components/layout/Navbar'
import { Footer } from './components/layout/Footer'
import { ToastContainer } from './components/ui/Toast'
import { useToast } from './hooks/useToast'

export default function AppLayout() {
    const { toasts, removeToast } = useToast()
    const location = useLocation()
    const isDashboard = location.pathname === '/home'

    return (
        <div
            className={`min-h-dvh flex flex-col overflow-x-hidden ${isDashboard ? 'bg-cover bg-bottom bg-fixed bg-no-repeat' : 'bg-mint-50'}`}
            style={isDashboard ? { backgroundImage: "url('/dashboard-background.png?v=20261026-1208')" } : undefined}
        >
            <Navbar />
            <main className="flex-1 pt-16">
                <Outlet />
            </main>
            <Footer />
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </div>
    )
}
