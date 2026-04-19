/// <reference path='../../../global.d.ts'/>
import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// Custom APIs for renderer
const api = {
  runPl: () => {
    // для асинхронных вызовов с ответом
    // await ipcRenderer.invoke('run-pl', args)
    ipcRenderer.send('run-pl');
  },
  openNewTab: (url: string) => {
    ipcRenderer.send('open-new-tab', url);
  },
  onSendLocator: (locator: string) => {
    ipcRenderer.send('on-send-locator', locator)
  },
  fetchLocalHost: () => {
    ipcRenderer.send('fetch-local-host')
  },
  startNetworkLogging: (resourceTypes?: string[]) => {
    ipcRenderer.send('start-network-logging', resourceTypes);
  },
  stopNetworkLogging: () => {
    ipcRenderer.send('stop-network-logging');
  },
  startConsoleLogging: () => {
    ipcRenderer.send('start-console-logging');
  },
  stopConsoleLogging: () => {
    ipcRenderer.send('stop-console-logging');
  },
  onLoggerLine: (
    cb: (data: { source: 'network' | 'console'; line: string }) => void,
  ) => {
    const listener = (_e: Electron.IpcRendererEvent, data: { source: 'network' | 'console'; line: string }) => cb(data);
    ipcRenderer.on('logger:line', listener);
    return () => {
      ipcRenderer.removeListener('logger:line', listener);
    };
  },
  onHandledPageStatus: (cb: (data: { ready: boolean }) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, data: { ready: boolean }) => cb(data);
    ipcRenderer.on('handled-page:status', listener);
    return () => {
      ipcRenderer.removeListener('handled-page:status', listener);
    };
  },
} satisfies Window['api'];

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
