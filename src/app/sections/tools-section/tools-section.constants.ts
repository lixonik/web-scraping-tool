/**
 * Тексты шаблона `tools-section.html`.
 */
export const TOOLS_SECTION_TEMPLATE_VARIABLES = {
  tooltips: {
    openHandledWindowHint: 'Open handled window first',
  },
  buttons: {
    startNetworkLogging: 'Start Network Logging',
    stopNetworkLogging: 'Stop Network Logging',
    startConsoleLogging: 'Start Console Logging',
    stopConsoleLogging: 'Stop Console Logging',
    openOutputFolder: 'Open Output Folder',
  },
} as const;

/**
 * Заголовки и фолбэк-сообщения для `NzNotificationService`
 * на компоненте `ToolsSection`.
 */
export const TOOLS_SECTION_NOTIFICATION_MESSAGES = {
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
