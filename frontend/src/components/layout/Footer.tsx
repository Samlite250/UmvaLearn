import { useTranslation } from '@/hooks/useTranslation'
import { Link } from 'react-router-dom'
import { Logo } from './Logo'

const COPYRIGHT_YEAR = new Date().getFullYear()

export function Footer() {
    const { t } = useTranslation()
    return (
        <footer className="mt-auto border-t border-emerald-200/80 bg-white/10 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-gray-500">
                <Logo size="sm" />
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                    <Link to="/about" className="hover:text-emerald-700 transition-colors">{t('common.about')}</Link>
                    <Link to="/help" className="hover:text-emerald-700 transition-colors">{t('common.help')}</Link>
                    <Link to="/privacy" className="hover:text-emerald-700 transition-colors">{t('common.privacy')}</Link>
                    <Link to="/terms" className="hover:text-emerald-700 transition-colors">{t('common.terms')}</Link>
                    <Link to="/admin" className="hover:text-emerald-700 transition-colors">Admin</Link>
                </div>
                <span>© {COPYRIGHT_YEAR} UmvaLearn</span>
            </div>
        </footer>
    )
}
