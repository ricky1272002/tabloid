// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { SourceData, TweetData, PriceData, TickerConfig, NewSourcePayload } from '../shared/types';

export interface ElectronAPI {
  // Renderer to Main (Invoke)
  getInitialLoadData: () => Promise<{ 
    sources: SourceData[], 
    tweetsBySource: Record<string, TweetData[]>, 
    tickerConfigs: TickerConfig[],
    isOnline: boolean;
  }>;
  removeSource: (sourceId: string) => Promise<{ success: boolean, sources?: SourceData[], error?: string }>;
  addSource: (sourceData: NewSourcePayload) => Promise<{ success: boolean, sources?: SourceData[], error?: string }>;
  checkNetworkStatus: () => Promise<{ isOnline: boolean }>;
  // Main to Renderer (Receive)
  onNewTweets: (callback: (data: { sourceId: string; tweets: TweetData[] }) => void) => (() => void);
  onSourceFetchError: (callback: (data: { sourceId: string; error: string }) => void) => (() => void);
  onPriceUpdate: (callback: (data: PriceData) => void) => (() => void);
  onNetworkStatusChange: (callback: (data: { isOnline: boolean }) => void) => (() => void);
  // Renderer to Main (Send - if needed, e.g., for user actions)
  // exampleAction: (data: any) => void;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getInitialLoadData: async () => {
    // This will require a handler in the main process
    return ipcRenderer.invoke('get-initial-load-data');
  },
  removeSource: (sourceId: string) => ipcRenderer.invoke('remove-source', sourceId),
  addSource: (sourceData: NewSourcePayload) => ipcRenderer.invoke('add-source', sourceData),
  checkNetworkStatus: () => ipcRenderer.invoke('check-network-status'),
  onNewTweets: (callback: (data: { sourceId: string; tweets: TweetData[] }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { sourceId: string; tweets: TweetData[] }) => callback(data);
    ipcRenderer.on('new-tweets', handler);
    return () => ipcRenderer.removeListener('new-tweets', handler);
  },
  onSourceFetchError: (callback: (data: { sourceId: string; error: string }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { sourceId: string; error: string }) => callback(data);
    ipcRenderer.on('source-fetch-error', handler);
    return () => ipcRenderer.removeListener('source-fetch-error', handler);
  },
  onPriceUpdate: (callback: (data: PriceData) => void) => {
    const handler = (_event: IpcRendererEvent, data: PriceData) => callback(data);
    ipcRenderer.on('price-update', handler);
    return () => ipcRenderer.removeListener('price-update', handler);
  },
  onNetworkStatusChange: (callback: (data: { isOnline: boolean }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { isOnline: boolean }) => callback(data);
    ipcRenderer.on('network-status', handler);
    return () => ipcRenderer.removeListener('network-status', handler);
  },
  // exampleAction: (data) => ipcRenderer.send('example-action', data),
});

// It's good practice to declare the types for the exposed API on the window object for TypeScript in the renderer
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

console.log('Preload script loaded.'); 