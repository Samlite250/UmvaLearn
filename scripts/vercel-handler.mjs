// Adapt Vercel's Node request/response objects to the existing Fetch handlers.
export function vercelHandler(handler) {
  return async (req, res) => {
    try {
      const headers = new Headers()
      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
      }
      let body
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (req.body !== undefined) {
          body = typeof req.body === 'string' || Buffer.isBuffer(req.body)
            ? req.body : JSON.stringify(req.body)
        } else {
          const chunks = []
          for await (const chunk of req) chunks.push(Buffer.from(chunk))
          body = Buffer.concat(chunks)
        }
      }
      const request = new Request(new URL(req.url || '/', 'https://umvalearn.invalid'), {
        method: req.method, headers, body,
      })
      const response = await handler(request)
      res.statusCode = response.status
      response.headers.forEach((value, key) => res.setHeader(key, value))
      res.end(Buffer.from(await response.arrayBuffer()))
    } catch (error) {
      console.error('API handler failed:', error)
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Internal server error' }))
    }
  }
}
