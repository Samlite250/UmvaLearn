interface ApiPayload {
    provider?: string
    error?: string
    code?: string
    retryable?: boolean
    translatedText: string
    transcript: string
    explanation: string
    audioBase64: string
    audioMimeType: string
}

/** Read a JSON API object without leaking parser errors or HTML proxy pages into the UI. */
export async function readApiResponse(response: Response, requiredFields: string[] = []): Promise<ApiPayload> {
    const status = `HTTP ${response.status}`
    let text: string
    try { text = await response.text() } catch {
        throw new Error(`The server response was interrupted (${status}). Please retry.`)
    }
    if (!text.trim()) {
        throw new Error(`The server returned an empty response (${status}). Check that the backend is running, then retry.`)
    }
    let data: unknown
    try { data = JSON.parse(text) } catch {
        throw new Error(`The server returned an invalid response (${status}). Check the backend connection and retry.`)
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error(`The server returned an invalid response (${status}). Please retry.`)
    }
    if (response.ok && requiredFields.some(field => typeof (data as Record<string, unknown>)[field] !== 'string' || !(data as Record<string, unknown>)[field])) {
        throw new Error(`The server response is incomplete (${status}). Please retry.`)
    }
    return data as ApiPayload
}
