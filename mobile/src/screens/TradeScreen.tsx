import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { RouteProp } from '@react-navigation/native'
import { useAccount } from '../hooks/useAccount'
import { getOrderByReference, placeOrder } from '../api/trade'
import { addRecentOrder, setRecentOrderId } from '../store/recentOrders'
import Card from '../components/Card'
import { colors, radius, spacing } from '../theme/colors'
import type { RootTabParamList } from '../navigation/types'

export default function TradeScreen({ route }: { route: RouteProp<RootTabParamList, 'Trade'> }) {
  const { accountNumber, isLoading: accountLoading } = useAccount()
  const queryClient = useQueryClient()
  const [symbol, setSymbol] = useState(route.params?.symbol ?? 'AAPL')
  const [exchange, setExchange] = useState(route.params?.exchange ?? 'NSDQ')
  const [side, setSide] = useState<1 | 2>(1)
  const [quantity, setQuantity] = useState('1')
  const [price, setPrice] = useState('')

  useEffect(() => {
    if (route.params?.symbol) setSymbol(route.params.symbol)
    if (route.params?.exchange) setExchange(route.params.exchange)
  }, [route.params?.symbol, route.params?.exchange])

  const mutation = useMutation({
    mutationFn: placeOrder,
    onSuccess: async (data, variables) => {
      addRecentOrder(queryClient, {
        id: variables.externalOrderId,
        placedAt: Date.now(),
        accountNumber: variables.accountNumber,
        symbol: variables.symbol,
        exchange: variables.exchange,
        side: variables.orderSide as 1 | 2,
        quantity: variables.quantity,
        price: variables.price,
        status: data.status,
        reason: data.reason,
        orderReferenceId: data.orderReferenceId,
      })

      // placeOrder only returns orderReferenceId — resolve the real orderId
      // (needed for amend/cancel) right away so the Orders tab can auto-fill it.
      if (data.orderReferenceId) {
        try {
          const details = await getOrderByReference(data.orderReferenceId, variables.securityType)
          if (details.orderId) {
            setRecentOrderId(queryClient, variables.accountNumber, variables.externalOrderId, details.orderId)
          }
        } catch {
          // best-effort — the user can still fill amend/cancel in manually
        }
      }
    },
  })

  const onSubmit = () => {
    if (!accountNumber) return
    const qty = Number(quantity) || 0
    const limitPrice = price === '' ? undefined : Number(price)
    mutation.mutate({
      externalOrderId: `mobile-${Date.now()}`,
      accountNumber,
      symbol,
      exchange,
      quantity: qty,
      orderType: limitPrice === undefined ? '1' : '2',
      orderSide: side,
      price: limitPrice,
      tif: 0,
      tradingSession: 'REG',
      orderValue: (limitPrice ?? 0) * qty,
      securityType: 'CS',
    })
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Place order</Text>

        {accountLoading ? (
          <ActivityIndicator color={colors.brand} />
        ) : !accountNumber ? (
          <Text style={styles.error}>No trading-enabled account found for this customer.</Text>
        ) : (
          <Text style={styles.accountLine}>Account {accountNumber}</Text>
        )}

        <Card style={styles.card}>
          <Field label="Symbol">
            <TextInput
              value={symbol}
              onChangeText={(t) => setSymbol(t.toUpperCase())}
              style={styles.input}
              autoCapitalize="characters"
            />
          </Field>
          <Field label="Exchange">
            <TextInput
              value={exchange}
              onChangeText={(t) => setExchange(t.toUpperCase())}
              style={styles.input}
              autoCapitalize="characters"
            />
          </Field>

          <View style={styles.sideRow}>
            <SideButton label="Buy" active={side === 1} activeColor={colors.success} onPress={() => setSide(1)} />
            <SideButton label="Sell" active={side === 2} activeColor={colors.danger} onPress={() => setSide(2)} />
          </View>

          <Field label="Quantity">
            <TextInput value={quantity} onChangeText={setQuantity} keyboardType="number-pad" style={styles.input} />
          </Field>
          <Field label="Limit price (blank = market)">
            <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={styles.input} />
          </Field>

          <TouchableOpacity
            style={[styles.submitBtn, (!accountNumber || mutation.isPending) && styles.submitBtnDisabled]}
            onPress={onSubmit}
            disabled={!accountNumber || mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>Place {side === 1 ? 'buy' : 'sell'} order</Text>
            )}
          </TouchableOpacity>

          {mutation.data && (
            <View style={styles.resultBox}>
              <Text style={styles.resultStatus}>{mutation.data.status}</Text>
              <Text style={styles.resultReason}>{mutation.data.reason}</Text>
              {mutation.data.orderReferenceId && (
                <Text style={styles.resultRef}>Ref: {mutation.data.orderReferenceId}</Text>
              )}
            </View>
          )}
          {mutation.isError && <Text style={styles.error}>{(mutation.error as Error).message}</Text>}
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  )
}

function SideButton({
  label,
  active,
  activeColor,
  onPress,
}: {
  label: string
  active: boolean
  activeColor: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.sideBtn, active && { backgroundColor: activeColor }]}
      onPress={onPress}
    >
      <Text style={[styles.sideBtnText, active && { color: colors.white }]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  accountLine: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.md },
  card: { marginTop: spacing.md },
  field: { marginBottom: spacing.md },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.textPrimary,
  },
  sideRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  sideBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
  },
  sideBtnText: { fontWeight: '600', color: colors.textPrimary },
  submitBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: colors.white, fontWeight: '600', fontSize: 15 },
  resultBox: { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.cardMuted, borderRadius: radius.md },
  resultStatus: { fontWeight: '700', color: colors.textPrimary },
  resultReason: { color: colors.textSecondary, marginTop: 2 },
  resultRef: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  error: { color: colors.danger, marginTop: spacing.sm },
})
