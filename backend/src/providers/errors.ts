export class ProviderError extends Error {
    constructor(message: string, public status: number, public code: string, public retryable = false) { super(message) }
}

export async function openAIError(response: Response): Promise<never> {
    const data = await response.json().catch(() => ({})) as { error?: { code?: string; type?: string; message?: string } }
    const error = data.error
    if (['insufficient_quota', 'credit_balance_exhausted'].includes(error?.code ?? '') || error?.type === 'insufficient_quota') {
        throw new ProviderError('OpenAI features are unavailable because the API account has no credits remaining. Add API credits, then retry.', 402, 'openai_quota_exhausted')
    }
    if ([401, 403].includes(response.status)) throw new ProviderError('OpenAI access is unavailable. Check the backend API key and project permissions.', 503, 'openai_access_error')
    if (response.status === 429) throw new ProviderError('OpenAI is receiving too many requests. Please wait and retry.', 429, 'openai_rate_limited', true)
    throw new ProviderError('OpenAI could not complete the request. Please try again.', 502, 'openai_provider_error', true)
}

export function providerErrorResponse(error: unknown, fallback: string): Response {
    if (error instanceof ProviderError) return Response.json({ error: error.message, code: error.code, retryable: error.retryable }, { status: error.status })
    return Response.json({ error: error instanceof Error ? error.message : fallback, retryable: true }, { status: 502 })
}
