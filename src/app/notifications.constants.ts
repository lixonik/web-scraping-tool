/**
 * Заголовки и фолбэк-сообщения для `NzNotificationService` на
 * компоненте `App`. Выделены в отдельную константу (и отдельный файл),
 * т.к. шаблоны интерфейса и текст уведомлений — независимые контексты
 * локализации/правок.
 */
export const NOTIFICATION_MESSAGES = {
  handledWindow: {
    title: 'Handled window',
    openedPrefix: 'Opened',
    fallbackFailed: 'Failed to open',
  },
  elementSave: {
    successTitle: 'Element saved',
    errorTitle: 'Save failed',
    fallbackError: 'Unknown error',
  },
  networkLogging: {
    startedTitle: 'Network logging started',
    stoppedTitle: 'Network logging stopped',
    startFailedTitle: 'Start network logging failed',
    stopFailedTitle: 'Stop network logging failed',
    fallbackLogSaved: 'Log saved',
    fallbackError: 'Unknown error',
  },
  consoleLogging: {
    startedTitle: 'Console logging started',
    stoppedTitle: 'Console logging stopped',
    startFailedTitle: 'Start console logging failed',
    stopFailedTitle: 'Stop console logging failed',
    fallbackLogSaved: 'Log saved',
    fallbackError: 'Unknown error',
  },
  openOutputFolder: {
    errorTitle: 'Open output folder failed',
    fallbackError: 'Unknown error',
  },
} as const;
