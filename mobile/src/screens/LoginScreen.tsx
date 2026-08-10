import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'
import { colors, radius, spacing } from '../theme/colors'

export default function LoginScreen() {
  const { login } = useAuth()
  const [customerNumber, setCustomerNumber] = useState('987778399')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async () => {
    if (!customerNumber.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await login(customerNumber)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.brandMark}>
            <Text style={styles.brandLetter}>ajb</Text>
          </View>
          <Text style={styles.title}>Aljazira Capital</Text>
          <Text style={styles.subtitle}>Sign in with your customer number</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Customer number</Text>
            <TextInput
              value={customerNumber}
              onChangeText={setCustomerNumber}
              placeholder="e.g. 987778399"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              style={styles.input}
              autoCapitalize="none"
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Sign in</Text>}
          </TouchableOpacity>

          <Text style={styles.footnote}>
            Real GTN customer-token exchange (POST /trade/auth/customer/token) — the institution vouches for the
            customer number; there's no password field in this sandbox flow.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  brandMark: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  brandLetter: { color: colors.white, fontSize: 22, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xl },
  field: { marginBottom: spacing.lg },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.md, textAlign: 'center' },
  footnote: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.xl, lineHeight: 16 },
})
