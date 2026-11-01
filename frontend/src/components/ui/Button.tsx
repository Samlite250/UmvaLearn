import { cn } from '@/lib/utils'
import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant
    size?: Size
    loading?: boolean
    icon?: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger:
        'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 active:bg-red-800 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
}

const sizeClasses: Record<Size, string> = {
    sm: 'text-xs px-3 py-1.5',
    md: '',
    lg: 'text-base px-7 py-3.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(variantClasses[variant], sizeClasses[size], className)}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                    icon
                )}
                {children}
            </button>
        )
    }
)
Button.displayName = 'Button'
