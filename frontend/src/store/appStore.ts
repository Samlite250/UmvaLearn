import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StudyLevel, AppLanguage } from '@/lib/types'

interface AppState {
    studyLevel: StudyLevel
    appLanguage: AppLanguage
    isWelcomeSeen: boolean
    setStudyLevel: (level: StudyLevel) => void
    setAppLanguage: (lang: AppLanguage) => void
    setWelcomeSeen: () => void
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            studyLevel: 'secondary',
            appLanguage: 'en',
            isWelcomeSeen: false,
            setStudyLevel: (level) => set({ studyLevel: level }),
            setAppLanguage: (lang) => set({ appLanguage: lang }),
            setWelcomeSeen: () => set({ isWelcomeSeen: true }),
        }),
        {
            name: 'umvalearn-app',
            version: 1,
            migrate: (persistedState: unknown) => {
                const state = persistedState as Record<string, unknown>
                const storedLanguage = state.appLanguage
                const appLanguage: AppLanguage =
                    storedLanguage === 'fr' || storedLanguage === 'rw' ? storedLanguage : 'en'
                return {
                    ...state,
                    appLanguage,
                } as unknown as AppState
            },
            partialize: (state) => ({
                studyLevel: state.studyLevel,
                appLanguage: state.appLanguage,
                isWelcomeSeen: state.isWelcomeSeen,
            }),
        }
    )
)
