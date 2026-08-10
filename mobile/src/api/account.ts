import { apiClient } from './client'

export interface CustomerAccountDetails {
  customerNumber: string
  firstName?: string
  lastName?: string
  cashAccounts: Array<{
    cashAccountNumber: string
    currency: string
    balance: number
    securityAccounts: Array<{
      accountNumber: string
      status: string
      exchangeAccounts: Array<{ exchange: string; tradingEnabled: number }>
    }>
  }>
}

/** Real GTN call via the generic proxy — no dedicated backend endpoint needed. */
export async function getCustomerDetails(customerNumber: string): Promise<CustomerAccountDetails> {
  const { data } = await apiClient.get('/api/gtn/trade/bo/v1.2.1/customer/account', { params: { customerNumber } })
  return data
}

/** First trading-enabled security account for this customer, or null if none found. */
export function primaryAccountNumber(details: CustomerAccountDetails): string | null {
  for (const cash of details.cashAccounts ?? []) {
    for (const sec of cash.securityAccounts ?? []) {
      if (sec.status === '2') return sec.accountNumber
    }
  }
  return null
}
