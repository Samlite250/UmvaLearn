import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export default function AuthCallback() {
    const navigate = useNavigate()
    const started = useRef(false)
    const [error, setError] = useState('')
    useEffect(() => {
        if (started.current) return
        started.current = true
        const complete = async () => {
            const url = new URL(window.location.href)
            const hash = new URLSearchParams(url.hash.slice(1))
            const failure = url.searchParams.get('error_description') || hash.get('error_description')
            if (failure) throw new Error(failure)
            if (!isSupabaseConfigured) throw new Error('Account services are currently unavailable. Please try again later.')
            const code = url.searchParams.get('code')
            const result = code ? await supabase.auth.exchangeCodeForSession(code) : await supabase.auth.getSession()
            if (result.error) throw result.error
            if (!result.data.session) throw new Error('This link is invalid or has expired. Sign in or request a new password reset link.')
            navigate(url.searchParams.get('flow') === 'recovery' || hash.get('type') === 'recovery' ? '/auth/update-password' : '/home', { replace: true })
        }
        void complete().catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to finish signing in.'))
    }, [navigate])
    return <div className="flex min-h-dvh items-center justify-center bg-mint-50 p-4"><div className="tool-panel w-full max-w-md rounded-2xl p-6"><h1 className="text-xl font-bold">{error ? 'Unable to complete sign in' : 'Completing sign in…'}</h1>{error ? <><p className="my-4 text-sm text-red-700" role="alert">{error}</p><div className="flex flex-wrap gap-3"><Link className="btn-primary" to="/auth/signin">Sign in</Link><Link className="btn-secondary" to="/auth/reset">Reset password</Link></div></> : <p role="status" className="mt-3 text-gray-600">Checking your email link. Please wait.</p>}</div></div>
}
