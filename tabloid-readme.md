# Tabloid - Cryptocurrency News Aggregator

## Overview
Tabloid is a desktop application that displays live cryptocurrency news from pre-selected Twitter/X accounts and news sources in a clean, dark-themed interface. The app features a 6-bubble grid layout where each bubble shows a live feed of tweets that auto-refreshes and maintains only the last 24 hours of content.

## Core Features
- **6 Static Bubbles**: Each bubble displays tweets from specific crypto news sources
- **24-Hour Ephemeral Content**: Tweets older than 24 hours automatically disappear
- **Auto-Scrolling Feeds**: New tweets appear at the top, older content pushes down
- **Live Price Ticker**: Customizable cryptocurrency price display in the top bar
- **Dark Theme**: Mimics Twitter/X's dark UI style
- **Real-time Updates**: Continuous polling for new content

## Technical Architecture

### Technology Stack
- **Framework**: Electron (recommended for ease of use with AI assistants)
- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS (for rapid dark theme development)
- **Data Storage**: SQLite (local database for 24-hour tweet cache)
- **API Integration**: Twitter API v2
- **State Management**: Zustand (simpler than Redux)

### Project Structure
```
tabloid/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts
│   │   ├── preload.ts
│   │   ├── database.ts
│   │   ├── polling.ts    # Created
│   │   └── api/
│   │       ├── twitter.ts  # Created
│   │       └── coingecko.ts # Created
│   ├── renderer/       # React app
│   │   ├── index.html
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Bubble.tsx
│   │   │   ├── Tweet.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── Ticker.tsx
│   │   │   └── SettingsModal.tsx # Created
│   │   ├── store/
│   │   │   └── tweetStore.ts # Created (contains useAppStore)
│   │   ├── hooks/        # (To be created)
│   │   │   └── useTwitterFeed.ts
│   │   └── styles/
│   │       └── globals.css
│   └── shared/
│       └── types.ts
├── tailwind.config.js
├── postcss.config.js
├── forge.config.ts     # Replaces electron.config.js
├── webpack.main.config.ts
├── webpack.renderer.config.ts
├── webpack.plugins.ts
├── webpack.rules.ts
├── tsconfig.json
├── .eslintrc.json
├── package.json
└── README.md
```

## Component Specifications

### 1. Main Window
- Fixed window size: 1400x900px (adjustable)
- Dark background: #15202B (Twitter dark blue)
- Grid layout: 3 columns × 2 rows
- Top bar height: 50px

### 2. Top Bar
- Left: "Tabloid" logo/text
- Center: Cryptocurrency price tickers
- Right: Settings button
- Background: #1a1a1a with bottom border

### 3. Bubble Component
Each bubble contains:
- Header: Source name and logo
- Scrollable tweet feed
- Auto-scroll functionality
- Time since post indicator
- Maximum 100 tweets displayed (older ones removed from view)

### 4. Tweet Display
- Profile picture (36px circle)
- Username and handle
- Time since posted (e.g., "5m", "2h")
- Tweet text with proper formatting
- Media previews (if applicable)
- Engagement metrics (likes, retweets)
- Subtle border between tweets

## Data Flow

### Tweet Collection Process
1. **API Polling**: Every 60 seconds, poll Twitter API for each configured account
2. **New Tweet Detection**: Compare tweet IDs to avoid duplicates
3. **Database Storage**: Store new tweets with timestamp
4. **UI Update**: Push new tweets to respective bubbles
5. **Cleanup Job**: Every hour, delete tweets older than 24 hours

### Database Schema
```sql
CREATE TABLE tweets (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    author_name TEXT,
    author_handle TEXT,
    author_avatar TEXT,
    content TEXT,
    media_urls TEXT,
    likes INTEGER,
    retweets INTEGER,
    created_at DATETIME,
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    handle TEXT,
    type TEXT NOT NULL, -- 'twitter' or 'news'
    bubble_position INTEGER UNIQUE NOT NULL, -- 0-5 for the 6 bubbles
    logo_url TEXT, -- Optional URL for the source's logo
    twitter_user_id TEXT, -- Actual Twitter User ID, if type is 'twitter'
    last_fetched_tweet_id TEXT -- For polling: to get tweets since this ID
);

CREATE TABLE tickers (
    id TEXT PRIMARY KEY, -- This is the CoinGecko ID, e.g., 'bitcoin'
    symbol TEXT NOT NULL UNIQUE, -- e.g., 'BTC'
    name TEXT NOT NULL, -- e.g., 'Bitcoin'
    display_order INTEGER UNIQUE NOT NULL
);
```

## Configuration

### Initial Twitter Sources (Example)
```javascript
const sources = [
    { name: "Coinbase", handle: "coinbase", twitterUserId: "3437070832", position: 0, logoUrl: "..." }, // Coinbase User ID: 3437070832
    { name: "CZ Binance", handle: "cz_binance", twitterUserId: "902926941413453824", position: 1, logoUrl: "..." }, // CZ User ID: 902926941413453824
    { name: "Glassnode", handle: "glassnode", twitterUserId: "955471816132923392", position: 2, logoUrl: "..." }, // Glassnode User ID: 955471816132923392
    { name: "DeFi Pulse", handle: "defipulse", twitterUserId: "1104038581163393024", position: 3, logoUrl: "..." }, // DeFi Pulse User ID: 1104038581163393024
    { name: "Wu Blockchain", handle: "WuBlockchain", twitterUserId: "1291227168380317696", position: 4, logoUrl: "..." }, // Wu Blockchain User ID: 1291227168380317696
    { name: "Hsaka", handle: "HsakaTrades", twitterUserId: "971400609640239104", position: 5, logoUrl: "..." } // Hsaka User ID: 971400609640239104
];
```

### Price Ticker Configuration
```javascript
const defaultTickers = ["BTC", "ETH", "SOL"];
// Users can add/remove tickers through settings
```

## UI/UX Specifications

### Auto-Scroll Behavior
- New tweets appear with fade-in animation
- Existing tweets shift down smoothly (300ms transition)
- Auto-scroll pauses when user manually scrolls
- Resumes after 5 seconds of inactivity
- Visual indicator when new tweets arrive while paused

### Time Display Format
- < 1 hour: "Xm" (5m, 45m)
- < 24 hours: "Xh" (2h, 23h)
- Approaching 24h: Slight fade effect

### Dark Theme Colors
- Background: #15202B
- Bubble background: #1a1a1a
- Text primary: #ffffff
- Text secondary: #8899a6
- Borders: #38444d
- Hover states: #22303c

## Development Steps

### Phase 1: Basic Setup (Completed)
1. **Initialize Electron + React + TypeScript project (Done)**
    - Verified Electron, TypeScript setup.
    - Installed React, ReactDOM, and type definitions.
    - Configured Electron Forge entry points (`forge.config.ts`).
    - Adjusted Webpack configurations (`webpack.renderer.config.ts`) for TSX.
2. **Set up Tailwind CSS with dark theme (Done)**
    - Installed Tailwind CSS, PostCSS, Autoprefixer.
    - Created and configured `tailwind.config.js` and `postcss.config.js`.
    - Added Tailwind directives to `src/renderer/styles/globals.css`.
    - Added `postcss-loader` to Webpack renderer config.
3. **Create basic window and layout structure (Done)**
    - Created `src/main/index.ts` with main window setup (1400x900px).
    - Created `src/main/preload.ts`.
    - Created `src/renderer/index.html` as the React app host.
    - Created `src/renderer/index.tsx` as React entry point.
    - Created `src/renderer/App.tsx` with basic dark theme layout (top bar, bubble grid placeholder).
4. **Implement SQLite database connection (Done)**
    - Installed `sqlite3` package.
    - Created `src/main/database.ts` to initialize DB and create tables.
    - Ensured DB is initialized in `src/main/index.ts`.

### Phase 2: Core Features (Completed)
1. **Build Bubble component with scrolling (Done)**
    - Created `src/renderer/components/Bubble.tsx`.
    - Integrated `Bubble` into `App.tsx` layout.
    - Defined `SourceData` interface in `src/shared/types.ts`.
2. **Implement Tweet component with X-style formatting (Done)**
    - Created `src/shared/types.ts` with `TweetData`.
    - Created `src/renderer/components/Tweet.tsx`.
    - Styled `Tweet` component using Tailwind CSS.
    - Updated `Bubble.tsx` to use `Tweet.tsx`.
3. **Create Twitter API integration (Done)**
    - Installed `axios`.
    - Created `src/main/api/twitter.ts` with `getTweetsByUserId` function.
    - Handles fetching tweets, authors, and media from Twitter API v2.
    - Transforms API response to `TweetData[]`.
4. **Set up polling mechanism (Done)**
    - Added `last_fetched_tweet_id` to `sources` table in DB and README.
    - Created DB functions: `addInitialSources`, `getAllSources`, `updateSourceLastFetchedTweetId`, `storeTweets`.
    - Created `src/main/polling.ts` to periodically fetch new tweets for all sources.
    - Integrated polling service into `src/main/index.ts`.
    - Installed `zustand` for state management.
    - Created `src/renderer/store/tweetStore.ts`.
    - Updated `src/main/preload.ts` to expose IPC for initial data and updates.
    - Updated `src/main/index.ts` with `get-initial-load-data` IPC handler.
    - Updated `App.tsx` to use Zustand store and Electron IPC for data loading and live updates.
5. **Implement 24-hour cleanup job (Done)**
    - Added `deleteOldTweets` function to `src/main/database.ts`.
    - Integrated cleanup job into `src/main/polling.ts` to run hourly.

### Phase 3: Enhanced Features
1. Add top bar with ticker functionality **(Done)**
2. Implement auto-scroll with pause detection **(Done)**
    - Includes fade-in animation for new tweets.
3. Add settings for source management **(Done)**
    - Settings modal for adding/removing Twitter sources.
4. Create smooth animations and transitions **(Done)**
    - Includes settings modal entry/exit and tweet fade-in.

### Phase 4: Polish
1. Add error handling and offline states **(Done)**
    - Source-specific errors are now displayed within their respective bubbles.
    - A global banner appears at the top of the app if an offline state is detected (e.g., no internet connection or initial data load failure).
2. Implement rate limit management **(Done)**
    - Rate limiting implemented for the Twitter API (respecting the ~1500 requests per 15-minute window).
    - Handles 429 "Too Many Requests" errors by respecting `x-rate-limit-reset` headers or using exponential backoff.
3. Optimize performance for continuous running **(Done)**
    - Renderer: `React.memo` applied to `Tweet.tsx` and `Bubble.tsx` to prevent unnecessary re-renders.
    - Database: Added indexes to `tweets` table (for `source_id, created_at` and `created_at` individually), `sources` table (for `bubble_position`), and `tickers` table (for `display_order`) to improve query performance.
4. Add system tray integration **(Done)**
    - Application now creates a system tray icon on launch.
    - Tray icon context menu provides "Show/Hide App" and "Quit" options.
    - Closing the main window hides it to the tray instead of quitting (unless quit is initiated from the tray menu or Cmd/Ctrl+Q).
    - Note: Requires a `src/main/assets/icon.png` for the tray icon (a default icon will be used if not found).

## API Requirements

### Twitter API v2
- Endpoint: GET /2/users/:id/tweets
- Rate limit: 1500 requests per 15 minutes per user
- Fields needed: id, text, created_at, public_metrics, media

### Price Data
- Use CoinGecko API (free tier)
- Endpoint: /simple/price
- Update frequency: Every 30 seconds

## Environment Variables
```TWITTER_BEARER_TOKEN=your_token_here
COINGECKO_API_KEY=your_key_here
```

## Build Commands
```bash
# Development
npm run dev

# Build for production
npm run build

# Package for distribution
npm run package
```

## Future Enhancements
- Additional news source types (RSS, Discord)
- Custom notification system
- Export daily summaries
- Multi-window support
- Theme customization
- Advanced filtering options

## Notes for AI Assistants
- Prioritize simplicity and readability over complex abstractions
- Use modern React patterns (hooks, functional components)
- Keep the codebase modular for easy feature additions
- Focus on performance given the continuous data updates
- Implement proper error boundaries and logging
- Use TypeScript strictly for better AI code completion
