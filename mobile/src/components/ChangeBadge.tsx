import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '../theme/colors'

export default function ChangeBadge({ value, suffix = '%' }: { value: number | null | undefined; suffix?: string }) {
  if (value == null) return <Text style={styles.neutral}>—</Text>
  const positive = value >= 0
  return (
    <View style={[styles.badge, { backgroundColor: positive ? colors.successBg : colors.dangerBg }]}>
      <Text style={[styles.text, { color: positive ? colors.success : colors.danger }]}>
        {positive ? '+' : ''}
        {value.toFixed(2)}
        {suffix}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600' },
  neutral: { color: colors.textMuted, fontSize: 12 },
})
