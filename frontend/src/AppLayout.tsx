import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Navbar } from './components/layout/Navbar'
import { Footer } from './components/layout/Footer'
import { ToastContainer } from './components/ui/Toast'
import { useToast } from './hooks/useToast'

export default function AppLayout() {
    const { toasts, removeToast } = useToast()
    const location = useLocation()
    const isDashboard = location.pathname === '/home'
    useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

    return (
        <div
            className={`min-h-dvh flex flex-col overflow-x-hidden bg-mint-50 ${isDashboard ? 'dashboard-background' : ''}`}
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
