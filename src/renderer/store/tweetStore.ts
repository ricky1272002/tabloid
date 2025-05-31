import { create } from 'zustand';
import { SourceData, TweetData, TickerConfig, PriceData } from '../../shared/types';

export interface AppState { // Removed extends TweetsState as it's all in one now
  // Tweet State
  sources: SourceData[];
  tweetsBySourceId: Record<string, TweetData[]>;
  errorBySourceId: Record<string, string | null>;
  // Tweet Actions
  setSources: (sources: SourceData[]) => void;
  addTweets: (sourceId: string, newTweets: TweetData[]) => void;
  setSourceError: (sourceId: string, error: string | null) => void;
  // Ticker State
  configuredTickers: TickerConfig[]; // Will be populated from DB
  priceData: PriceData | null;
  isLoadingPrices: boolean;
  // Ticker Actions
  setTickerConfig: (tickers: TickerConfig[]) => void;
  setPriceData: (prices: PriceData) => void;
  setIsLoadingPrices: (loading: boolean) => void;
  // Settings Modal State
  isSettingsModalOpen: boolean;
  // Settings Modal Actions
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  // Global Online Status
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
}

// Removed defaultTickers constant

export const useAppStore = create<AppState>((set, get) => ({
  // Tweet State Initial Values
  sources: [],
  tweetsBySourceId: {},
  errorBySourceId: {},
  // Tweet Actions
  setSources: (sources) => set(state => {
    const newTweetsBySourceId = { ...state.tweetsBySourceId };
    const newErrorBySourceId = { ...state.errorBySourceId };
    sources.forEach(s => {
      if (!newTweetsBySourceId[s.id]) newTweetsBySourceId[s.id] = [];
      if (!newErrorBySourceId[s.id]) newErrorBySourceId[s.id] = null;
    });
    return { sources, tweetsBySourceId: newTweetsBySourceId, errorBySourceId: newErrorBySourceId };
  }),
  addTweets: (sourceId, newTweets) => set(state => {
    const existingTweets = state.tweetsBySourceId[sourceId] || [];
    const combined = [...newTweets, ...existingTweets];
    const uniqueTweets = Array.from(new Map(combined.map(t => [t.id, t])).values());
    const sortedTweets = uniqueTweets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const limitedTweets = sortedTweets.slice(0, 100);
    return {
      tweetsBySourceId: { ...state.tweetsBySourceId, [sourceId]: limitedTweets },
      errorBySourceId: { ...state.errorBySourceId, [sourceId]: null },
    };
  }),
  setSourceError: (sourceId, error) => set(state => ({
    errorBySourceId: { ...state.errorBySourceId, [sourceId]: error },
  })),

  // Ticker State Initial Values
  configuredTickers: [], // Initialize as empty, will be set by initial load
  priceData: null,
  isLoadingPrices: true,

  // Ticker Actions
  setTickerConfig: (tickers) => set({ configuredTickers: tickers }),
  setPriceData: (prices) => set(state => ({
    priceData: { ...(state.priceData || {}), ...prices },
    isLoadingPrices: false,
  })),
  setIsLoadingPrices: (loading) => set({ isLoadingPrices: loading }),

  // Settings Modal State Initial Values
  isSettingsModalOpen: false,
  // Settings Modal Actions
  openSettingsModal: () => set({ isSettingsModalOpen: true }),
  closeSettingsModal: () => set({ isSettingsModalOpen: false }),

  // Global Online Status Initial Value
  isOnline: true, // Assume online initially, will be updated by main process
  setIsOnline: (online) => set({ isOnline: online }),
}));

export type AppStoreType = typeof useAppStore; 