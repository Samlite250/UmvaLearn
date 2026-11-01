import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, Eye, EyeOff } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { z } from 'zod'

const signupSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
})

export default function SignUp() {
    const navigate = useNavigate()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const result = signupSchema.safeParse({ name, email, password })
        if (!result.success) {
            setError(result.error.issues[0]?.message ?? 'Please check your details.')
            return
        }
        if (!isSupabaseConfigured) {
            setError('Authentication is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
            return
        }
        setLoading(true)
        setError(null)
        try {
            const { error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { display_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback` },
            })
            if (authError) throw authError
            setSuccess(true)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-mint-50 flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-lg p-5 sm:p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">✉️</span>
                    </div>
                    <h2 className="text-xl font-bold text-navy-900 mb-2">Check your email</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        We've sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
                    </p>
                    <Button variant="primary" className="w-full" onClick={() => navigate('/home')}>
                        Continue to UmvaLearn
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-mint-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="flex justify-center mb-8">
                    <Logo size="lg" />
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-5 sm:p-8">
                    <h1 className="text-2xl font-bold text-navy-900 mb-1">Create your account</h1>
                    <p className="text-sm text-gray-500 mb-6">Free, forever. No credit card needed.</p>

                    {!isSupabaseConfigured && (
                        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                            ⚠️ Supabase is not configured. Auth will not function until credentials are added to <code>.env</code>.
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-xs font-semibold text-gray-600 mb-1.5">Display name</label>
                            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="input-field" required />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input-field" required />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    id="password" type={showPw ? 'text' : 'password'} value={password}
                                    onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"
                                    className="input-field pr-10" required minLength={8}
                                />
                                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label={showPw ? 'Hide password' : 'Show password'}>
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading} icon={<UserPlus size={17} />}>
                            Create account
                        </Button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Already have an account?{' '}
                        <Link to="/auth/signin" className="text-emerald-700 font-semibold hover:underline">Sign in</Link>
                    </p>
                </div>

                <div className="text-center mt-4">
                    <Link to="/home" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Continue as guest →</Link>
                </div>
            </div>
        </div>
    )
}
