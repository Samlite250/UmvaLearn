import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function PageContent({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
    return <article className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <Link to="/home" className="text-sm font-semibold text-emerald-700 hover:underline">← Back to dashboard</Link>
        <header className="mb-6 mt-5"><h1 className="text-3xl font-bold text-navy-900">{title}</h1><p className="mt-3 leading-relaxed text-gray-600">{intro}</p></header>
        <div className="tool-panel space-y-6 rounded-2xl p-5 leading-relaxed text-gray-700 sm:p-8 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-navy-900 [&_a]:font-medium [&_a]:text-emerald-700 [&_a:hover]:underline">{children}</div>
    </article>
}
