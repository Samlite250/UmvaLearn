import type { AdminActivity } from './adminAccess'

export type AdminPeriod = '7' | '30' | 'all'
export function inPeriod(timestamp: string, period: AdminPeriod, now = new Date()): boolean {
    const time = new Date(timestamp).getTime()
    if (!Number.isFinite(time) || time > now.getTime()) return false
    if (period === 'all') return true
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - (Number(period) - 1))
    return time >= start.getTime()
}

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
export function activitySeries(events: AdminActivity[], days: number, now = new Date()) {
    const buckets = Array.from({ length: days }, (_, index) => {
        const day = new Date(now)
        day.setHours(0, 0, 0, 0)
        day.setDate(day.getDate() - (days - index - 1))
        return { key: dayKey(day), date: day, success: 0, failed: 0 }
    })
    const byDay = new Map(buckets.map(bucket => [bucket.key, bucket]))
    for (const event of events) {
        const date = new Date(event.created_at)
        if (date.getTime() > now.getTime()) continue
        const bucket = byDay.get(dayKey(date))
        if (bucket) bucket[event.success ? 'success' : 'failed']++
    }
    return buckets
}

export const toolKey = (event: AdminActivity) => event.tool || event.event_type.replace(/_request$/, '')
export const toolName = (key: string) => ({ tts: 'Text to Speech', stt: 'Speech to Text', translate: 'Translation', explain: 'Explanations', error: 'Other events' })[key] || key.replaceAll('_', ' ')

export function adminCsv(headers: string[], rows: (string | number | boolean | null)[][]): string {
    const cell = (value: string | number | boolean | null) => {
        let text = value === null ? '' : String(value)
        // Prevent spreadsheet programs from interpreting user-supplied cells as formulas.
        if (/^[\s]*[=+@-]|^[\t\r\n]/.test(text)) text = `'${text}`
        return `"${text.replaceAll('"', '""')}"`
    }
    return '\uFEFF' + [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n')
}
