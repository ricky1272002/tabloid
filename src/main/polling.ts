import { BrowserWindow } from 'electron';
import { getAllSources, updateSourceLastFetchedTweetId, storeTweets, deleteOldTweets, getAllTickerConfigs } from './database';
import { getTweetsByUserId } from './api/twitter';
import { fetchCoinPrices } from './api/coingecko'; // Import coin gecko fetcher
import { TweetData, SourceData, TickerConfig, PriceData } from '../shared/types';

const TWEET_POLLING_INTERVAL = 60 * 1000; // 60 seconds
const PRICE_POLLING_INTERVAL = 30 * 1000; // 30 seconds
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

let tweetPollingTimer: NodeJS.Timeout | null = null;
let pricePollingTimer: NodeJS.Timeout | null = null;
let cleanupTimer: NodeJS.Timeout | null = null;

async function fetchTweetsForSource(source: SourceData, mainWindow: BrowserWindow | null) {
    if (source.type !== 'twitter' || !source.twitterUserId) {
        // console.log(`Skipping non-twitter source or source with no user ID: ${source.name}`);
        return;
    }

    console.log(`Polling for source: ${source.name} (User ID: ${source.twitterUserId}, Last fetched ID: ${source.lastFetchedTweetId || 'None'})`);
    try {
        const fetchedTweets = await getTweetsByUserId(source.twitterUserId, source.lastFetchedTweetId || undefined);

        if (fetchedTweets.length > 0) {
            console.log(`Fetched ${fetchedTweets.length} new tweets for ${source.name}`);
            
            // Ensure tweets have the correct sourceId from our DB perspective
            const tweetsToStore: TweetData[] = fetchedTweets.map(t => ({ ...t, sourceId: source.id }));
            
            await storeTweets(tweetsToStore);
            console.log(`Stored ${tweetsToStore.length} tweets for ${source.name} in DB.`);

            const newLastFetchedId = tweetsToStore[0].id; // Twitter API returns newest first
            await updateSourceLastFetchedTweetId(source.id, newLastFetchedId);
            console.log(`Updated last_fetched_tweet_id for ${source.name} to ${newLastFetchedId}`);

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('new-tweets', { sourceId: source.id, tweets: tweetsToStore });
            }
        } else {
            // console.log(`No new tweets for ${source.name}`);
        }
    } catch (error) {
        console.error(`Error fetching tweets for source ${source.name} (ID: ${source.id}):`, error);
        // Optionally, notify renderer about the error for this source
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('source-fetch-error', { sourceId: source.id, error: (error as Error).message });
        }
    }
}

async function pollAllSources(mainWindow: BrowserWindow | null) {
    console.log('Starting polling cycle...');
    try {
        const sources = await getAllSources();
        if (sources.length === 0) {
            console.log("No sources configured for polling.");
            return;
        }
        // Fetch for all sources concurrently
        await Promise.all(sources.map(source => fetchTweetsForSource(source, mainWindow)));
    } catch (error) {
        console.error('Error during polling cycle:', error);
    }
    console.log('Polling cycle finished.');
}

async function pollPrices(mainWindow: BrowserWindow | null) {
    console.log('Polling for crypto prices...');
    try {
        const tickersToFetch = await getAllTickerConfigs(); // Fetch from DB
        
        if (!tickersToFetch || tickersToFetch.length === 0) {
            console.log('No tickers configured in DB for price polling.');
            return;
        }

        const coinIds = tickersToFetch.map(t => t.id); // t.id is the CoinGecko ID
        const priceData = await fetchCoinPrices(coinIds);

        if (priceData && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('price-update', priceData);
        }
    } catch (error) {
        console.error('Error during price polling cycle:', error);
    }
}

async function runCleanupJob() {
    console.log('Running 24-hour cleanup job for old tweets...');
    try {
        await deleteOldTweets();
    } catch (error) {
        console.error('Error during tweet cleanup job:', error);
    }
}

export function startBackgroundServices(mainWindow: BrowserWindow | null) {
    // Start Tweet Polling
    if (!tweetPollingTimer) {
        console.log(`Starting tweet polling service with interval: ${TWEET_POLLING_INTERVAL / 1000}s`);
        pollAllSources(mainWindow); // Initial poll for tweets
        tweetPollingTimer = setInterval(() => pollAllSources(mainWindow), TWEET_POLLING_INTERVAL);
    } else {
        console.log('Tweet polling is already active.');
    }

    // Start Price Polling
    if (!pricePollingTimer) {
        console.log(`Starting price polling service with interval: ${PRICE_POLLING_INTERVAL / 1000}s`);
        pollPrices(mainWindow); // Initial poll for prices
        pricePollingTimer = setInterval(() => pollPrices(mainWindow), PRICE_POLLING_INTERVAL);
    } else {
        console.log('Price polling is already active.');
    }

    // Start Cleanup Job
    if (!cleanupTimer) {
        console.log(`Starting cleanup job with interval: ${CLEANUP_INTERVAL / (60 * 1000)} minutes`);
        runCleanupJob(); // Initial cleanup
        cleanupTimer = setInterval(runCleanupJob, CLEANUP_INTERVAL);
    } else {
        console.log('Cleanup job is already active.');
    }
}

export function stopBackgroundServices() {
    if (tweetPollingTimer) {
        clearInterval(tweetPollingTimer);
        tweetPollingTimer = null;
        console.log('Tweet polling service stopped.');
    }
    if (pricePollingTimer) {
        clearInterval(pricePollingTimer);
        pricePollingTimer = null;
        console.log('Price polling service stopped.');
    }
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
        console.log('Cleanup job timer stopped.');
    }
    if (!tweetPollingTimer && !pricePollingTimer && !cleanupTimer) {
        console.log('All background services are inactive.');
    }
} 