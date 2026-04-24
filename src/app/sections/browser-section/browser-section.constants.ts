/**
 * Тексты шаблона `browser-section.html`.
 */
export const BROWSER_SECTION_TEMPLATE_VARIABLES = {
  placeholders: {
    url: 'URL to open in new tab (http:// or https://)',
  },
  tooltips: {
    invalidUrl: 'Enter a valid http(s) URL',
  },
  buttons: {
    open: 'Open',
  },
} as const;

/**
 * Заголовки и фолбэк-сообщения для `NzNotificationService`
 * на компоненте `BrowserSection`.
 */
export const BROWSER_SECTION_NOTIFICATION_MESSAGES = {
  handledWindow: {
    title: 'Handled window',
    openedPrefix: 'Opened',
    fallbackFailed: 'Failed to open',
  },
} as const;
