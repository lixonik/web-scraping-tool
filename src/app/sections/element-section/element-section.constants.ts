/**
 * Тексты шаблона `element-section.html`.
 */
export const ELEMENT_SECTION_TEMPLATE_VARIABLES = {
  placeholders: {
    cssLocator: 'CSS locator',
  },
  tooltips: {
    emptyLocator: 'Enter a CSS locator',
    openHandledWindowHint: 'Open handled window first',
  },
  buttons: {
    locate: 'Locate',
  },
} as const;

/**
 * Заголовки и фолбэк-сообщения для `NzNotificationService`
 * на компоненте `ElementSection`.
 */
export const ELEMENT_SECTION_NOTIFICATION_MESSAGES = {
  elementSave: {
    successTitle: 'Element saved',
    errorTitle: 'Save failed',
    fallbackError: 'Unknown error',
  },
} as const;
