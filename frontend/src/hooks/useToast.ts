import { useState, useCallback } from 'react'
import type { Toast } from '@/lib/types'

let toastIdCounter = 0

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([])

    const addToast = useCallback(
        (message: string, type: Toast['type'] = 'info', duration = 4000) => {
            const id = String(++toastIdCounter)
            const toast: Toast = { id, message, type, duration }
            setToasts((prev) => [...prev, toast])
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id))
            }, duration)
        },
        []
    )

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    return { toasts, addToast, removeToast }
}
