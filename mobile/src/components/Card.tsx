import { StyleSheet, View, type ViewProps } from 'react-native'
import { colors, radius, spacing } from '../theme/colors'

export default function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
})
