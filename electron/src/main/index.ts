import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { runDistServer } from './run-dist-server';
import waitOn from 'wait-on';
import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import {
  runPlaywrightHandledPageData,
  runPlaywrightToolWindow,
} from './run-playwright';
import { saveLocatorData } from './save-element';
import { attachCDPNetworkLogger, NetworkLoggerHandle } from './cdp-network-logger';
import { Browser, Page } from 'playwright-core';

let handledBrowserWindow: BrowserWindow | null = null;
let toolPage: Page | null = null;
let playwrightHandledPageData: {
  handledPage: Page;
  browser: Browser;
} | null = null;
let networkLoggerHandle: NetworkLoggerHandle | null = null;

const distServerPort = 3001;
const distServerUrl = `http://localhost:${distServerPort}`;

const DEBUG_PORT = 9222;
// running browser args
app.commandLine.appendSwitch('remote-debugging-port', String(DEBUG_PORT));

async function createWin2(url: string) {
  const win2 = new BrowserWindow({
    width: 900,
    height: 670,
    show: true,
    autoHideMenuBar: true,
    // ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      devTools: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  await win2.loadURL(url);

  return win2;
}

async function createWindow(): Promise<void> {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: true,
    autoHideMenuBar: true,
    // ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      devTools: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev) {
    await mainWindow.loadURL(`http://localhost:4200`);
  } else {
    await mainWindow.loadURL(distServerUrl);
  }
  mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  await runDistServer(distServerPort, is.dev);

  await waitOn({ resources: [distServerUrl] });
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on('ping', () => console.log('pong'));

  // для ipcRender.invoke
  // ipcMain.handle('run-pl', async () => {
  ipcMain.on('run-pl', async () => {
    toolPage = await runPlaywrightToolWindow();
  });

  ipcMain.on(
    'open-new-tab',
    async (event: Electron.IpcMainEvent, url: string) => {
      if (networkLoggerHandle) {
        networkLoggerHandle.stop();
        networkLoggerHandle = null;
      }
      if (handledBrowserWindow !== null) {
        handledBrowserWindow.close();
      }
      handledBrowserWindow = await createWin2(url);
      if (playwrightHandledPageData !== null) {
        playwrightHandledPageData.browser.close();
      }
      playwrightHandledPageData = await runPlaywrightHandledPageData(url);
    },
  );

  ipcMain.on(
    'on-send-locator',
    async (event: Electron.IpcMainEvent, locator: string) => {
      const page = playwrightHandledPageData?.handledPage ?? toolPage;
      if (!page) {
        console.log('No page available — run playwright or open a tab first');
        return;
      }
      try {
        const loc = page.locator(locator);
        loc.highlight();
        const savedDir = await saveLocatorData(loc, locator);
        console.log('Element saved to:', savedDir);
      } catch (err) {
        console.error('Failed to save locator data:', err);
      }
    },
  );

  ipcMain.on(
    'start-network-logging',
    async (event: Electron.IpcMainEvent, resourceTypes?: string[]) => {
      const page = playwrightHandledPageData?.handledPage ?? toolPage;
      if (!page) {
        console.log('No page available — run playwright or open a tab first');
        return;
      }
      if (networkLoggerHandle) {
        networkLoggerHandle.stop();
        networkLoggerHandle = null;
      }
      networkLoggerHandle = await attachCDPNetworkLogger(
        page,
        (resourceTypes as any) ?? ['All'],
      );
    },
  );

  ipcMain.on('stop-network-logging', () => {
    if (networkLoggerHandle) {
      networkLoggerHandle.stop();
      console.log('Network logging stopped');
      networkLoggerHandle = null;
    } else {
      console.log('No active network logger');
    }
  });

  await createWindow();
  // await createWin2()

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
