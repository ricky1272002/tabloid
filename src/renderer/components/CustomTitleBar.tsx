import React from 'react';

const CustomTitleBar: React.FC = () => {
  const handleMinimize = () => {
    window.electronAPI.windowMinimize();
  };

  const handleMaximize = () => {
    window.electronAPI.windowMaximize();
  };

  const handleClose = () => {
    window.electronAPI.windowClose();
  };

  return (
    <div 
      className="h-8 bg-gray-700 text-white flex items-center justify-between select-none fixed top-0 left-0 right-0 z-50"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} // Make the whole bar draggable
    >
      <div className="pl-2 text-sm font-semibold">
        Tabloid
      </div>
      <div 
        className="flex items-center"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} // Make buttons non-draggable
      >
        <button 
          onClick={handleMinimize} 
          className="px-3 py-1 hover:bg-gray-600 focus:outline-none"
          title="Minimize"
        >
          {/* Basic Minimize Icon (Line) */}
          <svg width="10" height="10" viewBox="0 0 10 1" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line y1="0.5" x2="10" y2="0.5" stroke="currentColor"/>
          </svg>
        </button>
        <button 
          onClick={handleMaximize} 
          className="px-3 py-1 hover:bg-gray-600 focus:outline-none"
          title="Maximize/Restore"
        >
          {/* Basic Maximize Icon (Square) */}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="10" height="10" stroke="currentColor" strokeWidth="1" fill="none"/>
          </svg>
        </button>
        <button 
          onClick={handleClose} 
          className="px-3 py-1 hover:bg-red-500 focus:outline-none"
          title="Close"
        >
          {/* Basic Close Icon (X) */}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="10" x2="10" y2="0" stroke="currentColor" strokeWidth="1"/>
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default CustomTitleBar; 