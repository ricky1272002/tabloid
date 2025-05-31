import React from 'react';

export interface TickerProps {
  symbol: string; // e.g., BTC
  price?: number; // e.g., 65000.00
  change24h?: number; // e.g., 2.5 or -1.75 (percentage)
  isLoading: boolean;
}

const Ticker: React.FC<TickerProps> = ({ symbol, price, change24h, isLoading }) => {
  const priceColor = change24h === undefined ? 'text-gray-400' : change24h >= 0 ? 'text-green-500' : 'text-red-500';
  const formattedPrice = price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formattedChange = change24h?.toFixed(2);

  return (
    <div className="flex items-center space-x-2 px-3 py-1 bg-[#22272e] rounded-md text-sm whitespace-nowrap">
      <span className="font-semibold text-white">{symbol}</span>
      {isLoading ? (
        <span className="text-gray-400">Loading...</span>
      ) : price !== undefined ? (
        <>
          <span className={`${priceColor}`}>{formattedPrice} USD</span>
          {change24h !== undefined && (
            <span className={`${priceColor}`}>({change24h > 0 ? '+' : ''}{formattedChange}%)</span>
          )}
        </>
      ) : (
        <span className="text-gray-500">N/A</span>
      )}
    </div>
  );
};

export default Ticker; 