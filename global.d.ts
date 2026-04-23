import { ElectronAPI } from '@electron-toolkit/preload';

type OpResult<T = unknown> = { ok: boolean; message?: string } & T;

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      runPl: () => void;
      openNewTab: (url: string) => Promise<OpResult>;
      onSendLocator: (locator: string) => Promise<OpResult<{ path?: string }>>;
      fetchLocalHost: () => void;
      startNetworkLogging: (
        resourceTypes?: string[],
      ) => Promise<OpResult<{ logFilePath?: string }>>;
      stopNetworkLogging: () => Promise<OpResult<{ logFilePath?: string }>>;
      startConsoleLogging: () => Promise<OpResult<{ logFilePath?: string }>>;
      stopConsoleLogging: () => Promise<OpResult<{ logFilePath?: string }>>;
      openOutputFolder: () => Promise<OpResult<{ path?: string }>>;
      onLoggerLine: (
        cb: (data: { source: 'network' | 'console'; line: string }) => void,
      ) => () => void;
      onHandledPageStatus: (
        cb: (data: { ready: boolean }) => void,
      ) => () => void;
    };
  }
}
