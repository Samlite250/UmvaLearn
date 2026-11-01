import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
    Home, BookOpen, Library, Clock, ChevronDown,
    GraduationCap, Mic, Globe, User, LogIn, LogOut, Menu, X, ShieldCheck
} from 'lucide-react'
import { Logo } from './Logo'
import { useTranslation } from '@/hooks/useTranslation'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'
import type { StudyLevel } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'

const levelLabel: Record<StudyLevel, string> = {
    primary: 'Primary',
    secondary: 'Secondary',
    university: 'University',
}

export function Navbar() {
    const { t } = useTranslation()
    const location = useLocation()
    const studyLevel = useAppStore((s) => s.studyLevel)
    const setStudyLevel = useAppStore((s) => s.setStudyLevel)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [studyDropdown, setStudyDropdown] = useState(false)
    const [toolsDropdown, setToolsDropdown] = useState(false)
    const { user, isAdmin, signOut } = useAuth()
    const [signOutError, setSignOutError] = useState('')
    const handleSignOut = async () => {
        setSignOutError('')
        try { await signOut(); setMobileOpen(false) }
        catch (reason) { setSignOutError(reason instanceof Error ? reason.message : 'Unable to sign out. Please try again.') }
    }

    const isActive = (path: string) =>
        location.pathname === path || (path !== '/' && location.pathname.startsWith(path))

    const navLink = (to: string, label: string, Icon: React.ElementType) => (
        <Link
            to={to}
            className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors duration-150',
                isActive(to)
                    ? 'text-emerald-700 border-b-2 border-emerald-600 rounded-none'
                    : 'text-gray-600 hover:text-navy-900 hover:bg-mint-50 rounded-lg'
            )}
        >
            <Icon size={16} />
            {label}
        </Link>
    )

    return (
        <>
            <header className="fixed inset-x-0 top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 py-2 flex items-center gap-4">
                    {/* Logo */}
                    <Link to="/home" className="flex-shrink-0 mr-4">
                        <Logo size="md" />
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1 flex-1" aria-label="Main navigation">
                        {navLink('/home', t('nav.home'), Home)}

                        {/* Study Tools dropdown */}
                        <div className="relative">
                            <button
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                                    location.pathname.startsWith('/tools')
                                        ? 'text-emerald-700'
                                        : 'text-gray-600 hover:text-navy-900 hover:bg-mint-50'
                                )}
                                onClick={() => setToolsDropdown((v) => !v)}
                                aria-haspopup="true"
                                aria-expanded={toolsDropdown}
                            >
                                <BookOpen size={16} />
                                {t('nav.study_tools')}
                                <ChevronDown size={14} className={cn('transition-transform', toolsDropdown && 'rotate-180')} />
                            </button>
                            {toolsDropdown && (
                                <div
                                    className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50"
                                    onBlur={event => {
                                        if (!event.currentTarget.contains(event.relatedTarget)) setToolsDropdown(false)
                                    }}
                                >
                                    <Link
                                        to="/tools/tts"
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-mint-50 hover:text-emerald-700"
                                        onClick={() => setToolsDropdown(false)}
                                    >
                                        <BookOpen size={15} />
                                        {t('tool.tts')}
                                    </Link>
                                    <Link
                                        to="/tools/stt"
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-mint-50 hover:text-emerald-700"
                                        onClick={() => setToolsDropdown(false)}
                                    >
                                        <Mic size={15} />
                                        {t('tool.stt')}
                                    </Link>
                                    <Link
                                        to="/tools/translate"
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-mint-50 hover:text-emerald-700"
                                        onClick={() => setToolsDropdown(false)}
                                    >
                                        <Globe size={15} />
                                        {t('tool.translate')}
                                    </Link>
                                </div>
                            )}
                        </div>

                        {navLink('/library', t('nav.my_library'), Library)}
                        {navLink('/history', t('nav.history'), Clock)}
                        {isAdmin && navLink('/admin', 'Admin', ShieldCheck)}
                    </nav>

                    {/* Right side */}
                    <div className="hidden md:flex items-center gap-2 ml-auto">
                        {/* Study Level badge */}
                        <div className="relative">
                            <button
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-navy-900 hover:border-emerald-300 transition-colors"
                                onClick={() => setStudyDropdown((v) => !v)}
                                aria-haspopup="true"
                                aria-expanded={studyDropdown}
                            >
                                <GraduationCap size={15} className="text-emerald-700" />
                                {levelLabel[studyLevel]}
                                <ChevronDown size={13} className={cn('transition-transform', studyDropdown && 'rotate-180')} />
                            </button>
                            {studyDropdown && (
                                <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                                    {(['primary', 'secondary', 'university'] as StudyLevel[]).map((level) => (
                                        <button
                                            key={level}
                                            className={cn(
                                                'w-full flex items-center gap-2 px-4 py-2.5 text-sm capitalize hover:bg-mint-50 transition-colors',
                                                studyLevel === level ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                                            )}
                                            onClick={() => { setStudyLevel(level); setStudyDropdown(false) }}
                                        >
                                            {studyLevel === level && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 ml-0.5" />}
                                            {levelLabel[level]}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sign in / Avatar */}
                        {user ? (
                            <button onClick={() => void handleSignOut()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-navy-900 hover:bg-mint-50 transition-colors" title={user.email}>
                                <LogOut size={15} className="text-gray-500" /> Sign out
                            </button>
                        ) : (
                            <Link to="/auth/signin" className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-navy-900 hover:bg-mint-50 transition-colors">
                                <LogIn size={15} className="text-gray-500" /> {t('nav.sign_in')}
                            </Link>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button
                        className="md:hidden ml-auto min-h-11 min-w-11 p-2 rounded-lg hover:bg-mint-100 text-gray-600 flex items-center justify-center"
                        onClick={() => setMobileOpen((v) => !v)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>

                {/* Mobile Nav */}
                {mobileOpen && (
                    <div className="md:hidden max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-gray-100 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-1">
                        <Link to="/home" className="nav-link" onClick={() => setMobileOpen(false)}>
                            <Home size={16} /> {t('nav.home')}
                        </Link>
                        <Link to="/tools/tts" className="nav-link" onClick={() => setMobileOpen(false)}>
                            <BookOpen size={16} /> {t('tool.tts')}
                        </Link>
                        <Link to="/tools/stt" className="nav-link" onClick={() => setMobileOpen(false)}>
                            <Mic size={16} /> {t('tool.stt')}
                        </Link>
                        <Link to="/tools/translate" className="nav-link" onClick={() => setMobileOpen(false)}>
                            <Globe size={16} /> {t('tool.translate')}
                        </Link>
                        <Link to="/library" className="nav-link" onClick={() => setMobileOpen(false)}>
                            <Library size={16} /> {t('nav.my_library')}
                        </Link>
                        <Link to="/history" className="nav-link" onClick={() => setMobileOpen(false)}>
                            <Clock size={16} /> {t('nav.history')}
                        </Link>
                        {isAdmin && <Link to="/admin" className="nav-link" onClick={() => setMobileOpen(false)}>
                            <ShieldCheck size={16} /> Admin dashboard
                        </Link>}
                        <hr className="border-gray-100 my-2" />
                        {user ? (
                            <button className="btn-secondary w-full justify-center" onClick={() => void handleSignOut()}><LogOut size={16} /> Sign out</button>
                        ) : (
                            <Link to="/auth/signin" className="btn-primary w-full justify-center" onClick={() => setMobileOpen(false)}><User size={16} /> {t('nav.sign_in')}</Link>
                        )}
                    </div>
                )}
                {signOutError && <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{signOutError}</p>}
            </header>
        </>
    )
}
