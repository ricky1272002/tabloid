console.log('[Main Process] Script start');
import { app, BrowserWindow, ipcMain, net, Tray, Menu } from 'electron';
import path from 'path';
import './database'; // Initialize database connection
import { startBackgroundServices, stopBackgroundServices } from './polling';
import { getAllSources, getAllTickerConfigs, removeSource as dbRemoveSource, addSource as dbAddSource, NewSourceData as DbNewSourceData } from './database'; 
import { TweetData, SourceData, TickerConfig, NewSourcePayload } from '../shared/types';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  console.log('[Main Process] Electron Squirrel startup detected, quitting.');
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Define IS_DEV for use with icon path
const IS_DEV = process.env.NODE_ENV !== 'production';

const createTray = () => {
  let iconPath: string;
  if (IS_DEV) {
    iconPath = path.join(__dirname, 'assets/icon.png'); 
  } else {
    iconPath = path.join(process.resourcesPath, 'assets', 'icon.png');
  }
  
  console.log(`Using tray icon path: ${iconPath}`);

  // Check if the icon file exists, otherwise Electron will use a default icon or error
  if (!require('fs').existsSync(iconPath)) {
    console.error(`Tray icon not found at: ${iconPath}. Using default icon.`);
    // Electron might use a default or throw error. Forcing a known simple name might let Electron find a default.
    // Or, you might want to handle this more gracefully, e.g. not creating a tray if icon is missing.
    // For now, we proceed, and Electron will likely show a default icon or the error you saw if it cannot.
  }

  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide App',
      click: () => {
        if (mainWindow) {
          mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        }
      },
    },
    {
      label: 'Quit',
      click: () => {
        app.quit(); // This will trigger 'before-quit'
      },
    },
  ]);
  tray.setToolTip('Tabloid');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => { // Also allow toggling on single click for some OS
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
};

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false, // Make the window frameless
    titleBarStyle: 'hidden', // Recommended for frameless on macOS for traffic lights
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // We'll need to create/update this
      contextIsolation: true,
      nodeIntegration: false,
      // Enable devTools in dev environment
      devTools: true, // Ensuring DevTools are always enabled for now
    },
  });

  // Load the index.html of the app.
  // This assumes you have a Webpack setup that serves or copies index.html to the output directory.
  // For Electron Forge with Webpack, MAIN_WINDOW_WEBPACK_ENTRY is the entry point.
  // MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY is for the preload script.
  if (MAIN_WINDOW_WEBPACK_ENTRY) {
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  } else {
    // Fallback for development or if not using Webpack plugin's specific entries
    // This path might need adjustment based on your build output structure
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html')); 
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools(); // We can also force it open here if needed

  mainWindow.on('close', (event) => {
    if ((app as any).quitting) { // `app.quitting` will be true if app.quit() was called
      mainWindow = null; // Allow window to close and be garbage collected
    } else {
      // Instead of closing, hide the window if tray is present
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Start polling when the main window is ready and loaded
  // It might be better to start polling after the window content has loaded
  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow) {
      startBackgroundServices(mainWindow);
      // Send initial network status
      mainWindow.webContents.send('network-status', { isOnline: net.isOnline() });
    }
  });

  // IPC handlers for custom title bar controls
  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow?.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    // We need to ensure app.quitting is set correctly to bypass the hide-on-close logic
    (app as any).quitting = true;
    mainWindow?.close();
  });
  console.log("[Main Process] Custom window control IPC handlers registered.");
};

// Local function to get tweets grouped by source for initial load
// Ideally, this logic would be part of database.ts or a dedicated data service module.
const getInitialTweetsBySource = (): Promise<Record<string, TweetData[]>> => {
  return new Promise((resolve, reject) => {
    const db = require('./database').getDb(); // Direct require to get DB instance
    db.all("SELECT * FROM tweets ORDER BY source_id, created_at DESC", [], (err: Error | null, rows: any[]) => {
      if (err) return reject(err);
      const tweetsBySource: Record<string, TweetData[]> = {};
      rows.forEach(row => {
        const tweet: TweetData = {
          id: row.id,
          sourceId: row.source_id,
          author: {
            name: row.author_name,
            handle: row.author_handle,
            avatarUrl: row.author_avatar,
          },
          content: row.content,
          createdAt: row.created_at,
          metrics: { likes: row.likes || 0, retweets: row.retweets || 0 },
          media: row.media_urls ? JSON.parse(row.media_urls) : undefined,
        };
        if (!tweetsBySource[tweet.sourceId]) {
          tweetsBySource[tweet.sourceId] = [];
        }
        if (tweetsBySource[tweet.sourceId].length < 100) {
            tweetsBySource[tweet.sourceId].push(tweet);
        }
      });
      for (const sourceId in tweetsBySource) {
        tweetsBySource[sourceId].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      resolve(tweetsBySource);
    });
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
(app as any).quitting = false; // Initialize our custom flag
console.log('[Main Process] App quitting flag set to false');

app.on('ready', () => {
  console.log('[Main Process] App ready event fired.');
  createWindow();
  console.log('[Main Process] createWindow called.');
  createTray(); // Create tray icon after window is ready
  console.log('[Main Process] createTray called.');

  ipcMain.handle('get-initial-load-data', async () => {
    console.log("[Main Process] 'get-initial-load-data' IPC handler invoked.");
    try {
      const sources = await getAllSources();
      const tweetsBySource = await getInitialTweetsBySource();
      const tickerConfigs = await getAllTickerConfigs();
      
      sources.forEach(s => {
        if (!tweetsBySource[s.id]) {
          tweetsBySource[s.id] = []; // Ensure every source has an entry, even if no tweets
        }
      });
      return { sources, tweetsBySource, tickerConfigs, isOnline: net.isOnline() };
    } catch (error) {
      console.error("[Main Process] Failed to get initial load data:", error);
      return { sources: [], tweetsBySource: {}, tickerConfigs: [], isOnline: net.isOnline() };
    }
  });
  console.log("[Main Process] 'get-initial-load-data' IPC handler registered.");

  ipcMain.handle('check-network-status', async () => {
    console.log("[Main Process] 'check-network-status' IPC handler invoked.");
    return { isOnline: net.isOnline() };
  });
  console.log("[Main Process] 'check-network-status' IPC handler registered.");

  ipcMain.handle('remove-source', async (_event, sourceId: string) => {
    console.log(`[Main Process] 'remove-source' IPC handler invoked for ID: ${sourceId}`);
    try {
      await dbRemoveSource(sourceId);
      const updatedSources = await getAllSources(); // Fetch updated list
      return { success: true, sources: updatedSources }; 
    } catch (error) {
      console.error(`Failed to remove source ${sourceId}:`, error);
      // Attempt to return current sources even on failure, so UI can try to stay consistent
      const currentSources = await getAllSources().catch(() => []); // Gracefully handle error fetching sources here too
      return { success: false, error: (error as Error).message, sources: currentSources };
    }
  });
  console.log("[Main Process] 'remove-source' IPC handler registered.");

  ipcMain.handle('add-source', async (_event, payload: NewSourcePayload) => {
    console.log("[Main Process] 'add-source' IPC handler invoked.");
    try {
      // Map NewSourcePayload to DbNewSourceData (they are compatible in this case)
      // but if they diverged, this is where you'd map/validate.
      const newSourceForDb: DbNewSourceData = {
        name: payload.name,
        handle: payload.handle,
        twitterUserId: payload.twitterUserId, // This will be used as the ID
        bubblePosition: payload.bubblePosition,
        logoUrl: payload.logoUrl,
        // 'type' is defaulted to 'twitter' in dbAddSource
      };
      await dbAddSource(newSourceForDb);
      const updatedSources = await getAllSources();
      return { success: true, sources: updatedSources };
    } catch (error) {
      console.error("Failed to add source:", error);
      const currentSources = await getAllSources().catch(() => []);
      return { success: false, error: (error as Error).message, sources: currentSources };
    }
  });
  console.log("[Main Process] 'add-source' IPC handler registered.");

  // Start background services only after window and IPC handlers are ready.
  // Moved from createWindow's did-finish-load to ensure IPC is up.
  if (mainWindow) {
    startBackgroundServices(mainWindow);
    console.log('[Main Process] startBackgroundServices called.');
    // Send initial network status
    mainWindow.webContents.send('network-status', { isOnline: net.isOnline() });
    console.log('[Main Process] Initial network status sent.');
  } else {
    console.warn('[Main Process] mainWindow not available after app ready to start background services.');
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  console.log('[Main Process] Window-all-closed event fired.');
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // If not on macOS and tray exists, don't quit. User can quit via tray.
  if (process.platform !== 'darwin') {
    if (!tray) { // Only quit if there is no tray icon
      app.quit();
    }
    // If there is a tray, the app continues running.
  }
  // Background services are stopped in before-quit
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (mainWindow && !mainWindow.isVisible()) {
    mainWindow.show();
  }
});

// This is crucial for tray icon functionality
app.on('before-quit', () => {
  (app as any).quitting = true;
  stopBackgroundServices();
  if (tray) {
    tray.destroy();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// Define globals that Webpack will replace
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string; 