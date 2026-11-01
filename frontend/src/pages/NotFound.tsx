import { Link } from 'react-router-dom'

export default function NotFound() {
    return <div className="mx-auto max-w-xl px-4 py-20 text-center"><p className="font-semibold text-emerald-700">404</p><h1 className="mt-2 text-3xl font-bold text-navy-900">Page not found</h1><p className="my-5 text-gray-600">This address does not match a page in UmvaLearn.</p><div className="flex flex-wrap justify-center gap-3"><Link to="/home" className="btn-primary">Open dashboard</Link><Link to="/help" className="btn-secondary">Get help</Link></div></div>
}
