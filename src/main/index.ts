import { app, BrowserWindow, ipcMain, net, Tray, Menu } from 'electron';
import path from 'path';
import './database'; // Initialize database connection
import { startBackgroundServices, stopBackgroundServices } from './polling';
import { getAllSources, getAllTickerConfigs, removeSource as dbRemoveSource, addSource as dbAddSource, NewSourceData as DbNewSourceData } from './database'; 
import { TweetData, SourceData, TickerConfig, NewSourcePayload } from '../shared/types';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Define IS_DEV for use with icon path
const IS_DEV = process.env.NODE_ENV !== 'production';

const createTray = () => {
  // It's important that the icon path is correct. 
  // For development, __dirname is roughly project_root/src/main (if running from .ts files via ts-node or similar)
  // or project_root/.webpack/main (if running compiled code).
  // For production, it will be relative to the app's resources directory.
  // A common practice is to copy assets to the output directory during build.
  let iconPath: string;
  if (IS_DEV) {
    // Path when running in development (e.g. `npm run dev` or `electron .`)
    // This might need adjustment based on your dev setup and where assets are kept.
    // If assets are in `public/` or a root `assets/` folder, adjust path.join accordingly.
    // Assuming an assets folder inside src/main for this example:
    iconPath = path.join(__dirname, 'assets/icon.png'); 
  } else {
    // Path when packaged (e.g. after `npm run package`)
    // Electron copies files from your project to a resources directory.
    // path.join(process.resourcesPath, 'assets/icon.png') is a common pattern if 'assets' is at the root of your packaged app resources.
    // If your build process copies assets into a specific structure (e.g., inside .webpack or similar), adjust here.
    // For Electron Forge, it often puts files from `public` or a configured assets dir into the resources path.
    // A safer bet for Forge might be to resolve relative to `app.getAppPath()` and then into your build structure if needed.
    iconPath = path.join(app.getAppPath(), '../app.asar.unpacked/dist/main/assets/icon.png'); // Example for a common packed structure
    // A simpler approach might be path.join(process.resourcesPath, 'icon.png') if icon is at root of resources
    // For Forge, if you put icon.png in your project root or a `public` folder that gets copied, check its final location.
    // Let's try a path that might work with Forge's default behavior for assets in renderer or a specific assets folder copied by webpack.
    // This might be tricky to get right without knowing the exact build output structure.
    // Defaulting to a relative path that Electron might find in its resources.
    // A simpler approach for now, assuming the icon might be bundled near the main entry point or copied to a known location.
    iconPath = path.join(__dirname, 'assets/icon.png'); // This might point inside an asar file. Better to use process.resourcesPath
    // A common pattern if your webpack config copies assets to a specific folder like `static` or `assets` within the output
    // For now, trying one that expects assets to be copied to a specific folder by your build tools.
    // This is a common place where icons are expected after packaging. If it fails, Electron uses a default icon.
    iconPath = path.join(process.resourcesPath, 'assets/icon.png'); 
    // If the above doesn't work, try to be more generic or ensure your build copies it correctly.
    // A very common pattern for electron-forge with webpack is that static assets are in `.webpack/renderer/static` or similar.
    // For a main process asset, it's often simpler if placed in a root `assets` folder and copied by Forge config.
    // Given the current Webpack setup, this is a guess. Let's try a path relative to main.js in packaged app.
    iconPath = path.join(__dirname, 'assets/icon.png'); // Fallback assuming it's near main.js

    // The most robust way is to copy the asset to a known location in your forge.config.ts or webpack config.
    // For now, we'll use a path that *might* work if assets/icon.png is copied to the root of the output main process directory.
    // A safe bet is often `path.join(app.getAppPath(), 'assets/icon.png')` if `assets` is in your project root and copied.
    // Or from the resources path: `path.join(process.resourcesPath, 'icon.png')` if icon.png is in the root of resources.
    // Let's try the most common one for packaged apps where icon is in resources/assets
    iconPath = path.join(process.resourcesPath, 'icon.png'); 
    // If assets are within a subdirectory in resources, like 'resources/app.asar.unpacked/assets/icon.png'
    // It really depends on the build packaging. For simplicity, let's assume icon.png is at the root of resources for production for now.
  }
  
  // For robustness, let's try a common path configuration for Electron Forge
  // Assuming `icon.png` is in `src/main/assets/` and Webpack is configured to copy it to `dist/main/assets/`
  // which then gets packed relative to the main process entry point.
  // A more direct approach if your bundler places it next to the main.js:
  const devIconPath = path.join(__dirname, 'assets', 'icon.png');
  // For packaged app, Electron Forge might put it in resources. Try a path relative to app path.
  const prodIconPath = path.join(app.getAppPath(), 'dist', 'main', 'assets', 'icon.png'); // This assumes webpack output structure
  // A simpler path if icon is copied to the root of resources by forge:
  const resourcesIconPath = path.join(process.resourcesPath, 'icon.png');

  let finalIconPath = devIconPath;
  if (!IS_DEV) {
    // Attempt to find the icon in a few common locations for packaged apps
    if (require('fs').existsSync(resourcesIconPath)) {
        finalIconPath = resourcesIconPath;
    } else if (require('fs').existsSync(prodIconPath)) {
        finalIconPath = prodIconPath;
    } else {
        console.warn("Production icon not found at expected paths, Electron may use a default icon.");
        // Use a path that Electron might resolve if icon is in asar root or similar basic packaging.
        finalIconPath = 'icon.png'; // Electron will search in default locations
    }
  }
  console.log(`Using tray icon path: ${finalIconPath}`);

  tray = new Tray(finalIconPath);
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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // We'll need to create/update this
      contextIsolation: true,
      nodeIntegration: false,
      // Enable devTools in dev environment
      devTools: process.env.NODE_ENV !== 'production',
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
  // mainWindow.webContents.openDevTools();

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

app.on('ready', () => {
  createWindow();
  createTray(); // Create tray icon after window is ready

  ipcMain.handle('get-initial-load-data', async () => {
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
      console.error("Failed to get initial load data:", error);
      return { sources: [], tweetsBySource: {}, tickerConfigs: [], isOnline: net.isOnline() };
    }
  });

  ipcMain.handle('check-network-status', async () => {
    return { isOnline: net.isOnline() };
  });

  ipcMain.handle('remove-source', async (_event, sourceId: string) => {
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

  ipcMain.handle('add-source', async (_event, payload: NewSourcePayload) => {
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
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
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