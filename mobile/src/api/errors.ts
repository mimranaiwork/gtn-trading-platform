import { isAxiosError } from 'axios'

/**
 * Our backend forwards GTN's real response body (including on failure) with GTN's
 * original status code — so axios throws with the real reason sitting in
 * error.response.data, and error.message is just a generic "Request failed with
 * status code 400". This pulls the actual GTN reason out instead.
 */
export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { status?: string; reason?: string } | string | undefined
    if (data && typeof data === 'object' && data.reason) {
      return data.status ? `${data.status}: ${data.reason}` : data.reason
    }
    if (typeof data === 'string' && data.trim()) return data
    if (error.response?.status) return `HTTP ${error.response.status} — ${error.message}`
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Unknown error'
}
