const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '')

/** Build an API URL for local same-origin development or a separately hosted backend. */
export function apiUrl(path: `/api/${string}`): string {
    return configuredApiUrl ? `${configuredApiUrl}${path}` : path
}
