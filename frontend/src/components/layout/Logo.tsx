import { cn } from '@/lib/utils'

interface LogoProps {
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export function Logo({ size = 'lg', className }: LogoProps) {
    const iconSizes = { sm: 60, md: 90, lg: 120 }

    const s = iconSizes[size]

    return (
        <div className={cn('flex items-center gap-2', className)}>
            {/* Use the provided PNG logo image */}
            {/* Import logo image */}
            <img
                src="/UmvaLearn-logo.png"
                alt="UmvaLearn logo"
                className="inline-block"
                style={{ width: `${s * 1.5}px`, height: `${s}px` }}
            />


        </div>
    )
}
