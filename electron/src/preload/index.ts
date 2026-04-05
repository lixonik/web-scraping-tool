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
  }
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
