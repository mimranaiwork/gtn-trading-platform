import { FlatList, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTradeEvents } from '../hooks/useTradeEvents'
import Card from '../components/Card'
import { colors, spacing } from '../theme/colors'

export default function EventsScreen() {
  const { connected, events } = useTradeEvents()

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Trade events</Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: connected ? colors.success : colors.textMuted }]} />
          <Text style={styles.statusText}>{connected ? 'Live' : 'Connecting…'}</Text>
        </View>
      </View>

      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No events yet — place an order to see one arrive live.</Text>}
        renderItem={({ item }) => (
          <Card style={styles.eventCard}>
            <Text style={styles.eventTime}>{new Date(item.receivedAt).toLocaleTimeString()}</Text>
            <Text style={styles.eventBody}>{item.raw}</Text>
          </Card>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, color: colors.textSecondary },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  eventCard: { backgroundColor: colors.navBg, borderColor: colors.navBg },
  eventTime: { color: colors.textMuted, fontSize: 10, marginBottom: spacing.xs },
  eventBody: { color: '#D6D3CE', fontSize: 11, fontFamily: 'Courier' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl, paddingHorizontal: spacing.lg },
})
