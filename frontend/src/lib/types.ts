export type StudyLevel = 'primary' | 'secondary' | 'university'
export type AppLanguage = 'en' | 'fr' | 'rw'
export type ContentLanguage = 'en' | 'fr' | 'rw'

export interface LibraryItem {
    id: string
    user_id: string
    type: 'text' | 'transcript' | 'translation' | 'explanation' | 'audio'
    title: string
    content: string
    source_lang?: ContentLanguage
    target_lang?: ContentLanguage
    audio_path?: string
    is_favourite: boolean
    created_at: string
    updated_at: string
}

export interface HistoryEntry {
    id: string
    tool: 'tts' | 'stt' | 'translate'
    input_text: string
    output_text?: string
    user_id?: string
    source_lang: ContentLanguage
    target_lang?: ContentLanguage
    created_at: string
    is_saved: boolean
}

export interface StudyPack {
    id: string
    user_id: string
    name: string
    original_text?: string
    transcript?: string
    translation?: string
    explanation?: string
    audio_url?: string
    created_at: string
}

export interface UserProfile {
    id: string
    display_name: string
    study_level: StudyLevel
    interface_language: AppLanguage
    default_input_language: ContentLanguage
    default_output_language: ContentLanguage
    created_at: string
}

export interface Toast {
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    duration?: number
}
