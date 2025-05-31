export interface TweetAuthor {
  name: string;
  handle: string;
  avatarUrl?: string;
}

export interface TweetMetrics {
  likes: number;
  retweets: number;
}

export interface TweetMedia {
  type: 'photo' | 'video' | 'gif'; // Add other types as needed
  url: string;
  previewUrl?: string; // For videos or large images
}

export interface TweetData {
  id: string;
  author: TweetAuthor;
  content: string;
  createdAt: string; // ISO 8601 date string
  metrics?: TweetMetrics;
  media?: TweetMedia[];
  sourceId: string; // To link back to the source/bubble
}

// Placeholder for Source configuration data
export interface SourceData {
  id: string; // Unique ID for the source entry in the DB
  name: string;
  handle?: string; // Twitter handle
  type: 'twitter' | 'news';
  bubblePosition: number; // 0-5
  logoUrl?: string;
  twitterUserId?: string; // Actual Twitter User ID
  lastFetchedTweetId?: string | null;
}

export interface TickerConfig {
  symbol: string; // e.g., "BTC", "ETH"
  id: string;     // CoinGecko ID, e.g., "bitcoin", "ethereum"
  displayName: string; // e.g., "Bitcoin", "Ethereum"
  displayOrder: number;
}

export interface PriceData {
  [coinGeckoId: string]: {
    usd: number;
    usd_24h_change?: number;
  };
}

// Payload from renderer to main process for adding a new source
export interface NewSourcePayload {
  name: string;
  handle?: string; 
  twitterUserId: string; // For Twitter sources, this will be the ID
  bubblePosition: number; // 0-5
  logoUrl?: string;
  // type will be defaulted to 'twitter' in the main process for now
} 