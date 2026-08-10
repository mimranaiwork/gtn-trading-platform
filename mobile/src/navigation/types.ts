export type RootTabParamList = {
  Home: undefined
  Watchlist: undefined
  Trade: { symbol?: string; exchange?: string } | undefined
  Orders: undefined
  Events: undefined
}
