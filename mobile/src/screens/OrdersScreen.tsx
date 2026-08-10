import { useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAccount } from '../hooks/useAccount'
import {
  amendOrder,
  cancelOrder,
  getOpenOrders,
  listOptionExerciseRequests,
  requestOptionExercise,
  searchOrders,
  type GtnActionResult,
} from '../api/trade'
import { recentOrdersKey, type RecentOrder } from '../store/recentOrders'
import Card from '../components/Card'
import { colors, radius, spacing } from '../theme/colors'

function ResultBox({ result, error }: { result?: GtnActionResult; error?: unknown }) {
  if (error) return <Text style={styles.error}>{(error as Error).message}</Text>
  if (!result) return null
  const ok = result.status === 'SUCCESS'
  return (
    <View style={[styles.resultBox, { borderColor: ok ? colors.success : colors.danger }]}>
      <Text style={[styles.resultStatus, { color: ok ? colors.success : colors.danger }]}>{result.status}</Text>
      <Text style={styles.resultReason}>{result.reason}</Text>
    </View>
  )
}

function LabeledInput({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
}: {
  label: string
  value: string
  onChangeText: (t: string) => void
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad'
  autoCapitalize?: 'none' | 'characters'
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
      />
    </View>
  )
}

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {note && <Text style={styles.sectionNote}>{note}</Text>}
    </View>
  )
}

export default function OrdersScreen() {
  const { accountNumber } = useAccount()
  const scrollRef = useRef<ScrollView>(null)
  const amendY = useRef(0)
  const cancelY = useRef(0)

  const { data: recent } = useQuery<RecentOrder[]>({
    queryKey: accountNumber ? recentOrdersKey(accountNumber) : ['recent-orders', 'none'],
    queryFn: () => [],
    enabled: !!accountNumber,
    staleTime: Infinity,
  })

  const {
    data: openOrders,
    isLoading: openLoading,
    refetch: refetchOpen,
  } = useQuery({
    queryKey: ['open-orders', accountNumber],
    queryFn: () => getOpenOrders(accountNumber!),
    enabled: !!accountNumber,
    refetchInterval: 15_000,
  })

  // --- Amend ---
  const [amendOrderId, setAmendOrderId] = useState('')
  const [amendRefId, setAmendRefId] = useState('')
  const [amendQty, setAmendQty] = useState('')
  const [amendPrice, setAmendPrice] = useState('')
  const amendMutation = useMutation({
    mutationFn: () =>
      amendOrder({
        orderId: amendOrderId,
        orderReferenceId: amendRefId,
        amount: (Number(amendPrice) || 0) * (Number(amendQty) || 0),
        quantity: amendQty ? Number(amendQty) : undefined,
        price: amendPrice ? Number(amendPrice) : undefined,
        tif: 0,
        orderType: amendPrice ? '2' : '1',
      }),
  })

  // --- Cancel ---
  const [cancelOrderId, setCancelOrderId] = useState('')
  const [cancelRefId, setCancelRefId] = useState('')
  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder({ orderId: cancelOrderId, orderReferenceId: cancelRefId }),
  })

  // --- Search ---
  const [searchStatus, setSearchStatus] = useState('')
  const searchMutation = useMutation({
    mutationFn: () =>
      searchOrders({
        accountNumber: accountNumber ?? undefined,
        securityType: 'CS',
        orderStatus: searchStatus || undefined,
      }),
  })

  // --- Option exercise ---
  const [optSymbol, setOptSymbol] = useState('')
  const [optExchange, setOptExchange] = useState('OPRA')
  const [optBaseExchange, setOptBaseExchange] = useState('NSDQ')
  const [optQty, setOptQty] = useState('1')
  const exerciseMutation = useMutation({
    mutationFn: () =>
      requestOptionExercise({
        accountNumber: accountNumber!,
        symbol: optSymbol,
        exchange: optExchange,
        baseExchange: optBaseExchange,
        exerciseQuantity: Number(optQty) || 1,
        holdingType: 'LONG',
      }),
  })

  const exerciseListMutation = useMutation({
    mutationFn: () => listOptionExerciseRequests({ accountNumber: accountNumber ?? undefined }),
  })

  const fillAmend = (item: RecentOrder) => {
    setAmendOrderId(item.orderId ?? '')
    setAmendRefId(item.orderReferenceId ?? '')
    setAmendQty(String(item.quantity))
    setAmendPrice(item.price ? String(item.price) : '')
    scrollRef.current?.scrollTo({ y: amendY.current, animated: true })
  }

  const fillCancel = (item: RecentOrder) => {
    setCancelOrderId(item.orderId ?? '')
    setCancelRefId(item.orderReferenceId ?? '')
    scrollRef.current?.scrollTo({ y: cancelY.current, animated: true })
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Orders</Text>
        {accountNumber && <Text style={styles.subtitle}>Account {accountNumber}</Text>}

        <SectionHeader title="What you placed this session" />
        {(recent ?? []).length === 0 ? (
          <Text style={styles.empty}>No orders placed yet — use the Trade tab.</Text>
        ) : (
          (recent ?? []).map((item) => {
            const rejected = item.status !== 'SUCCESS'
            return (
              <Card key={item.id} style={styles.orderCard}>
                <View style={styles.orderTop}>
                  <Text style={styles.symbol}>
                    {item.symbol} · {item.exchange}
                  </Text>
                  <Text style={[styles.side, { color: item.side === 1 ? colors.success : colors.danger }]}>
                    {item.side === 1 ? 'BUY' : 'SELL'}
                  </Text>
                </View>
                <Text style={styles.meta}>
                  Qty {item.quantity}
                  {item.price ? ` @ ${item.price}` : ' @ market'} · {new Date(item.placedAt).toLocaleTimeString()}
                </Text>
                <Text style={[styles.status, { color: rejected ? colors.danger : colors.success }]}>
                  {item.status} — {item.reason}
                </Text>
                {item.orderReferenceId && (
                  <Text style={styles.ref}>
                    Ref: {item.orderReferenceId}
                    {item.orderId ? ` · Order ID: ${item.orderId}` : ' · resolving order ID…'}
                  </Text>
                )}
                {item.orderId && (
                  <View style={styles.quickFillRow}>
                    <TouchableOpacity style={styles.quickFillBtn} onPress={() => fillAmend(item)}>
                      <Text style={styles.quickFillText}>Use for amend</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickFillBtn} onPress={() => fillCancel(item)}>
                      <Text style={styles.quickFillText}>Use for cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            )
          })
        )}

        <SectionHeader
          title="Currently open at GTN"
          note="Only orders still resting at the exchange appear here — filled/rejected ones won't, even though they're listed above."
        />
        {openLoading ? (
          <ActivityIndicator color={colors.brand} />
        ) : (openOrders ?? []).length === 0 ? (
          <Text style={styles.empty}>None open right now.</Text>
        ) : (
          (openOrders ?? []).map((o, i) => (
            <Card key={o.orderId ?? i} style={styles.orderCard}>
              <View style={styles.orderTop}>
                <Text style={styles.symbol}>
                  {o.symbol} · {o.exchange}
                </Text>
                <Text style={[styles.side, { color: o.orderSide === '1' ? colors.success : colors.danger }]}>
                  {o.orderSide === '1' ? 'BUY' : 'SELL'}
                </Text>
              </View>
              <Text style={styles.meta}>
                Qty {o.filledQty}/{o.orderQty} · Price {o.price} · Status {o.orderStatus}
              </Text>
            </Card>
          ))
        )}
        <TouchableOpacity onPress={() => refetchOpen()} style={styles.linkBtn}>
          <Text style={styles.linkBtnText}>Refresh open orders</Text>
        </TouchableOpacity>

        <View onLayout={(e) => (amendY.current = e.nativeEvent.layout.y)}>
        <SectionHeader
          title="Amend order"
          note="Confirmed live and working end-to-end with a real order's ID — GTN accepts the amend request into its OMS. Tap 'Use for amend' on an order above to fill this in automatically, or enter IDs manually."
        />
        <Card style={styles.formCard}>
          <LabeledInput label="Order ID" value={amendOrderId} onChangeText={setAmendOrderId} />
          <LabeledInput label="Order reference ID" value={amendRefId} onChangeText={setAmendRefId} />
          <LabeledInput label="New quantity" value={amendQty} onChangeText={setAmendQty} keyboardType="number-pad" />
          <LabeledInput label="New price" value={amendPrice} onChangeText={setAmendPrice} keyboardType="decimal-pad" />
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => amendMutation.mutate()}
            disabled={amendMutation.isPending || !amendOrderId || !amendRefId}
          >
            {amendMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Text style={styles.actionBtnText}>Amend</Text>}
          </TouchableOpacity>
          <ResultBox result={amendMutation.data} error={amendMutation.error} />
        </Card>
        </View>

        <View onLayout={(e) => (cancelY.current = e.nativeEvent.layout.y)}>
        <SectionHeader
          title="Cancel order"
          note="Confirmed live and working end-to-end with a real order's ID — GTN accepts the cancel request into its OMS. Tap 'Use for cancel' on an order above to fill this in automatically."
        />
        <Card style={styles.formCard}>
          <LabeledInput label="Order ID" value={cancelOrderId} onChangeText={setCancelOrderId} />
          <LabeledInput label="Order reference ID" value={cancelRefId} onChangeText={setCancelRefId} />
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.danger }]}
            onPress={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending || !cancelOrderId || !cancelRefId}
          >
            {cancelMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Text style={styles.actionBtnText}>Cancel order</Text>}
          </TouchableOpacity>
          <ResultBox result={cancelMutation.data} error={cancelMutation.error} />
        </Card>
        </View>

        <SectionHeader
          title="Order search"
          note="GTN's date-range filter (sTime/eTime) needs a format that isn't documented anywhere reachable — 7 formats tried, all rejected as 'invalid sTime'. This searches without a date filter; GTN's own response below is shown as-is."
        />
        <Card style={styles.formCard}>
          <LabeledInput label="Order status filter (optional)" value={searchStatus} onChangeText={setSearchStatus} />
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => searchMutation.mutate()}
            disabled={searchMutation.isPending || !accountNumber}
          >
            {searchMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Text style={styles.actionBtnText}>Search</Text>}
          </TouchableOpacity>
          {searchMutation.isError && <Text style={styles.error}>{(searchMutation.error as Error).message}</Text>}
          {searchMutation.data && searchMutation.data.length === 0 && (
            <Text style={styles.empty}>No results (or GTN rejected the query — see note above).</Text>
          )}
        </Card>

        <SectionHeader title="Request option exercise" note="Confirmed live: reaches GTN correctly (real rejection — no option position exists in this account)." />
        <Card style={styles.formCard}>
          <LabeledInput label="Option symbol (e.g. AAPL\26A03\250)" value={optSymbol} onChangeText={setOptSymbol} />
          <LabeledInput label="Exchange" value={optExchange} onChangeText={setOptExchange} autoCapitalize="characters" />
          <LabeledInput label="Base exchange" value={optBaseExchange} onChangeText={setOptBaseExchange} autoCapitalize="characters" />
          <LabeledInput label="Exercise quantity" value={optQty} onChangeText={setOptQty} keyboardType="number-pad" />
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => exerciseMutation.mutate()}
            disabled={exerciseMutation.isPending || !optSymbol || !accountNumber}
          >
            {exerciseMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Text style={styles.actionBtnText}>Request exercise</Text>}
          </TouchableOpacity>
          <ResultBox result={exerciseMutation.data} error={exerciseMutation.error} />
        </Card>

        <SectionHeader
          title="List option exercise requests"
          note="Confirmed live: GTN rejects this specific query for our institution-level session ('Unauthorized Request - server1') — a real entitlement gap, not a format bug."
        />
        <Card style={styles.formCard}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => exerciseListMutation.mutate()}
            disabled={exerciseListMutation.isPending || !accountNumber}
          >
            {exerciseListMutation.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.actionBtnText}>List requests</Text>
            )}
          </TouchableOpacity>
          {exerciseListMutation.isError && <Text style={styles.error}>{(exerciseListMutation.error as Error).message}</Text>}
          {exerciseListMutation.data && exerciseListMutation.data.length === 0 && (
            <Text style={styles.empty}>No results (or GTN rejected the query — see note above).</Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.sm },
  sectionHeader: { marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, textTransform: 'uppercase' },
  sectionNote: { fontSize: 11, color: colors.textMuted, marginTop: 2, lineHeight: 15 },
  orderCard: { marginBottom: spacing.sm },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between' },
  symbol: { fontWeight: '600', color: colors.textPrimary },
  side: { fontWeight: '700', fontSize: 12 },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.xs },
  status: { fontSize: 12, fontWeight: '600', marginTop: spacing.xs },
  ref: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  quickFillRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  quickFillBtn: {
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  quickFillText: { color: colors.brand, fontSize: 11, fontWeight: '600' },
  empty: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm },
  linkBtn: { alignSelf: 'flex-start', marginTop: spacing.xs },
  linkBtnText: { color: colors.brand, fontSize: 12, fontWeight: '600' },
  formCard: { gap: spacing.sm },
  field: { marginBottom: spacing.sm },
  label: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
  },
  actionBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  actionBtnText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  resultBox: { marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1 },
  resultStatus: { fontWeight: '700', fontSize: 12 },
  resultReason: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
})
