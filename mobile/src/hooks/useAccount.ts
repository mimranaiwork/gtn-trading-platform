import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { getCustomerDetails, primaryAccountNumber } from '../api/account'

export function useAccount() {
  const { session } = useAuth()
  const customerNumber = session?.customerNumber

  const query = useQuery({
    queryKey: ['customer-account', customerNumber],
    queryFn: () => getCustomerDetails(customerNumber!),
    enabled: !!customerNumber,
  })

  const accountNumber = query.data ? primaryAccountNumber(query.data) : null
  const cash = query.data?.cashAccounts?.[0]

  return { ...query, accountNumber, cash, customerNumber }
}
