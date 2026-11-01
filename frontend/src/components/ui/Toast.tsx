import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Toast } from '@/lib/types'

const config = {
    success: {
        icon: CheckCircle2,
        classes: 'bg-emerald-50 border-emerald-300 text-emerald-800',
        iconClass: 'text-emerald-600',
    },
    error: {
        icon: AlertCircle,
        classes: 'bg-red-50 border-red-300 text-red-800',
        iconClass: 'text-red-600',
    },
    warning: {
        icon: AlertTriangle,
        classes: 'bg-amber-50 border-amber-300 text-amber-800',
        iconClass: 'text-amber-600',
    },
    info: {
        icon: Info,
        classes: 'bg-blue-50 border-blue-300 text-blue-800',
        iconClass: 'text-blue-600',
    },
}

interface ToastItemProps {
    toast: Toast
    onRemove: (id: string) => void
}

export function ToastItem({ toast, onRemove }: ToastItemProps) {
    const { icon: Icon, classes, iconClass } = config[toast.type]
    return (
        <div
            role="alert"
            aria-live="polite"
            className={cn(
                'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-md text-sm font-medium',
                'animate-in slide-in-from-right-4 fade-in duration-200',
                classes
            )}
        >
            <Icon size={18} className={cn('mt-0.5 shrink-0', iconClass)} />
            <span className="flex-1">{toast.message}</span>
            <button
                onClick={() => onRemove(toast.id)}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
            >
                <X size={16} />
            </button>
        </div>
    )
}

interface ToastContainerProps {
    toasts: Toast[]
    onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    return (
        <div
            aria-live="polite"
            className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
        >
            {toasts.map((t) => (
                <ToastItem key={t.id} toast={t} onRemove={onRemove} />
            ))}
        </div>
    )
}
