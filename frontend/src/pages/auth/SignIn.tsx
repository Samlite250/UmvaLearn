import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LogIn, Eye, EyeOff } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export default function SignIn() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isSupabaseConfigured) {
            setError('Authentication is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
            return
        }
        setLoading(true)
        setError(null)
        try {
            const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
            if (authError) throw authError
            navigate(params.get('next') === '/admin' ? '/admin' : '/home', { replace: true })
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-mint-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="flex justify-center mb-8">
                    <Logo size="lg" />
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-5 sm:p-8">
                    <h1 className="text-2xl font-bold text-navy-900 mb-1">Welcome back</h1>
                    <p className="text-sm text-gray-500 mb-6">Sign in to your UmvaLearn account</p>

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
                            <label htmlFor="email" className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="input-field"
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input-field pr-10"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    aria-label={showPw ? 'Hide password' : 'Show password'}
                                >
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="flex justify-end mt-1.5">
                                <Link to="/auth/reset" className="text-xs text-emerald-700 hover:underline">Forgot password?</Link>
                            </div>
                        </div>

                        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading} icon={<LogIn size={17} />}>
                            Sign In
                        </Button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Don't have an account?{' '}
                        <Link to="/auth/signup" className="text-emerald-700 font-semibold hover:underline">Create one free</Link>
                    </p>
                </div>

                <div className="text-center mt-4">
                    <Link to="/home" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                        Continue as guest →
                    </Link>
                </div>
            </div>
        </div>
    )
}
