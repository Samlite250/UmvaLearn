import { supabase, isSupabaseConfigured } from './supabase'
import type { ContentLanguage, HistoryEntry, LibraryItem } from './types'

const GUEST_HISTORY_KEY = 'umvalearn-guest-history'
const MAX_GUEST_HISTORY = 50

type HistoryInput = {
    tool: HistoryEntry['tool']
    input_text: string
    output_text?: string
    source_lang: ContentLanguage
    target_lang?: ContentLanguage
}

type LibraryInput = {
    type: LibraryItem['type']
    title: string
    content: string
    source_lang?: ContentLanguage
    target_lang?: ContentLanguage
    audio_path?: string
}

function readGuestHistory(): HistoryEntry[] {
    try {
        return JSON.parse(localStorage.getItem(GUEST_HISTORY_KEY) ?? '[]') as HistoryEntry[]
    } catch {
        return []
    }
}

export async function recordHistory(input: HistoryInput): Promise<void> {
    const user = isSupabaseConfigured ? (await supabase.auth.getUser()).data.user : null
    if (user) {
        const { error } = await supabase.from('history').insert({ ...input, user_id: user.id })
        if (error) throw error
        window.dispatchEvent(new Event('umvalearn:history'))
        return
    }

    const entry: HistoryEntry = {
        ...input,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        is_saved: false,
    }
    localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify([entry, ...readGuestHistory()].slice(0, MAX_GUEST_HISTORY)))
    window.dispatchEvent(new Event('umvalearn:history'))
}

export async function getHistory(): Promise<HistoryEntry[]> {
    const user = isSupabaseConfigured ? (await supabase.auth.getUser()).data.user : null
    if (!user) return readGuestHistory()
    const { data, error } = await supabase.from('history').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as HistoryEntry[]
}

export async function clearHistory(): Promise<void> {
    const user = isSupabaseConfigured ? (await supabase.auth.getUser()).data.user : null
    if (!user) {
        localStorage.removeItem(GUEST_HISTORY_KEY)
        return
    }
    const { error } = await supabase.from('history').delete().eq('user_id', user.id)
    if (error) throw error
}

export async function deleteHistoryItem(id: string): Promise<void> {
    const user = isSupabaseConfigured ? (await supabase.auth.getUser()).data.user : null
    if (!user) {
        localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(readGuestHistory().filter((item) => item.id !== id)))
        return
    }
    const { error } = await supabase.from('history').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error
}

export async function saveLibraryItem(input: LibraryInput): Promise<LibraryItem> {
    const user = isSupabaseConfigured ? (await supabase.auth.getUser()).data.user : null
    if (!user) throw new Error('Sign in to save items to your Library.')
    const { data, error } = await supabase.from('library_items').insert({ ...input, user_id: user.id }).select().single()
    if (error) throw error
    return data as LibraryItem
}

export async function getLibraryItems(): Promise<LibraryItem[]> {
    const user = isSupabaseConfigured ? (await supabase.auth.getUser()).data.user : null
    if (!user) return []
    const { data, error } = await supabase.from('library_items').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as LibraryItem[]
}

export async function updateLibraryItem(id: string, changes: Partial<Pick<LibraryItem, 'title' | 'is_favourite'>>): Promise<void> {
    const { error } = await supabase.from('library_items').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
}

export async function deleteLibraryItem(id: string): Promise<void> {
    const { error } = await supabase.from('library_items').delete().eq('id', id)
    if (error) throw error
}
