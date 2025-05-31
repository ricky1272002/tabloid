import React, { useEffect } from 'react';
import Bubble from './components/Bubble';
import TopBar from './components/TopBar';
import SettingsModal from './components/SettingsModal';
import { useAppStore } from './store/tweetStore';

function App() {
  const sources = useAppStore(state => state.sources);
  const tweetsBySourceId = useAppStore(state => state.tweetsBySourceId);
  const setSources = useAppStore(state => state.setSources);
  const addTweets = useAppStore(state => state.addTweets);
  const setSourceError = useAppStore(state => state.setSourceError);

  const configuredTickers = useAppStore(state => state.configuredTickers);
  const priceData = useAppStore(state => state.priceData);
  const isLoadingPrices = useAppStore(state => state.isLoadingPrices);
  const setPriceData = useAppStore(state => state.setPriceData);
  const setTickerConfig = useAppStore(state => state.setTickerConfig);

  const isOnline = useAppStore(state => state.isOnline);
  const setIsOnline = useAppStore(state => state.setIsOnline);

  useEffect(() => {
    window.electronAPI?.getInitialLoadData().then(({ sources: initialSources, tweetsBySource: initialTweetsBySource, tickerConfigs: initialTickerConfigs, isOnline: initialIsOnline }) => {
      setSources(initialSources);
      setTickerConfig(initialTickerConfigs);
      setIsOnline(initialIsOnline);
      for (const sourceId in initialTweetsBySource) {
        if (initialTweetsBySource[sourceId].length > 0) {
          addTweets(sourceId, initialTweetsBySource[sourceId]);
        }
      }
    }).catch(err => {
        console.error("Error fetching initial load data:", err);
        setIsOnline(false); // Assume offline if initial load fails critically
    });

    const removeNewTweetsListener = window.electronAPI?.onNewTweets(({ sourceId, tweets: newTweets }) => {
      addTweets(sourceId, newTweets);
    });

    const removeSourceFetchErrorListener = window.electronAPI?.onSourceFetchError(({ sourceId, error }) => {
      setSourceError(sourceId, error);
    });

    const removePriceUpdateListener = window.electronAPI?.onPriceUpdate((newPriceData) => {
      setPriceData(newPriceData);
    });

    const removeNetworkStatusListener = window.electronAPI?.onNetworkStatusChange(({ isOnline: updatedIsOnline }) => {
        console.log("Network status changed:", updatedIsOnline);
        setIsOnline(updatedIsOnline);
    });

    // Optional: Periodically check network status if onNetworkStatusChange is not reliable enough across all OS/setups
    // const intervalId = setInterval(async () => {
    //   try {
    //     const status = await window.electronAPI?.checkNetworkStatus();
    //     if (status && status.isOnline !== isOnline) {
    //       setIsOnline(status.isOnline);
    //     }
    //   } catch (e) { console.error("Failed to check network status periodically", e); }
    // }, 30000); // Check every 30 seconds

    return () => {
      removeNewTweetsListener?.();
      removeSourceFetchErrorListener?.();
      removePriceUpdateListener?.();
      removeNetworkStatusListener?.();
      // clearInterval(intervalId);
    };
  }, [setSources, addTweets, setSourceError, setPriceData, setTickerConfig, setIsOnline]); // isOnline dependency removed from here to avoid loop with interval, manage inside interval if used

  return (
    <div className="w-screen h-screen bg-[#15202B] text-white flex flex-col">
      {!isOnline && (
        <div className="bg-red-600 text-white text-center py-2 text-sm fixed top-0 left-0 right-0 z-[100]">
          <p>You are currently offline. Some features may be unavailable.</p>
        </div>
      )}
      <TopBar 
        configuredTickers={configuredTickers}
        priceData={priceData}
        isLoadingPrices={isLoadingPrices}
        // Add a top margin if offline banner is shown to prevent overlap
        className={!isOnline ? 'mt-8' : ''} 
      />

      {/* Adjust main content padding if offline banner is shown */}
      <div className={`flex-grow p-4 overflow-y-auto ${!isOnline ? 'pt-10' : ''}`}>
        {(sources.length === 0 && configuredTickers.length === 0 && isOnline) ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xl text-[#8899a6]">Loading initial data...</p>
          </div>
        ) : sources.length === 0 && isOnline ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xl text-[#8899a6]">Loading sources or no sources configured...</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 grid-rows-2 gap-4 h-full">
            {sources.map((source) => (
              <Bubble 
                key={source.id} 
                source={source} 
                tweets={tweetsBySourceId[source.id] || []} 
              />
            ))}
          </div>
        )}
      </div>
      <SettingsModal />
    </div>
  );
}

export default App; 