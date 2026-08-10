import { apiClient } from './client'

export interface PlaceOrderRequest {
  externalOrderId: string
  accountNumber: string
  symbol: string
  exchange: string
  quantity: number
  orderType: string
  orderSide: number
  price?: number
  tif: number
  tradingSession: string
  orderValue: number
  securityType: string
}

export async function placeOrder(order: PlaceOrderRequest) {
  const { data } = await apiClient.post('/api/orders', order)
  return data
}

export async function getOpenOrders() {
  const { data } = await apiClient.get('/api/orders/open')
  return data
}
