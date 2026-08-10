import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { colors, radius, spacing } from '../theme/colors'

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Watchlist: 'eye-outline',
  Trade: 'swap-horizontal',
  Orders: 'document-text-outline',
  Events: 'pulse-outline',
}

export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index
        const isTrade = route.name === 'Trade'

        const onPress = () => {
          if (!focused) navigation.navigate(route.name)
        }

        if (isTrade) {
          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={styles.tradeButtonWrap}>
              <View style={[styles.tradeButton, focused && styles.tradeButtonActive]}>
                <Ionicons name={ICONS[route.name]} size={22} color={colors.white} />
              </View>
              <Text style={styles.tradeLabel}>Trade</Text>
            </TouchableOpacity>
          )
        }

        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={styles.tab}>
            <Ionicons name={ICONS[route.name]} size={20} color={focused ? colors.navActive : colors.navInactive} />
            <Text style={[styles.label, { color: focused ? colors.navActive : colors.navInactive }]}>{route.name}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.navBg,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: spacing.xs },
  label: { fontSize: 10, fontWeight: '500' },
  tradeButtonWrap: { flex: 1, alignItems: 'center', marginTop: -spacing.lg },
  tradeButton: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.background,
  },
  tradeButtonActive: { backgroundColor: colors.brandDark },
  tradeLabel: { fontSize: 10, color: colors.navActive, fontWeight: '600', marginTop: 2 },
})
