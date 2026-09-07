/**
 * Parse response JSON safely — guards against non-JSON responses (HTML
 * error pages, "Server action not found" text, proxy errors) that would
 * otherwise throw `SyntaxError: Unexpected token '<'`.
 *
 * Returns `null` when the body is not valid JSON.
 */
export async function safeJson(response: Response): Promise<Record<string, unknown> | null> {
  const ct = response.headers.get('content-type') || ''
  if (!ct.includes('application/json')) return null
  try {
    const data = await response.json()
    return typeof data === 'object' && data !== null ? data : null
  } catch {
    return null
  }
}

/**
 * Convenience wrapper: fetch + safe JSON parse in one call.
 * Rejects with a user-friendly message when the server returns non-JSON.
 */
export async function fetchJson(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }> {
  const response = await fetch(input, init)
  const data = await safeJson(response)
  return { ok: response.ok, status: response.status, data }
}
