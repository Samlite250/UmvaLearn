import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/layout/Logo'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function ResetPassword({ update = false }: { update?: boolean }) {
    const { user, isLoading } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmation, setConfirmation] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [done, setDone] = useState(false)
    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setError('')
        if (!isSupabaseConfigured) { setError('Account services are currently unavailable. Please try again later.'); return }
        if (update && (!user || password.length < 8 || password !== confirmation)) {
            setError(!user ? 'Open a valid reset link from your email first.' : 'Use at least 8 characters and make sure both passwords match.'); return
        }
        setBusy(true)
        try {
            const result = update
                ? await supabase.auth.updateUser({ password })
                : await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?flow=recovery` })
            if (result.error) throw result.error
            setDone(true)
            setPassword(''); setConfirmation('')
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to complete this request. Please try again.') }
        finally { setBusy(false) }
    }
    return <div className="flex min-h-dvh items-center justify-center bg-mint-50 p-4"><div className="w-full max-w-sm"><div className="mb-4 flex justify-center"><Logo size="md" /></div><div className="tool-panel rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-navy-900">{update ? 'Choose a new password' : 'Reset your password'}</h1>
        {done ? <div className="mt-4 space-y-4" role="status"><p>{update ? 'Your password has been updated.' : 'If an account exists for that email, you will receive a password reset link. Check your inbox and spam folder.'}</p><Link className="btn-primary" to={update ? '/home' : '/auth/signin'}>{update ? 'Open dashboard' : 'Back to sign in'}</Link></div> : <>
            <p className="my-4 text-sm text-gray-600">{update ? 'Enter a new password with at least 8 characters.' : 'Enter your account email and we will send a reset link.'}</p>
            {update && !isLoading && !user ? <p className="mb-4 text-sm text-amber-800">Open the reset link from your email, or <Link to="/auth/reset" className="underline">request a new link</Link>.</p> : <form onSubmit={submit} className="space-y-4">
                {update ? <><label className="block text-sm font-medium">New password<input autoComplete="new-password" type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} className="input-field mt-1" /></label><label className="block text-sm font-medium">Confirm password<input autoComplete="new-password" type="password" minLength={8} required value={confirmation} onChange={e => setConfirmation(e.target.value)} className="input-field mt-1" /></label></> : <label className="block text-sm font-medium">Email address<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="input-field mt-1" /></label>}
                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button type="submit" loading={busy} disabled={update && isLoading} className="w-full">{update ? 'Save password' : 'Send reset link'}</Button>
            </form>}
            <Link to="/auth/signin" className="mt-5 block text-sm font-semibold text-emerald-700">Back to sign in</Link>
        </>}
    </div></div></div>
}
