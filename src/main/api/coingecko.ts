import axios, { AxiosError } from 'axios';
import { PriceData } from '../../shared/types'; // Ensure PriceData is correctly defined

const COINGECKO_API_BASE_URL = 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY; // Optional, for higher rate limits or pro endpoints

/**
 * Fetches current prices and 24h change for a list of CoinGecko coin IDs.
 * @param coinIds Array of CoinGecko coin IDs (e.g., ['bitcoin', 'ethereum']).
 * @returns A Promise that resolves to PriceData.
 */
export const fetchCoinPrices = async (coinIds: string[]): Promise<PriceData | null> => {
  if (coinIds.length === 0) {
    return null;
  }

  const endpoint = `${COINGECKO_API_BASE_URL}/simple/price`;
  const params: Record<string, string> = {
    ids: coinIds.join(','),
    vs_currencies: 'usd',
    include_24hr_change: 'true',
  };

  if (COINGECKO_API_KEY) {
    // CoinGecko API key is usually passed as a query parameter `x_cg_demo_api_key` or `x_cg_pro_api_key`
    // For the free /simple/price endpoint, it's often not strictly required but good for demo key usage.
    // params.x_cg_demo_api_key = COINGECKO_API_KEY; // Or pro key if you have one
    // Update: Checking docs, for demo/free, it might be a header or specific query param. Let's assume no key for /simple/price for now unless specified by user.
  }

  try {
    const response = await axios.get<PriceData>(endpoint, { params });
    
    // The response structure for /simple/price is directly PriceData: 
    // { "bitcoin": { "usd": 60000, "usd_24h_change": 1.5 }, ... }
    if (response.data) {
      return response.data;
    }
    return null;

  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      console.error(`CoinGecko API request failed with status ${axiosError.response.status}:`, axiosError.response.data);
    } else if (axiosError.request) {
      console.error('CoinGecko API request made but no response received:', axiosError.request);
    } else {
      console.error('Error setting up CoinGecko API request:', axiosError.message);
    }
    // It's important to not throw here usually for price updates, allow app to continue
    // UI should handle missing price data gracefully.
    return null; 
  }
};

// Example Usage (for testing)
// (async () => {
//   try {
//     const prices = await fetchCoinPrices(['bitcoin', 'ethereum', 'solana']);
//     console.log('Fetched prices:', JSON.stringify(prices, null, 2));
//   } catch (e) {
//     console.error('Failed to fetch prices:', e);
//   }
// })(); 