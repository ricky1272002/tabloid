import React, { useEffect, useState } from 'react';
import { useAppStore } from './store/tweetStore'; // Assuming this is the correct path
import CustomTitleBar from './components/CustomTitleBar'; // Import the new component

const App: React.FC = () => {
  const {
    sources,
    tweetsBySourceId,
    setSources,
    addTweets, // Or a new action like setTweetsBySourceId if you prefer
    setTickerConfig,
    setIsOnline,
    // Add other relevant state/actions from your store if needed for display
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("[Renderer] Attempting to fetch initial load data...");
        const data = await window.electronAPI.getInitialLoadData();
        console.log("[Renderer] Initial data received:", data);

        if (data) {
          setSources(data.sources);
          // Assuming data.tweetsBySource is Record<string, TweetData[]>
          // If your addTweets is idempotent or handles initial setting, this is fine.
          // Otherwise, a setTweetsBySourceId action might be cleaner.
          for (const sourceId in data.tweetsBySource) {
            addTweets(sourceId, data.tweetsBySource[sourceId]);
          }
          setTickerConfig(data.tickerConfigs);
          setIsOnline(data.isOnline);
        } else {
          // This case should ideally not happen if main process always returns an object
          console.error("[Renderer] Received undefined data from getInitialLoadData");
          setError("Failed to receive data from main process.");
        }
      } catch (e: any) {
        console.error("[Renderer] Error fetching initial data:", e);
        setError(e.message || "An unknown error occurred while fetching data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [setSources, addTweets, setTickerConfig, setIsOnline]); // Dependencies for useEffect

  // Common layout class for main content area to account for title bar height (h-8 = 2rem)
  const mainContentClass = "pt-8 w-screen h-screen"; 

  if (isLoading) {
    return (
      <>
        <CustomTitleBar />
        <div className={`${mainContentClass} bg-gray-900 flex items-center justify-center text-white`}>
          Loading initial data...
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <CustomTitleBar />
        <div className={`${mainContentClass} bg-gray-900 flex flex-col items-center justify-center text-red-500`}>
          <p>Error loading application:</p>
          <p>{error}</p>
          <p>Please check console logs (Ctrl+Shift+I in Dev, or log files in packaged app) for more details.</p>
        </div>
      </>
    );
  }

  // Basic data display (replace with your actual UI components later)
  return (
    <>
      <CustomTitleBar />
      <div className={`${mainContentClass} bg-gray-800 text-white p-4 overflow-auto`}>
        <h1 className="text-2xl font-bold mb-4">Tabloid - Data Loaded</h1>
        <div className="mb-2">
          Network Status: {useAppStore.getState().isOnline ? 'Online' : 'Offline'}
        </div>
        
        <h2 className="text-xl font-semibold mb-2">Sources ({sources.length})</h2>
        {sources.length === 0 && <p>No sources configured.</p>}
        <ul>
          {sources.map(source => (
            <li key={source.id} className="mb-3 p-2 border border-gray-700 rounded">
              <h3 className="text-lg font-medium">{source.name} (@{source.handle}) - ID: {source.id}</h3>
              <p>Tweets loaded: {tweetsBySourceId[source.id]?.length || 0}</p>
              {/* Further display tweets for this source if desired */}
              {/* {tweetsBySourceId[source.id]?.map(tweet => (
                <div key={tweet.id} className="ml-4 p-1 border-t border-gray-600">
                  <p className="text-sm text-gray-400">{new Date(tweet.createdAt).toLocaleString()}</p>
                  <p>{tweet.content}</p>
                </div>
              ))} */}
            </li>
          ))}
        </ul>
        {/* Placeholder for Ticker display */}
        {/* <h2 className="text-xl font-semibold mt-4 mb-2">Tickers</h2> */}
        {/* Display tickerConfigs or priceData here */}
      </div>
    </>
  );
};

export default App; 