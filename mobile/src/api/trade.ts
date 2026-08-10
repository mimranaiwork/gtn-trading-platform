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

export interface GtnActionResult {
  status: string
  reason: string
  rejectCode?: number
  orderReferenceId?: string
}

export async function placeOrder(order: PlaceOrderRequest): Promise<GtnActionResult> {
  const { data } = await apiClient.post('/api/orders', order)
  return data
}

export interface OrderDetails {
  status: string
  reason: string
  orderId?: string
  orderNumber?: string
  orderReferenceId?: string
  orderStatus?: string
  orderRejectReason?: string
}

/** Resolves the real GTN orderId from an orderReferenceId — that's all placeOrder() returns. */
export async function getOrderByReference(orderReferenceId: string, securityType = 'CS'): Promise<OrderDetails> {
  const { data } = await apiClient.get('/api/orders/lookup', { params: { orderReferenceId, securityType } })
  return data
}

export interface AmendOrderRequest {
  orderId: string
  orderReferenceId: string
  amount: number
  quantity?: number
  price?: number
  tif?: number
  orderType?: string
}

export async function amendOrder(order: AmendOrderRequest): Promise<GtnActionResult> {
  const { data } = await apiClient.post('/api/orders/amend', order)
  return data
}

export interface CancelOrderRequest {
  orderId: string
  orderReferenceId: string
}

export async function cancelOrder(order: CancelOrderRequest): Promise<GtnActionResult> {
  const { data } = await apiClient.post('/api/orders/cancel', order)
  return data
}

export interface OpenOrder {
  orderId: string
  orderNumber?: string
  symbol: string
  exchange: string
  orderSide: string
  orderQty: number
  filledQty: number
  price: number
  orderStatus: string
  accountNumber: string
}

export async function getOpenOrders(accountNumber: string): Promise<OpenOrder[]> {
  const { data } = await apiClient.get('/api/orders/open', { params: { accountNumber } })
  return data?.list ?? []
}

export interface OrderSearchParams {
  accountNumber?: string
  customerNumber?: string
  symbol?: string
  orderStatus?: string
  securityType?: string
}

/**
 * GTN's order-search date filters (sTime/eTime) need a format that isn't documented
 * anywhere reachable — 7 formats were tried live (yyyyMMddHHmmss, ISO8601, epoch
 * seconds/millis, GTN's own "yyyy/MM/dd-HH:mm:ss" convention used elsewhere, date-only,
 * ddMMyyyy) and every one came back "invalid sTime". Omitting them entirely (as this
 * does) still requires accountNumber+securityType at minimum per GTN's own validation
 * messages; results reflect whatever GTN accepts without an explicit date range.
 */
export async function searchOrders(params: OrderSearchParams): Promise<any[]> {
  const { data } = await apiClient.get('/api/orders/search', { params })
  return data?.list ?? []
}

export interface ExerciseOptionRequest {
  accountNumber: string
  symbol: string
  exchange: string
  baseExchange: string
  exerciseQuantity: number
  holdingType: 'LONG' | 'SHORT'
}

export async function requestOptionExercise(req: ExerciseOptionRequest): Promise<GtnActionResult> {
  const { data } = await apiClient.post('/api/orders/exercise-option', req)
  return data
}

export async function listOptionExerciseRequests(params: {
  customerNumber?: string
  accountNumber?: string
}): Promise<any[]> {
  const { data } = await apiClient.get('/api/orders/exercise-requests', { params })
  return data?.list ?? []
}
