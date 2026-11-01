import { X, UserPlus, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/hooks/useTranslation'

interface AuthDialogProps {
    onClose: () => void
    onCreateAccount: () => void
    onSignIn: () => void
    featureMessage?: string
}

export function AuthDialog({ onClose, onCreateAccount, onSignIn, featureMessage }: AuthDialogProps) {
    const { t } = useTranslation()

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-navy-900/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-dialog-title"
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 sm:p-8 relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Close"
                >
                    <X size={18} />
                </button>

                {/* Logo icon */}
                <div className="flex justify-center mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                        <svg width="32" height="28" viewBox="0 0 56 44" fill="none">
                            <path d="M28 6 C21 6 9 11 7 19 L7 38 C9 30 21 26 28 26 C35 26 47 30 49 38 L49 19 C47 11 35 6 28 6Z" fill="#10b981" />
                            <path d="M28 6 L28 26" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                            <rect x="23" y="1" width="3.5" height="11" rx="1.75" fill="#0f172a" />
                            <rect x="28.25" y="-1" width="3.5" height="15" rx="1.75" fill="#0f172a" />
                            <rect x="33.5" y="1" width="3.5" height="11" rx="1.75" fill="#0f172a" />
                        </svg>
                    </div>
                </div>

                <h2 id="auth-dialog-title" className="text-xl font-bold text-navy-900 text-center mb-2">
                    {t('auth.title')}
                </h2>
                <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
                    {featureMessage ?? t('auth.description')}
                </p>

                <div className="flex flex-col gap-3">
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        icon={<UserPlus size={17} />}
                        onClick={onCreateAccount}
                    >
                        {t('auth.create')}
                    </Button>
                    <Button
                        variant="secondary"
                        size="lg"
                        className="w-full"
                        icon={<LogIn size={17} />}
                        onClick={onSignIn}
                    >
                        {t('auth.sign_in')}
                    </Button>
                    <button
                        onClick={onClose}
                        className="text-sm text-gray-400 hover:text-gray-600 text-center mt-1 transition-colors"
                    >
                        {t('auth.maybe_later')}
                    </button>
                </div>
            </div>
        </div>
    )
}
