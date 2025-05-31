import React from 'react';
import { TweetData } from '../../shared/types';

// Helper function to format time (to be improved based on UI/UX specs)
const formatTimeSince = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);

  if (seconds < 60) return `${seconds}s`;
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return date.toLocaleDateString(); // Fallback for older dates
};

export interface TweetProps {
  tweet: TweetData;
}

// Wrap the component with React.memo
const Tweet: React.FC<TweetProps> = React.memo(({ tweet }) => {
  const { author, content, createdAt, metrics, media } = tweet;

  // console.log(`Rendering Tweet: ${tweet.id}`); // For debugging re-renders

  return (
    <div className="p-3 border-b border-[#38444d] hover:bg-[#22303c] transition-colors duration-150 animate-fadeIn">
      <div className="flex items-start space-x-3">
        {/* Profile Picture */}
        <img 
          src={author.avatarUrl || 'https://via.placeholder.com/48'} // Placeholder avatar
          alt={`${author.name}'s avatar`} 
          className="w-12 h-12 rounded-full object-cover flex-shrink-0" // 36px in spec, using 48px (w-12) for better visual with Tailwind
        />
        <div className="flex-grow">
          {/* User Info and Time */}
          <div className="flex items-center space-x-1 text-sm">
            <span className="font-bold text-white truncate">{author.name}</span>
            <span className="text-[#8899a6] truncate">@{author.handle}</span>
            <span className="text-[#8899a6]">·</span>
            <span className="text-[#8899a6] hover:underline cursor-pointer truncate">
              {formatTimeSince(createdAt)}
            </span>
          </div>

          {/* Tweet Text */}
          <p className="text-white mt-1 whitespace-pre-wrap break-words">
            {content}
          </p>

          {/* Media Previews (Placeholder) */}
          {media && media.length > 0 && (
            <div className="mt-2 rounded-lg overflow-hidden border border-[#38444d]">
              {media.map((item, index) => (
                <img 
                  key={index} 
                  src={item.previewUrl || item.url} 
                  alt={`media ${index + 1}`}
                  className="max-w-full h-auto max-h-72 object-contain bg-black" // Constrain media height
                />
                // TODO: Add proper video/gif handling
              ))}
            </div>
          )}

          {/* Engagement Metrics (Placeholder) */}
          {metrics && (
            <div className="flex items-center space-x-6 mt-3 text-[#8899a6] text-xs">
              <span>Likes: {metrics.likes}</span>
              <span>Retweets: {metrics.retweets}</span>
              {/* TODO: Add icons for engagement */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default Tweet; 