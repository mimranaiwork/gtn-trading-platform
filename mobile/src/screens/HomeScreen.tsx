import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useAuth } from '../context/AuthContext'
import { useAccount } from '../hooks/useAccount'
import { getMovers } from '../api/marketdata'
import Card from '../components/Card'
import ChangeBadge from '../components/ChangeBadge'
import { colors, radius, spacing } from '../theme/colors'
import type { RootTabParamList } from '../navigation/types'

export default function HomeScreen({ navigation }: { navigation: BottomTabNavigationProp<RootTabParamList> }) {
  const { session, logout } = useAuth()
  const { data: account, isLoading: accountLoading, accountNumber, cash } = useAccount()

  const { data: gainers } = useQuery({
    queryKey: ['home-gainers'],
    queryFn: () => getMovers('NSDQ', 'gainers'),
  })

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>ajb</Text>
            <Text style={styles.subBrand}>aljazira capital</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.welcome}>Welcome back</Text>
        <Text style={styles.customerNumber}>Customer #{session?.customerNumber}</Text>

        <Card style={styles.netAssetsCard}>
          <View style={styles.netAssetsHeader}>
            <Ionicons name="wallet-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.netAssetsLabel}>CASH BALANCE</Text>
          </View>
          {accountLoading ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.md }} />
          ) : cash ? (
            <>
              <Text style={styles.netAssetsValue}>
                {cash.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <Text style={styles.currency}> {cash.currency}</Text>
              </Text>
              <Text style={styles.accountNumber}>Trading account {accountNumber ?? '—'}</Text>
            </>
          ) : (
            <Text style={styles.netAssetsValue}>—</Text>
          )}
        </Card>

        <View style={styles.quickActions}>
          <QuickAction icon="eye-outline" label="Watchlist" onPress={() => navigation.navigate('Watchlist')} />
          <QuickAction icon="swap-horizontal" label="Trade" onPress={() => navigation.navigate('Trade')} />
          <QuickAction icon="document-text-outline" label="Orders" onPress={() => navigation.navigate('Orders')} />
          <QuickAction icon="pulse-outline" label="Events" onPress={() => navigation.navigate('Events')} />
        </View>

        <Text style={styles.sectionTitle}>Top gainers · Nasdaq</Text>
        <Card>
          {gainers?.map((m, i) => (
            <View key={m.KEY} style={[styles.moverRow, i > 0 && styles.moverRowBorder]}>
              <Text style={styles.moverSymbol}>{m.TICKER_ID}</Text>
              <View style={styles.moverRight}>
                <Text style={styles.moverPrice}>{m.LASTTRADEPRICE?.toFixed(2)}</Text>
                <ChangeBadge value={m.PCT_CHANGE} />
              </View>
            </View>
          ))}
          {!gainers && <ActivityIndicator color={colors.brand} />}
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon} size={20} color={colors.brand} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  brand: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  subBrand: { fontSize: 10, color: colors.textSecondary, letterSpacing: 1 },
  logoutBtn: { padding: spacing.sm },
  welcome: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  customerNumber: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.lg },
  netAssetsCard: { backgroundColor: colors.cardMuted, borderColor: colors.cardMuted, marginBottom: spacing.lg },
  netAssetsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  netAssetsLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', letterSpacing: 0.5 },
  netAssetsValue: { fontSize: 32, fontWeight: '700', color: colors.textPrimary },
  currency: { fontSize: 16, fontWeight: '500', color: colors.textSecondary },
  accountNumber: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  quickAction: { alignItems: 'center', flex: 1 },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickActionLabel: { fontSize: 12, color: colors.textPrimary, fontWeight: '500' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase' },
  moverRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  moverRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  moverSymbol: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  moverRight: { alignItems: 'flex-end', gap: 2 },
  moverPrice: { fontSize: 13, color: colors.textSecondary },
})
