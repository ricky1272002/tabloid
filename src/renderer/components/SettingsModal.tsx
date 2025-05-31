import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useAppStore } from '../store/tweetStore';
import { SourceData, NewSourcePayload } from '../../shared/types';

const SettingsModal: React.FC = () => {
  const isModalOpenGlobaState = useAppStore(state => state.isSettingsModalOpen);
  const closeSettingsModalGlobal = useAppStore(state => state.closeSettingsModal);
  const sources = useAppStore(state => state.sources);
  const setSources = useAppStore(state => state.setSources);

  // Local state for managing modal visibility and animation
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const [newSourceForm, setNewSourceForm] = useState<NewSourcePayload>({
    name: '',
    twitterUserId: '',
    handle: '', // Optional, can be derived or entered
    bubblePosition: 0, // Default to first available or require selection
    logoUrl: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isModalOpenGlobaState) {
      setIsModalVisible(true);
      setIsAnimatingOut(false); // Ensure we are not in exit animation state
    } else {
      // If modal is closing, trigger animation out
      setIsAnimatingOut(true);
      // Actual hiding will be handled by onAnimationEnd or a timeout
    }
  }, [isModalOpenGlobaState]);

  const handleCloseModal = () => {
    setIsAnimatingOut(true); // Start animation
    // Wait for animation to finish before calling global close
    // This duration should match your CSS animation duration
    setTimeout(() => {
      closeSettingsModalGlobal();
      setIsModalVisible(false); // Hide modal from DOM after animation
      setIsAnimatingOut(false); // Reset animation state
    }, 300); // Adjust timing to match CSS transition (e.g., duration-300)
  };

  if (!isModalVisible && !isModalOpenGlobaState && !isAnimatingOut) {
    return null; // Completely hidden and not animating
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number = value;
    if (name === 'bubblePosition') {
      processedValue = parseInt(value, 10);
      if (isNaN(processedValue)) processedValue = 0;
    }
    setNewSourceForm(prev => ({ ...prev, [name]: processedValue }));
    setFormError(null); // Clear error on input change
  };

  const handleAddSource = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!newSourceForm.name.trim() || !newSourceForm.twitterUserId.trim()) {
      setFormError("Source Name and Twitter User ID are required.");
      return;
    }
    if (newSourceForm.bubblePosition < 0 || newSourceForm.bubblePosition > 5) {
      setFormError("Bubble Position must be between 1 and 6.");
      return;
    }
    // Check if bubble position is already taken by an existing source not being edited
    if (sources.some(s => s.bubblePosition === newSourceForm.bubblePosition)) {
        setFormError(`Bubble position ${newSourceForm.bubblePosition + 1} is already in use.`);
        return;
    }
    // Check if twitterUserId already exists
    if (sources.some(s => s.twitterUserId === newSourceForm.twitterUserId)) {
        setFormError(`Twitter User ID ${newSourceForm.twitterUserId} already exists.`);
        return;
    }

    const payload: NewSourcePayload = {
      ...newSourceForm,
      // If handle is empty, try to use name or twitterUserId as a placeholder
      handle: newSourceForm.handle?.trim() || newSourceForm.twitterUserId.trim(),
    };

    try {
      const result = await window.electronAPI?.addSource(payload);
      if (result && result.success) {
        setSources(result.sources || []);
        setNewSourceForm({ name: '', twitterUserId: '', handle: '', bubblePosition: 0, logoUrl: '' }); // Reset form
      } else {
        console.error("Failed to add source:", result?.error);
        setFormError(result?.error || "An unknown error occurred.");
        if (result?.sources) {
            setSources(result.sources); // Sync with DB state even on specific failures like constraint violation
        }
      }
    } catch (error) {
      console.error("Error calling addSource IPC:", error);
      setFormError((error as Error).message || "An error occurred while contacting the main process.");
    }
  };

  const handleRemoveSource = async (sourceId: string) => {
    try {
      const result = await window.electronAPI?.removeSource(sourceId);
      if (result && result.success) {
        setSources(result.sources || []);
      } else {
        console.error("Failed to remove source from main process:", result?.error);
        setFormError(result?.error || "Failed to remove source.");
        if (result?.sources) {
            setSources(result.sources);
        }
      }
    } catch (error) {
      console.error("Error calling removeSource IPC:", error);
      setFormError((error as Error).message || "Failed to remove source.");
    }
  };

  const availablePositions = [0, 1, 2, 3, 4, 5].filter(p => !sources.find(s => s.bubblePosition === p));

  const backdropTransition = isAnimatingOut || !isModalOpenGlobaState 
    ? 'opacity-0' 
    : 'opacity-75';
  const panelTransition = isAnimatingOut || !isModalOpenGlobaState 
    ? 'opacity-0 scale-95' 
    : 'opacity-100 scale-100';

  // Render the modal if it should be visible or is currently animating out
  if (!isModalVisible && !isAnimatingOut) {
      return null;
  }

  return (
    <div className={`fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${backdropTransition}`}>
      <div className={`bg-[#1a1a1a] p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col text-white transform transition-all duration-300 ease-in-out ${panelTransition}`}>
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-2xl font-semibold">Manage Sources</h2>
          <button onClick={handleCloseModal} className="text-[#8899a6] hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Error Display */}
        {formError && (
          <div className="bg-red-800 border border-red-700 text-red-100 px-4 py-3 rounded-md mb-4" role="alert">
            <p>{formError}</p>
          </div>
        )}

        {/* Content Area (Scrollable) */}
        <div className="flex-grow overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#38444d] scrollbar-track-[#1a1a1a]">
          {/* Add New Source Form */}
          <form onSubmit={handleAddSource} className="mb-8 bg-[#22303c] p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Add New Source</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#a0aec0] mb-1">Source Name *</label>
                <input type="text" name="name" id="name" value={newSourceForm.name} onChange={handleInputChange} className="w-full bg-[#2d3748] border border-[#4a5568] rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" required />
              </div>
              <div>
                <label htmlFor="twitterUserId" className="block text-sm font-medium text-[#a0aec0] mb-1">Twitter User ID *</label>
                <input type="text" name="twitterUserId" id="twitterUserId" value={newSourceForm.twitterUserId} onChange={handleInputChange} className="w-full bg-[#2d3748] border border-[#4a5568] rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" required />
              </div>
              <div>
                <label htmlFor="handle" className="block text-sm font-medium text-[#a0aec0] mb-1">Twitter Handle (Optional)</label>
                <input type="text" name="handle" id="handle" value={newSourceForm.handle} onChange={handleInputChange} className="w-full bg-[#2d3748] border border-[#4a5568] rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., @username"/>
              </div>
              <div>
                <label htmlFor="bubblePosition" className="block text-sm font-medium text-[#a0aec0] mb-1">Bubble Position (1-6) *</label>
                <select name="bubblePosition" id="bubblePosition" value={newSourceForm.bubblePosition} onChange={handleInputChange} className="w-full bg-[#2d3748] border border-[#4a5568] rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" required>
                  {availablePositions.length > 0 ? (
                    availablePositions.map(pos => <option key={pos} value={pos}>{pos + 1}</option>)
                  ) : (
                    <option disabled>All positions filled</option>
                  )}
                </select>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="logoUrl" className="block text-sm font-medium text-[#a0aec0] mb-1">Logo URL (Optional)</label>
                <input type="url" name="logoUrl" id="logoUrl" value={newSourceForm.logoUrl} onChange={handleInputChange} className="w-full bg-[#2d3748] border border-[#4a5568] rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" placeholder="https://example.com/logo.png"/>
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50" disabled={availablePositions.length === 0 && sources.length >=6 }>
              Add Source
            </button>
          </form>

          {/* Current Sources List */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Current Sources ({sources.length}/6)</h3>
            {sources.length > 0 ? (
              <ul className="space-y-3">
                {sources.sort((a, b) => a.bubblePosition - b.bubblePosition).map((source) => (
                  <li key={source.id} className="bg-[#22303c] p-3 rounded-md flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      {source.logoUrl && <img src={source.logoUrl} alt={source.name} className="w-8 h-8 rounded-full object-cover"/>}
                      <div>
                        <span className="font-medium text-white">{source.name}</span>
                        <span className="text-xs text-[#8899a6] block">@{source.handle || source.twitterUserId}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400">Pos: {source.bubblePosition + 1}</span>
                        <button onClick={() => handleRemoveSource(source.id)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1 px-2 rounded-md">
                            Remove
                        </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[#8899a6]">No sources configured. Add one above to get started!</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6 border-t border-[#38444d] flex justify-end flex-shrink-0">
          <button onClick={handleCloseModal} className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal; 