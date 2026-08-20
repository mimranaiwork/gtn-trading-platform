import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { getTickers, quoteAsOfLabel, searchSymbols, type TickerDoc } from '../api/marketdata'
import Card from '../components/Card'
import ChangeBadge from '../components/ChangeBadge'
import { useLiveQuotes } from '../hooks/useLiveQuotes'
import { colors, radius, spacing } from '../theme/colors'
import type { RootTabParamList } from '../navigation/types'

const DEFAULT_KEYS = ['NSDQ~AAPL', 'NSDQ~MSFT', 'NSDQ~TSLA', 'NSDQ~NVDA']

export default function WatchlistScreen({ navigation }: { navigation: BottomTabNavigationProp<RootTabParamList> }) {
  const [keys, setKeys] = useState<string[]>(DEFAULT_KEYS)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const { data: tickers } = useQuery({ queryKey: ['wl-tickers', keys], queryFn: () => getTickers(keys) })
  const { connected: liveConnected, quotes } = useLiveQuotes(keys)

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['wl-search', debounced],
    queryFn: () => searchSymbols('NSDQ', debounced),
    enabled: debounced.length > 0,
  })

  const tickerByKey = new Map((tickers ?? []).map((t) => [t.key, t]))
  const quoteByKey = new Map((quotes ?? []).map((q) => [q.key, q]))

  const addToWatchlist = (doc: TickerDoc) => {
    if (!keys.includes(doc.key)) setKeys((prev) => [...prev, doc.key])
    setQuery('')
  }

  const goTrade = (key: string) => {
    const [exchange, symbol] = key.split('~')
    navigation.navigate('Trade', { symbol, exchange })
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Watchlist</Text>
          <View style={styles.liveBadge}>
            <View style={[styles.liveDot, { backgroundColor: liveConnected ? colors.success : colors.textMuted }]} />
            <Text style={styles.liveText}>{liveConnected ? 'Live' : 'Connecting…'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search Nasdaq ticker…"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
        />
        {searching && <ActivityIndicator size="small" color={colors.brand} />}
      </View>

      {debounced.length > 0 ? (
        <FlatList
          data={searchResults ?? []}
          keyExtractor={(d) => d.key}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.searchRow} onPress={() => addToWatchlist(item)}>
              <View>
                <Text style={styles.symbol}>{item.displayTicker}</Text>
                <Text style={styles.description} numberOfLines={1}>{item.longDescription}</Text>
              </View>
              <Ionicons name="add-circle-outline" size={22} color={colors.brand} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={!searching ? <Text style={styles.empty}>No matches</Text> : null}
        />
      ) : (
        <FlatList
          data={keys}
          keyExtractor={(k) => k}
          contentContainerStyle={styles.list}
          renderItem={({ item: key }) => {
            const t = tickerByKey.get(key)
            const q = quoteByKey.get(key)
            return (
              <TouchableOpacity onPress={() => goTrade(key)}>
                <Card style={styles.rowCard}>
                  <View>
                    <Text style={styles.symbol}>{t?.displayTicker ?? key}</Text>
                    <Text style={styles.description} numberOfLines={1}>{t?.longDescription ?? ' '}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.price}>{q?.last != null ? q.last.toFixed(2) : '—'}</Text>
                    <ChangeBadge value={q?.pctChange} />
                    {q?.transactionDate && (
                      <Text style={styles.asOf}>{quoteAsOfLabel(q.transactionDate)}</Text>
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  rowCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  searchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  symbol: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  description: { fontSize: 12, color: colors.textSecondary, maxWidth: 220 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  price: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  asOf: { fontSize: 10, color: colors.textMuted },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
})
