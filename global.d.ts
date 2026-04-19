import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      openNewTab: (url: string) => void;
      runPl: () => void;
      onSendLocator: (locator: string) => void;
      fetchLocalHost: () => void;
      startNetworkLogging: (resourceTypes?: string[]) => void;
      stopNetworkLogging: () => void;
      startConsoleLogging: () => void;
      stopConsoleLogging: () => void;
      onLoggerLine: (
        cb: (data: { source: 'network' | 'console'; line: string }) => void,
      ) => () => void;
      onHandledPageStatus: (
        cb: (data: { ready: boolean }) => void,
      ) => () => void;
    };
  }
}
