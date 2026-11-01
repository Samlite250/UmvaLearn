import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ArrowRight, BookOpen, GraduationCap, Layers } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/store/appStore'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import type { StudyLevel, AppLanguage } from '@/lib/types'

const levels: { id: StudyLevel; icon: React.ElementType; color: string }[] = [
    { id: 'primary', icon: BookOpen, color: 'text-teal-600' },
    { id: 'secondary', icon: Layers, color: 'text-emerald-700' },
    { id: 'university', icon: GraduationCap, color: 'text-navy-800' },
]

const LANGUAGES: { code: AppLanguage; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'rw', label: 'Kinyarwanda' },
]

export default function Welcome() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { studyLevel, setStudyLevel, setWelcomeSeen, appLanguage, setAppLanguage } = useAppStore()
    const [selected, setSelected] = useState<StudyLevel>(studyLevel)

    const handleContinue = () => {
        setStudyLevel(selected)
        setWelcomeSeen()
        navigate('/home')
    }

    return (
        <div className="relative isolate h-dvh overflow-x-hidden overflow-y-auto flex flex-col items-center justify-start pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:py-5 px-4">
            <div className="welcome-background fixed inset-0 -z-20" aria-hidden="true" />
            <div className="welcome-layout w-full max-w-md sm:max-w-2xl min-h-full shrink-0 flex flex-col gap-3 sm:gap-0">
                {/* Top links */}
                <div className="welcome-top-links welcome-height-optional flex justify-end gap-4 mb-2 sm:mb-3 text-sm font-medium text-navy-800">
                    <a href="/about" className="hover:text-emerald-700 transition-colors">{t('common.about')}</a>
                    <a href="/help" className="hover:text-emerald-700 transition-colors">{t('common.help')}</a>
                </div>

                {/* Card */}
                <div className="welcome-card my-auto bg-white rounded-2xl border border-emerald-100 shadow-xl p-4 sm:p-6">
                    {/* Logo — stacked (icon above text) */}
                    <div className="welcome-height-compact flex flex-col items-center gap-1 mb-2 sm:mb-3">
                        <Logo size="lg" />
                    </div>

                    {/* Heading */}
                    <div className="text-center mb-3 sm:mb-5">
                        <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 mb-1">
                            {t('welcome.title')}{' '}
                            <span className="text-emerald-600">{t('welcome.brand')}</span>
                        </h1>
                        <p className="text-gray-600 text-base">{t('welcome.tagline')}</p>
                        <p className="welcome-height-optional text-gray-500 text-sm mt-1">{t('welcome.slogan')}</p>
                    </div>

                    {/* Study level selection */}
                    <div className="mb-3 sm:mb-5">
                        <h2 className="text-base sm:text-lg font-bold text-navy-900 text-center mb-2 sm:mb-3">
                            {t('welcome.choose_level')}
                        </h2>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {levels.map(({ id, icon: Icon, color }) => (
                                <button
                                    key={id}
                                    onClick={() => setSelected(id)}
                                    className={cn(
                                        'relative flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer',
                                        selected === id
                                            ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                                            : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-mint-50'
                                    )}
                                    aria-pressed={selected === id}
                                    aria-label={t(`welcome.${id}`)}
                                >
                                    {selected === id && (
                                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center">
                                            <Check size={11} color="white" strokeWidth={3} />
                                        </span>
                                    )}
                                    <Icon
                                        size={32}
                                        className={cn(selected === id ? 'text-emerald-700' : color)}
                                        strokeWidth={1.5}
                                    />
                                    <div className="text-center">
                                        <p className={cn('text-sm font-bold', selected === id ? 'text-emerald-700' : 'text-navy-900')}>
                                            {t(`welcome.${id}`)}
                                        </p>
                                        <p className="welcome-height-optional hidden sm:block text-xs text-gray-500 mt-0.5 leading-tight">
                                            {t(`welcome.${id}_desc`)}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Continue button */}
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={handleContinue}
                        icon={<ArrowRight size={18} />}
                    >
                        {t('welcome.continue')}
                    </Button>
                </div>

                {/* Language selector */}
                <div className="welcome-footer">
                <div className="mx-auto w-fit max-w-full flex items-center justify-center gap-x-3 gap-y-1 flex-wrap rounded-full border border-white/80 bg-white px-4 py-2 shadow-sm">
                    {LANGUAGES.map(({ code, label }) => (
                        <button
                            key={code}
                            onClick={() => setAppLanguage(code)}
                            className={cn(
                                'text-sm transition-colors',
                                appLanguage === code
                                    ? 'text-emerald-700 font-semibold'
                                    : 'text-gray-500 hover:text-gray-700'
                            )}
                            aria-current={appLanguage === code ? 'true' : undefined}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Bottom links */}
                <div className="welcome-height-optional mt-2 flex items-center justify-center gap-3 text-xs font-bold text-white [text-shadow:0_1px_4px_rgba(15,23,42,0.9)]">
                    <a href="/about" className="hover:text-amber-200 hover:underline underline-offset-4 transition-colors">{t('common.about')}</a>
                    <span className="text-white/60" aria-hidden="true">·</span>
                    <a href="/help" className="hover:text-amber-200 hover:underline underline-offset-4 transition-colors">{t('common.help')}</a>
                    <span className="text-white/60" aria-hidden="true">·</span>
                    <a href="/privacy" className="hover:text-amber-200 hover:underline underline-offset-4 transition-colors">{t('common.privacy')}</a>
                </div>
                </div>
            </div>
        </div>
    )
}
