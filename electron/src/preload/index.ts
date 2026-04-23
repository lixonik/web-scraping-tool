/// <reference path='../../../global.d.ts'/>
import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// Унифицированный тип ответа для операций, возвращающих success/error.
type OpResult<T = unknown> = { ok: boolean; message?: string } & T;

// Custom APIs for renderer
const api = {
  runPl: () => {
    ipcRenderer.send('run-pl');
  },
  openNewTab: (url: string): Promise<OpResult> =>
    ipcRenderer.invoke('open-new-tab', url),
  onSendLocator: (locator: string): Promise<OpResult<{ path?: string }>> =>
    ipcRenderer.invoke('on-send-locator', locator),
  fetchLocalHost: () => {
    ipcRenderer.send('fetch-local-host');
  },
  startNetworkLogging: (resourceTypes?: string[]): Promise<OpResult<{ logFilePath?: string }>> =>
    ipcRenderer.invoke('start-network-logging', resourceTypes),
  stopNetworkLogging: (): Promise<OpResult<{ logFilePath?: string }>> =>
    ipcRenderer.invoke('stop-network-logging'),
  startConsoleLogging: (): Promise<OpResult<{ logFilePath?: string }>> =>
    ipcRenderer.invoke('start-console-logging'),
  stopConsoleLogging: (): Promise<OpResult<{ logFilePath?: string }>> =>
    ipcRenderer.invoke('stop-console-logging'),
  openOutputFolder: (): Promise<OpResult<{ path?: string }>> =>
    ipcRenderer.invoke('open-output-folder'),
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
