import type { QueryClient } from '@tanstack/react-query'

export interface RecentOrder {
  id: string
  placedAt: number
  accountNumber: string
  symbol: string
  exchange: string
  side: 1 | 2
  quantity: number
  price?: number
  status: string
  reason: string
  orderReferenceId?: string
}

export const recentOrdersKey = (accountNumber: string) => ['recent-orders', accountNumber] as const

/**
 * GTN's "open orders" endpoint only returns orders still resting at the exchange —
 * this sandbox account has $0 buying power, so every order gets rejected instantly
 * and never appears there. The order-search endpoint (full history) needs a date
 * format GTN's docs don't specify and every format tried was rejected as "invalid
 * sTime". Rather than keep guessing, track what was actually submitted locally —
 * we already have the full order + GTN's real response from the moment it was placed.
 */
export function addRecentOrder(queryClient: QueryClient, order: RecentOrder) {
  queryClient.setQueryData<RecentOrder[]>(recentOrdersKey(order.accountNumber), (prev = []) =>
    [order, ...prev].slice(0, 50),
  )
}
