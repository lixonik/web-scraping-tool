import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { join } from 'path';
import { appendFileSync, mkdirSync } from 'fs';
import { runDistServer } from './run-dist-server';
import waitOn from 'wait-on';
import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import {
  runPlaywrightHandledPageData,
  runPlaywrightToolWindow,
} from './run-playwright';
import { saveLocatorData } from './save-element';
import { getOutputRoot } from './paths';
import {
  attachCDPNetworkLogger,
  NetworkLoggerHandle,
} from './cdp-network-logger';
import { attachConsoleLogger, ConsoleLoggerHandle } from './console-logger';
import { Browser, Page } from 'playwright-core';

let handledBrowserWindow: BrowserWindow | null = null;
let toolPage: Page | null = null;
let playwrightHandledPageData: {
  handledPage: Page;
  browser: Browser;
} | null = null;
let networkLoggerHandle: NetworkLoggerHandle | null = null;
let consoleLoggerHandle: ConsoleLoggerHandle | null = null;

const distServerPort = 3001;
const distServerUrl = `http://localhost:${distServerPort}`;

// Фиксируем имя приложения до первого обращения к app.getPath(...) — от него
// зависит имя каталога в %APPDATA% (userData/logs). Без этого в dev-режиме
// логи уйдут в %APPDATA%\Electron\... вместо %APPDATA%\WebScrapingTool\...
app.setName('WebScrapingTool');

// ==== Диагностический лог главного процесса ====
// У GUI-приложения на Windows нет видимого stderr; при падениях в prod-сборке
// без этого лога диагностика невозможна. Пишем startup-события и необработанные
// ошибки в %APPDATA%\WebScrapingTool\logs\startup.log.
function logStartup(message: string): void {
  try {
    const dir = join(app.getPath('logs'));
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, 'startup.log'), `[${new Date().toISOString()}] ${message}\n`);
  } catch {
    /* ignore — логирование не должно мешать запуску */
  }
}

process.on('uncaughtException', (err) => {
  logStartup(`uncaughtException: ${err?.stack || err}`);
  try {
    dialog.showErrorBox('WebScrapingTool — ошибка запуска', String(err?.stack || err));
  } catch { /* dialog может быть недоступен до ready */ }
});
process.on('unhandledRejection', (reason) => {
  logStartup(`unhandledRejection: ${(reason as Error)?.stack || String(reason)}`);
});

logStartup(`main started, __dirname=${__dirname}, isPackaged=${app.isPackaged}`);

const DEBUG_PORT = 9222;
// running browser args
app.commandLine.appendSwitch('remote-debugging-port', String(DEBUG_PORT));

// Подавляем фоновые HTTPS-запросы Chromium к сервисам Google (component updater,
// safe browsing, translate и т.п.) — это источник periodic SSL handshake ошибок
// в stderr при запуске, никак не связанный с целевыми страницами.
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-default-apps');
app.commandLine.appendSwitch(
  'disable-features',
  'OptimizationHints,Translate,MediaRouter',
);

// На всякий случай: разрешаем самоподписанные/проблемные сертификаты целевых страниц
app.on(
  'certificate-error',
  (event, _webContents, _url, _error, _cert, callback) => {
    event.preventDefault();
    callback(true);
  },
);

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

  // optimizer.watchWindowShortcuts в prod-режиме принудительно блокирует F12
  // и Ctrl+R. Для управляемого окна DevTools нужны — вешаем свой обработчик
  // F12 первым, прежде чем optimizer успеет отменить событие.
  win2.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.code === 'F12') {
      if (win2.webContents.isDevToolsOpened()) {
        win2.webContents.closeDevTools();
      } else {
        win2.webContents.openDevTools({ mode: 'undocked' });
      }
      event.preventDefault();
    }
  });

  await win2.loadURL(url);

  return win2;
}

async function createWindow(): Promise<void> {
  const mainWindow = new BrowserWindow({
    title: 'WebScrapingTool',
    width: 900,
    height: 670,
    show: true,
    autoHideMenuBar: true,
    // ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      devTools: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  // Закрытие управляющего окна трактуем как выход из приложения:
  // гасим активные логгеры, закрываем управляемое окно Electron и
  // связанный с ним браузер Playwright, затем выходим из приложения.
  mainWindow.on('closed', () => {
    if (networkLoggerHandle) {
      networkLoggerHandle.stop();
      networkLoggerHandle = null;
    }
    if (consoleLoggerHandle) {
      consoleLoggerHandle.stop();
      consoleLoggerHandle = null;
    }
    if (handledBrowserWindow && !handledBrowserWindow.isDestroyed()) {
      handledBrowserWindow.close();
    }
    handledBrowserWindow = null;
    if (playwrightHandledPageData) {
      // browser.close() асинхронный, но дожидаться его до app.quit() не требуется
      // — electron-builder/Chromium корректно завершат подпроцессы.
      playwrightHandledPageData.browser.close().catch(() => { /* ignore */ });
      playwrightHandledPageData = null;
    }
    app.quit();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  const targetUrl = is.dev ? `http://localhost:4200` : distServerUrl;
  logStartup(`mainWindow.loadURL(${targetUrl})`);
  try {
    await mainWindow.loadURL(targetUrl);
    logStartup('loadURL OK');
  } catch (e) {
    logStartup(`loadURL FAILED: ${(e as Error)?.stack || e}`);
  }
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    logStartup(`did-fail-load: code=${code}, desc=${desc}, url=${url}`);
    // Показать окно с диагностикой, чтобы пользователь не видел «пустой» процесс
    mainWindow.loadURL(
      'data:text/html;charset=utf-8,' +
        encodeURIComponent(
          `<html><body style="font:14px system-ui;padding:24px">
           <h2>Ошибка загрузки UI</h2>
           <p>Код: ${code}</p><p>Описание: ${desc}</p><p>URL: ${url}</p>
           <p>См. %APPDATA%\\WebScrapingTool\\logs\\startup.log</p>
           </body></html>`,
        ),
    );
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  logStartup(`whenReady, is.dev=${is.dev}, resources dir check=${join(__dirname, '..', '..', 'resources')}`);
  try {
    await runDistServer(distServerPort, is.dev);
    logStartup('runDistServer: listen OK');
  } catch (e) {
    logStartup(`runDistServer FAILED: ${(e as Error)?.stack || e}`);
    throw e;
  }

  try {
    await waitOn({ resources: [distServerUrl], timeout: 10000 });
    logStartup('waitOn OK');
  } catch (e) {
    logStartup(`waitOn FAILED: ${(e as Error)?.stack || e}`);
    throw e;
  }
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

  ipcMain.handle(
    'open-new-tab',
    async (event: Electron.IpcMainInvokeEvent, url: string): Promise<{ ok: boolean; message?: string }> => {
      if (networkLoggerHandle) {
        networkLoggerHandle.stop();
        networkLoggerHandle = null;
      }
      if (consoleLoggerHandle) {
        consoleLoggerHandle.stop();
        consoleLoggerHandle = null;
      }
      if (handledBrowserWindow !== null) {
        handledBrowserWindow.close();
      }
      try {
        handledBrowserWindow = await createWin2(url);
        logStartup('createWin2 OK');
      } catch (e) {
        const msg = (e as Error)?.message || String(e);
        logStartup(`createWin2 FAILED: ${(e as Error)?.stack || e}`);
        return { ok: false, message: `Failed to open window: ${msg}` };
      }
      if (playwrightHandledPageData !== null) {
        playwrightHandledPageData.browser.close();
      }
      try {
        playwrightHandledPageData = await runPlaywrightHandledPageData(url);
        logStartup('runPlaywrightHandledPageData OK');
      } catch (e) {
        const msg = (e as Error)?.message || String(e);
        logStartup(`runPlaywrightHandledPageData FAILED: ${(e as Error)?.stack || e}`);
        return { ok: false, message: `Failed to attach Playwright: ${msg}` };
      }

      const sender = event.sender;
      if (!sender.isDestroyed()) {
        sender.send('handled-page:status', { ready: true });
      }

      handledBrowserWindow.on('closed', () => {
        handledBrowserWindow = null;
        playwrightHandledPageData = null;
        if (networkLoggerHandle) {
          networkLoggerHandle.stop();
          networkLoggerHandle = null;
        }
        if (consoleLoggerHandle) {
          consoleLoggerHandle.stop();
          consoleLoggerHandle = null;
        }
        if (!sender.isDestroyed()) {
          sender.send('handled-page:status', { ready: false });
        }
      });

      return { ok: true };
    },
  );

  ipcMain.handle(
    'on-send-locator',
    async (_event: Electron.IpcMainInvokeEvent, locator: string): Promise<{ ok: boolean; message?: string; path?: string }> => {
      const page = playwrightHandledPageData?.handledPage ?? toolPage;
      if (!page) {
        return { ok: false, message: 'No page available — open a tab first' };
      }
      try {
        const loc = page.locator(locator);
        const savedDir = await saveLocatorData(loc, locator);
        loc.highlight().catch(() => { /* highlight is best-effort */ });
        return { ok: true, path: savedDir };
      } catch (err) {
        const msg = (err as Error)?.message || String(err);
        return { ok: false, message: msg };
      }
    },
  );

  ipcMain.handle(
    'start-network-logging',
    async (event: Electron.IpcMainInvokeEvent, resourceTypes?: string[]): Promise<{ ok: boolean; message?: string; logFilePath?: string }> => {
      const page = playwrightHandledPageData?.handledPage ?? toolPage;
      if (!page) {
        return { ok: false, message: 'No page available — open a tab first' };
      }
      if (networkLoggerHandle) {
        networkLoggerHandle.stop();
        networkLoggerHandle = null;
      }
      const sender = event.sender;
      try {
        networkLoggerHandle = await attachCDPNetworkLogger(
          page,
          (resourceTypes as any) ?? ['All'],
          (line) => {
            if (!sender.isDestroyed()) {
              sender.send('logger:line', { source: 'network', line });
            }
          },
        );
        return { ok: true, logFilePath: networkLoggerHandle.logFilePath };
      } catch (err) {
        const msg = (err as Error)?.message || String(err);
        return { ok: false, message: msg };
      }
    },
  );

  ipcMain.handle('stop-network-logging', (): { ok: boolean; message?: string; logFilePath?: string } => {
    if (networkLoggerHandle) {
      const path = networkLoggerHandle.logFilePath;
      networkLoggerHandle.stop();
      networkLoggerHandle = null;
      return { ok: true, logFilePath: path };
    }
    return { ok: false, message: 'No active network logger' };
  });

  ipcMain.handle(
    'start-console-logging',
    (event: Electron.IpcMainInvokeEvent): { ok: boolean; message?: string; logFilePath?: string } => {
      const page = playwrightHandledPageData?.handledPage ?? toolPage;
      if (!page) {
        return { ok: false, message: 'No page available — open a tab first' };
      }
      if (consoleLoggerHandle) {
        consoleLoggerHandle.stop();
        consoleLoggerHandle = null;
      }
      const sender = event.sender;
      try {
        consoleLoggerHandle = attachConsoleLogger(page, (line) => {
          if (!sender.isDestroyed()) {
            sender.send('logger:line', { source: 'console', line });
          }
        });
        return { ok: true, logFilePath: consoleLoggerHandle.logFilePath };
      } catch (err) {
        const msg = (err as Error)?.message || String(err);
        return { ok: false, message: msg };
      }
    },
  );

  ipcMain.handle('stop-console-logging', (): { ok: boolean; message?: string; logFilePath?: string } => {
    if (consoleLoggerHandle) {
      const path = consoleLoggerHandle.logFilePath;
      consoleLoggerHandle.stop();
      consoleLoggerHandle = null;
      return { ok: true, logFilePath: path };
    }
    return { ok: false, message: 'No active console logger' };
  });

  ipcMain.handle('open-output-folder', async (): Promise<{ ok: boolean; message?: string; path?: string }> => {
    const root = getOutputRoot();
    try {
      mkdirSync(root, { recursive: true });
      const errMsg = await shell.openPath(root);
      if (errMsg) {
        return { ok: false, message: errMsg, path: root };
      }
      return { ok: true, path: root };
    } catch (err) {
      const msg = (err as Error)?.message || String(err);
      return { ok: false, message: msg, path: root };
    }
  });

  logStartup('about to createWindow()');
  try {
    await createWindow();
    logStartup('createWindow OK');
  } catch (e) {
    logStartup(`createWindow FAILED: ${(e as Error)?.stack || e}`);
    throw e;
  }
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
