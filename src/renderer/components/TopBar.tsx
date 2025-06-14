import React from 'react';
import Ticker, { TickerProps } from './Ticker'; // Assuming TickerProps is exported from Ticker.tsx
import { TickerConfig, PriceData } from '../../shared/types';
import { useAppStore } from '../store/tweetStore'; // Import the store

interface TopBarProps {
  configuredTickers: TickerConfig[];
  priceData: PriceData | null;
  isLoadingPrices: boolean;
  className?: string; // Added className prop
}

const TopBar: React.FC<TopBarProps> = ({ configuredTickers, priceData, isLoadingPrices, className }) => {
  const openSettingsModal = useAppStore(state => state.openSettingsModal); // Get the action from the store

  return (
    <div 
      className={`h-[50px] bg-[#1a1a1a] border-b border-[#38444d] flex items-center justify-between px-4 text-white ${className || ''}`}
      style={{ flexShrink: 0 }}
    >
      {/* Left: Logo/Text */}
      <div className="text-xl font-bold">Tabloid</div>

      {/* Center: Cryptocurrency Price Tickers */}
      <div className="flex items-center space-x-3 overflow-x-auto py-2 scrollbar-hide">
        {configuredTickers.sort((a,b) => a.displayOrder - b.displayOrder).map(config => {
          const currentPrice = priceData?.[config.id]?.usd;
          const change = priceData?.[config.id]?.usd_24h_change;
          return (
            <Ticker 
              key={config.id}
              symbol={config.symbol}
              price={currentPrice}
              change24h={change}
              isLoading={isLoadingPrices && !currentPrice} // Show loading if globally loading and this specific ticker has no data yet
            />
          );
        })}
      </div>

      {/* Right: Settings Button */}
      <div>
        <button 
          onClick={openSettingsModal} // Call the action on click
          className="p-2 rounded-md hover:bg-[#22303c] focus:outline-none focus:ring-2 focus:ring-[#38444d]"
        >
          {/* Gear icon SVG */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.646.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 1.255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.333.183-.583.495-.646.87l-.212 1.282c-.09.542-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.646-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.759 6.759 0 0 1 0-1.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.646-.87l.212-1.282Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TopBar; 