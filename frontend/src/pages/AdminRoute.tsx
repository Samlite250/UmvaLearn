import { lazy, Suspense } from 'react'

const Admin = lazy(() => import('./Admin'))

export default function AdminRoute() {
    return <Suspense fallback={<p className="p-8 text-sm text-slate-500" role="status">Loading admin workspace…</p>}><Admin /></Suspense>
}
