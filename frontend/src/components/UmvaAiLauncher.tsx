import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'

const UMVA_AI_IMAGE = '/Umva%20ai.png'

export function UmvaAiLauncher() {
    const [open, setOpen] = useState(false)
    const [minimized, setMinimized] = useState(false)

    if (minimized) {
        return (
            <aside className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-1 z-30 sm:bottom-7 sm:right-2 lg:bottom-8">
                <button
                    type="button"
                    onClick={() => setMinimized(false)}
                    className="group relative grid h-9 w-9 place-items-center rounded-l-xl rounded-r-md border border-r-0 border-emerald-200 bg-white p-1.5 shadow-md transition hover:w-11 hover:border-emerald-400 hover:shadow-lg"
                    aria-label="Restore Umva AI assistant"
                    title="Show Umva AI"
                >
                    <img src={UMVA_AI_IMAGE} alt="" className="h-full w-full object-contain" />
                    <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
                </button>
            </aside>
        )
    }

    return (
        <aside className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-30 sm:bottom-7 sm:right-7 lg:bottom-8 lg:right-8">
            {open && (
                <div
                    id="umva-ai-preview"
                    className="mb-3 w-[calc(100vw-1.5rem)] max-w-sm overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-2xl shadow-emerald-950/15"
                    role="dialog"
                    aria-label="Umva AI assistant"
                >
                    <div className="flex items-center justify-between bg-emerald-800 px-4 py-3 text-white">
                        <div className="flex items-center gap-2.5">
                            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white p-1 shadow-sm">
                                <img src={UMVA_AI_IMAGE} alt="" className="h-full w-full object-contain" />
                            </span>
                            <div>
                                <p className="text-sm font-bold">Umva AI</p>
                                <p className="flex items-center gap-1.5 text-[11px] text-emerald-100">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                                    Your learning assistant
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-emerald-100 transition hover:bg-white/10 hover:text-white"
                            aria-label="Close Umva AI"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-5 text-center">
                        <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                            <Sparkles size={20} aria-hidden="true" />
                        </span>
                        <p className="font-semibold text-navy-900">Umva AI is being prepared</p>
                        <p className="mt-1 text-sm leading-5 text-gray-500">
                            Soon you will be able to ask questions and get study support here.
                        </p>
                    </div>
                </div>
            )}

            <div className="relative ml-auto w-fit">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="group relative ml-auto grid h-12 w-12 place-items-center rounded-full border border-emerald-100 bg-white p-1.5 shadow-lg shadow-emerald-950/20 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-xl active:translate-y-0 sm:h-[3.25rem] sm:w-[3.25rem] sm:p-2"
                aria-expanded={open}
                aria-controls="umva-ai-preview"
                aria-label="Open Umva AI assistant"
            >
                <img
                    src={UMVA_AI_IMAGE}
                    alt=""
                    className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                />
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
                <span className="pointer-events-none absolute right-[calc(100%+0.65rem)] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 sm:block">
                    Ask Umva AI
                </span>
            </button>
            <button
                type="button"
                onClick={() => { setOpen(false); setMinimized(true) }}
                className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                aria-label="Minimize Umva AI assistant"
                title="Minimize"
            >
                <X size={11} strokeWidth={2.5} />
            </button>
            </div>
        </aside>
    )
}
