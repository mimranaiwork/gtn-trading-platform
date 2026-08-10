import { apiClient } from './client'

export interface CustomerSession {
  customerNumber: string
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: number
  refreshTokenExpiresAt: number
}

interface GtnTokenResponse {
  status: string
  reason: string
  rejectCode: number
  accessToken?: string
  refreshToken?: string
  accessTokenExpiresAt?: number
  refreshTokenExpiresAt?: number
}

/**
 * Real GTN customer-token exchange (POST /api/auth/login -> backend AuthController ->
 * GTN's POST /trade/auth/customer/token). GTN has no password field in this flow — the
 * institution (our backend, already authenticated) vouches for the customer number.
 * Throws with GTN's real rejection reason on failure (e.g. unknown customer number).
 */
export async function login(customerNumber: string): Promise<CustomerSession> {
  const { data } = await apiClient.post<GtnTokenResponse>('/api/auth/login', { customerNumber })
  if (data.status !== 'SUCCESS' || !data.accessToken || !data.refreshToken) {
    throw new Error(data.reason || 'Login failed')
  }
  return {
    customerNumber,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    accessTokenExpiresAt: data.accessTokenExpiresAt!,
    refreshTokenExpiresAt: data.refreshTokenExpiresAt!,
  }
}
