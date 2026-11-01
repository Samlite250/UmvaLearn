import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'hover' | 'elevated'
    padding?: 'none' | 'sm' | 'md' | 'lg'
}

const variantClasses = {
    default: 'card',
    hover: 'card-hover',
    elevated: 'bg-white rounded-xl border border-gray-100 shadow-md',
}

const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
}

export function Card({ variant = 'default', padding = 'md', className, children, ...props }: CardProps) {
    return (
        <div className={cn(variantClasses[variant], paddingClasses[padding], className)} {...props}>
            {children}
        </div>
    )
}
