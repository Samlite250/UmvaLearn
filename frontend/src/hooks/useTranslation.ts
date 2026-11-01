import { useCallback } from 'react'
import { useAppStore } from '@/store/appStore'
import locales from '@/i18n/locales'

export function useTranslation() {
    const appLanguage = useAppStore((s) => s.appLanguage)

    const t = useCallback(
        (key: string, fallback?: string): string => {
            return locales[appLanguage]?.[key] ?? locales['en']?.[key] ?? fallback ?? key
        },
        [appLanguage]
    )

    return { t, lang: appLanguage }
}
