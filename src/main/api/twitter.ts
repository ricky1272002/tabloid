import axios, { AxiosError } from 'axios';
import { TweetData, TweetMedia } from '../../shared/types'; // Corrected path

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const TWITTER_API_BASE_URL = 'https://api.twitter.com/2';

// Rate Limiting State
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 1450; // Slightly less than 1500 for safety
let requestCount = 0;
let windowResetTime = Date.now() + RATE_LIMIT_WINDOW_MS;
let rateLimitPausedUntil = 0; // Timestamp until which requests are paused due to 429

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();

  if (now < rateLimitPausedUntil) {
    const waitTime = rateLimitPausedUntil - now;
    console.warn(`Twitter API rate limit enforced by 429. Pausing for ${waitTime / 1000}s.`);
    await delay(waitTime);
    // After waiting due to 429, reset the general window as well, as Twitter's header is more accurate.
    windowResetTime = Date.now() + RATE_LIMIT_WINDOW_MS;
    requestCount = 0;
    rateLimitPausedUntil = 0; // Clear pause
  }

  if (now >= windowResetTime) {
    requestCount = 0;
    windowResetTime = now + RATE_LIMIT_WINDOW_MS;
    console.log('Twitter API rate limit window reset.');
  }

  if (requestCount >= MAX_REQUESTS_PER_WINDOW) {
    const waitTime = windowResetTime - now;
    if (waitTime > 0) {
      console.warn(`Approaching Twitter API rate limit. Pausing for ${waitTime / 1000}s.`);
      await delay(waitTime);
      // After waiting, reset the window for the next cycle
      requestCount = 0;
      windowResetTime = Date.now() + RATE_LIMIT_WINDOW_MS;
    } else {
        // If waitTime is somehow <=0 but we are over limit, reset immediately.
        requestCount = 0;
        windowResetTime = Date.now() + RATE_LIMIT_WINDOW_MS;
    }
  }
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

interface TwitterMediaItem {
  media_key: string;
  type: 'photo' | 'video' | 'animated_gif';
  url?: string;
  preview_image_url?: string;
  // Add other fields like variants for videos if needed
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count: number;
  };
  attachments?: {
    media_keys?: string[];
  };
}

interface TwitterApiResponse {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUser[];
    media?: TwitterMediaItem[];
  };
  errors?: Array<{ message: string; [key: string]: any }>;
  meta?: {
    result_count: number;
    newest_id?: string;
    oldest_id?: string;
    next_token?: string;
  };
}

/**
 * Fetches recent tweets for a given Twitter User ID.
 * @param userId The Twitter User ID.
 * @param sinceId Optional. Returns results with a Tweet ID greater than (that is, more recent than) the specified ID.
 * @returns A Promise that resolves to an array of TweetData.
 */
export const getTweetsByUserId = async (userId: string, sinceId?: string): Promise<TweetData[]> => {
  if (!TWITTER_BEARER_TOKEN) {
    console.error('TWITTER_BEARER_TOKEN is not set in environment variables.');
    throw new Error('Twitter API Bearer Token is not configured.');
  }

  await waitForRateLimit();

  const endpoint = `${TWITTER_API_BASE_URL}/users/${userId}/tweets`;
  const params: Record<string, string | number> = {
    'tweet.fields': 'created_at,public_metrics,attachments,author_id',
    'expansions': 'author_id,attachments.media_keys',
    'user.fields': 'name,username,profile_image_url',
    'media.fields': 'url,preview_image_url,type',
    'max_results': 20, // Fetch a reasonable number, can be configured
  };

  if (sinceId) {
    params.since_id = sinceId;
  }

  let attempts = 0;
  const maxAttempts = 3; // Max attempts for retrying after 429 if no header

  while(attempts < maxAttempts) {
    try {
      console.log(`Attempting Twitter API request for user ${userId}. Request count: ${requestCount + 1}/${MAX_REQUESTS_PER_WINDOW}`);
      const response = await axios.get<TwitterApiResponse>(endpoint, {
        headers: {
          'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
        },
        params,
      });
      requestCount++;

      if (response.data.errors) {
        console.error('Twitter API returned errors:', response.data.errors);
        throw new Error(`Twitter API error: ${response.data.errors.map(e => e.message).join(', ')}`);
      }

      const tweets = response.data.data || [];
      const users = response.data.includes?.users || [];
      const mediaItems = response.data.includes?.media || [];

      return tweets.map((tweet): TweetData => {
        const author = users.find(u => u.id === tweet.author_id);
        const tweetMedia: TweetMedia[] = (tweet.attachments?.media_keys || [])
          .map(key => {
            const mediaDetail = mediaItems.find(m => m.media_key === key);
            if (!mediaDetail) return null;
            return {
              type: mediaDetail.type === 'animated_gif' ? 'gif' : mediaDetail.type,
              url: mediaDetail.url || '',
              previewUrl: mediaDetail.preview_image_url || mediaDetail.url || '',
            };
          })
          .filter(m => m !== null) as TweetMedia[];

        return {
          id: tweet.id,
          content: tweet.text,
          createdAt: tweet.created_at,
          author: {
            name: author?.name || 'Unknown Author',
            handle: author?.username || 'unknown',
            avatarUrl: author?.profile_image_url?.replace('_normal', '_400x400'), // Get larger avatar
          },
          metrics: tweet.public_metrics ? {
            likes: tweet.public_metrics.like_count || 0,
            retweets: tweet.public_metrics.retweet_count || 0,
          } : { likes: 0, retweets: 0 },
          media: tweetMedia.length > 0 ? tweetMedia : undefined,
          sourceId: userId, // Or map to a sourceId from your DB if different
        };
      });

    } catch (error) {
      const axiosError = error as AxiosError;
      attempts++;
      if (axiosError.response) {
        console.error(`Twitter API request failed (Attempt ${attempts}/${maxAttempts}) for user ${userId} with status ${axiosError.response.status}:`, axiosError.response.data);
        if (axiosError.response.status === 429) {
          const resetTimestampHeader = axiosError.response.headers['x-rate-limit-reset'];
          const retryAfterHeader = axiosError.response.headers['retry-after']; // Some APIs use this
          
          let resetTime = 0;
          if (resetTimestampHeader) {
            resetTime = parseInt(resetTimestampHeader as string, 10) * 1000; // Twitter provides it in seconds
          } else if (retryAfterHeader) {
            resetTime = Date.now() + parseInt(retryAfterHeader as string, 10) * 1000; // Retry-After is usually in seconds
          }

          if (resetTime > Date.now()) {
            rateLimitPausedUntil = resetTime;
            console.warn(`Twitter API rate limit hit (429). Specific reset time provided. Pausing until ${new Date(rateLimitPausedUntil).toISOString()}`);
            await waitForRateLimit(); // This will now handle the specific pause
            attempts = 0; // Reset attempts as we honored the server's specific instruction
            continue; // Retry the request
          } else {
            // No valid reset header, use exponential backoff
            const backoffTime = Math.pow(2, attempts) * 1000 + Math.random() * 1000; // Exponential backoff with jitter
            console.warn(`Twitter API rate limit hit (429) without reset header. Backing off for ${backoffTime / 1000}s.`);
            await delay(backoffTime);
            if (attempts >= maxAttempts) {
               throw new Error(`Twitter API request failed after ${maxAttempts} attempts due to 429: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
            }
            continue; // Retry after backoff
          }
        }
        if (attempts >= maxAttempts) {
            throw new Error(`Twitter API request failed after ${maxAttempts} attempts: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
        }
      } else if (axiosError.request) {
        console.error(`Twitter API request (Attempt ${attempts}/${maxAttempts}) made but no response received for user ${userId}:`, axiosError.request);
        if (attempts >= maxAttempts) {
            throw new Error('Twitter API request made but no response received after multiple attempts.');
        }
        await delay(Math.pow(2, attempts) * 1000 + Math.random() * 1000); // Backoff for network issues too
      } else {
        console.error(`Error setting up Twitter API request (Attempt ${attempts}/${maxAttempts}) for user ${userId}:`, axiosError.message);
        // This is likely a config error, don't retry indefinitely
        throw new Error(`Error setting up Twitter API request: ${axiosError.message}`);
      }
    }
  } // end while loop
  // Should not be reached if maxAttempts is handled correctly inside the loop
  throw new Error('Twitter API request failed after maximum attempts.');
};

// Example usage (for testing purposes, can be removed)
// (async () => {
//   // Replace with a valid Twitter User ID for testing, e.g., TwitterDev's ID: 2244994945
//   const testUserId = '2244994945'; 
//   if (TWITTER_BEARER_TOKEN) {
//     try {
//       console.log(`Fetching tweets for user ID: ${testUserId}`);
//       const tweets = await getTweetsByUserId(testUserId);
//       console.log('Fetched tweets:', JSON.stringify(tweets, null, 2));
//     } catch (e) {
//       console.error('Failed to fetch tweets for example user:', e);
//     }
//   } else {
//     console.log('Skipping example usage as TWITTER_BEARER_TOKEN is not set.');
//   }
// })(); 