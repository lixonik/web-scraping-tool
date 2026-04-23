/**
 * Тексты, используемые в шаблоне `app.html` через поле
 * `templateVariables` на компоненте `App`. Вынесены в константу,
 * чтобы не хардкодить строки в HTML и иметь единую точку
 * правки для переводов/копирайта.
 */
export const APP_TEMPLATE_VARIABLES = {
  dividers: {
    browser: 'Browser',
    element: 'Element',
    tools: 'Tools',
    logs: 'Logs',
  },
  placeholders: {
    url: 'URL to open in new tab (http:// or https://)',
    cssLocator: 'CSS locator',
  },
  tooltips: {
    invalidUrl: 'Enter a valid http(s) URL',
    emptyLocator: 'Enter a CSS locator',
    openHandledWindowHint: 'Open handled window first',
  },
  buttons: {
    open: 'Open',
    locate: 'Locate',
    startNetworkLogging: 'Start Network Logging',
    stopNetworkLogging: 'Stop Network Logging',
    startConsoleLogging: 'Start Console Logging',
    stopConsoleLogging: 'Stop Console Logging',
    openOutputFolder: 'Open Output Folder',
  },
} as const;
