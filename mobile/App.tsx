import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AuthProvider, useAuth } from './src/context/AuthContext'
import LoginScreen from './src/screens/LoginScreen'
import HomeScreen from './src/screens/HomeScreen'
import WatchlistScreen from './src/screens/WatchlistScreen'
import TradeScreen from './src/screens/TradeScreen'
import OrdersScreen from './src/screens/OrdersScreen'
import EventsScreen from './src/screens/EventsScreen'
import TabBar from './src/navigation/TabBar'
import { colors } from './src/theme/colors'
import type { RootTabParamList } from './src/navigation/types'

const queryClient = new QueryClient()
const Tab = createBottomTabNavigator<RootTabParamList>()

function AppShell() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    )
  }

  if (!session) return <LoginScreen />

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Watchlist" component={WatchlistScreen} />
        <Tab.Screen name="Trade" component={TradeScreen} />
        <Tab.Screen name="Orders" component={OrdersScreen} />
        <Tab.Screen name="Events" component={EventsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </QueryClientProvider>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
})
