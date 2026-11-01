import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'

export interface AuthState {
    user: User | null
    profile: UserProfile | null
    isLoading: boolean
    isConfigured: boolean
    isAdmin: boolean
    signOut: () => Promise<void>
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
    const [adminAccess, setAdminAccess] = useState<{ userId: string; allowed: boolean } | null>(null)
    const userId = user?.id
    const isAdmin = !!userId && adminAccess?.userId === userId && adminAccess.allowed

    useEffect(() => {
        if (!userId || !isSupabaseConfigured) return
        let active = true
        void Promise.resolve(supabase.rpc('is_active_admin')).then(
            ({ data, error }) => { if (active) setAdminAccess({ userId, allowed: !error && data === true }) },
            () => { if (active) setAdminAccess({ userId, allowed: false }) },
        )
        return () => { active = false }
    }, [userId])

    const loadProfile = useCallback(async (currentUser: User | null) => {
        if (!currentUser) {
            setProfile(null)
            return
        }
        const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle()
        setProfile(data as UserProfile | null)
    }, [])

    useEffect(() => {
        if (!isSupabaseConfigured) return

        let active = true
        supabase.auth.getSession().then(async ({ data }) => {
            if (!active) return
            const currentUser = data.session?.user ?? null
            setUser(currentUser)
            await loadProfile(currentUser)
            if (active) setIsLoading(false)
        })

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null
            setUser(currentUser)
            void loadProfile(currentUser)
            setIsLoading(false)
        })

        return () => {
            active = false
            listener.subscription.unsubscribe()
        }
    }, [loadProfile])

    const signOut = useCallback(async () => {
        if (!isSupabaseConfigured) return
        const { error } = await supabase.auth.signOut()
        if (error) throw error
    }, [])

    const refreshProfile = useCallback(async () => loadProfile(user), [loadProfile, user])

    const value = useMemo<AuthState>(() => ({
        user,
        profile,
        isLoading,
        isConfigured: isSupabaseConfigured,
        isAdmin,
        signOut,
        refreshProfile,
    }), [user, profile, isLoading, isAdmin, signOut, refreshProfile])

    return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
    const value = useContext(AuthContext)
    if (!value) throw new Error('useAuth must be used inside AuthProvider')
    return value
}
