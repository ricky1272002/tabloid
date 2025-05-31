import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TweetData, SourceData } from '../../shared/types'; // Import types
import Tweet from './Tweet'; // Import the Tweet component
import { useAppStore } from '../store/tweetStore'; // Import useAppStore

export interface BubbleProps {
  source: SourceData; // Use SourceData for richer source info
  tweets: TweetData[];
}

const Bubble: React.FC<BubbleProps> = React.memo(({ source, tweets }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [newTweetsWhilePaused, setNewTweetsWhilePaused] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProgrammaticScrollRef = useRef(false); // To distinguish programmatic scroll from user scroll

  // console.log(`Rendering Bubble for: ${source.name}`); // For debugging re-renders

  // Get the error for this specific source from the store
  const sourceError = useAppStore(state => state.errorBySourceId[source.id]);

  const scrollToTop = useCallback((smooth: boolean = true) => {
    if (scrollRef.current) {
      isProgrammaticScrollRef.current = true;
      scrollRef.current.scrollTo({
        top: 0,
        behavior: smooth ? 'smooth' : 'auto',
      });
      // Unset programmatic scroll flag after a short delay
      setTimeout(() => { isProgrammaticScrollRef.current = false; }, smooth ? 350 : 50); 
    }
  }, []);

  useEffect(() => {
    // Auto-scroll to top when new tweets arrive and user is not scrolling
    if (tweets.length > 0 && !isUserScrolling && !sourceError) {
        // Check if new tweets are actually different from previous render to avoid unnecessary scrolls
        // This simple check assumes tweets are always new at the top
        if(scrollRef.current && scrollRef.current.scrollTop !== 0){
            // If already scrolled, and new tweets arrive, bring to top if not paused
             scrollToTop();
        } else if (scrollRef.current && scrollRef.current.scrollTop === 0){
            // If at top, new tweets will appear, no scroll needed unless it was from a programmatic scroll to bottom then new one on top
            // This condition is mostly fine.
        }
      setNewTweetsWhilePaused(false); // New tweets shown, reset pause indicator
    } else if (tweets.length > 0 && isUserScrolling && !sourceError) {
      // If user is scrolling and new tweets arrive, set flag
      setNewTweetsWhilePaused(true);
    }
  }, [tweets, isUserScrolling, scrollToTop, sourceError]);

  const handleScroll = () => {
    if (isProgrammaticScrollRef.current) return; // Ignore scrolls triggered by scrollToTop

    setIsUserScrolling(true);
    setNewTweetsWhilePaused(false); // User scrolled, so they've seen the content

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
      // If there were new tweets while paused and now timer expired, scroll to top
      // This behavior might be slightly aggressive; alternative is to just re-enable auto-scroll for NEXT new tweet.
      // For now, let's not auto-scroll here but let the next tweet arrival handle it or user clicks indicator.
    }, 5000); // 5 seconds inactivity
  };

  const handleNewTweetsIndicatorClick = () => {
    scrollToTop();
    setIsUserScrolling(false); // Resume auto-scroll behavior
    setNewTweetsWhilePaused(false);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
  };

  return (
    <div className="bg-[#1a1a1a] rounded-lg shadow-xl flex flex-col h-full overflow-hidden">
      {/* Bubble Header */}
      <div className="p-3 border-b border-[#38444d] flex items-center space-x-2 flex-shrink-0">
        {source.logoUrl && (
          <img src={source.logoUrl} alt={`${source.name} logo`} className="w-6 h-6 rounded-full" />
        )}
        <span className="font-semibold text-base text-white truncate">{source.name}</span>
      </div>

      {/* Tweets Container */} 
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-grow overflow-y-auto p-1 space-y-1 scrollbar-thin scrollbar-thumb-[#38444d] scrollbar-track-[#1a1a1a]"
      >
        {newTweetsWhilePaused && !sourceError && (
          <button 
            onClick={handleNewTweetsIndicatorClick}
            className="sticky top-2 left-1/2 -translate-x-1/2 z-10 bg-blue-500 text-white px-3 py-1 rounded-full text-xs shadow-lg hover:bg-blue-600 transition-colors animate-pulse"
          >
            New Tweets
          </button>
        )}
        {sourceError ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-red-500 mb-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p className="text-red-400 text-sm font-semibold">Error fetching tweets:</p>
            <p className="text-[#d1d5db] text-xs mt-1">{sourceError}</p>
            <p className="text-xs text-gray-500 mt-3">Check settings or try again later.</p>
          </div>
        ) : tweets.length > 0 ? (
          tweets.map((tweet) => (
            // Using tweet.id directly as key assuming it's unique and stable per tweet item
            <Tweet key={tweet.id} tweet={tweet} />
          ))
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#8899a6] text-sm">No tweets yet for {source.name}.</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default Bubble; 