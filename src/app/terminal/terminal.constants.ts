/**
 * Тексты, используемые в шаблоне `terminal.component.html` и в
 * коде компонента для префиксов строк. Выделены в константу по тем
 * же причинам, что и `APP_TEMPLATE_VARIABLES`.
 */
export const TERMINAL_TEMPLATE_VARIABLES = {
  filters: {
    network: 'Network',
    console: 'Console',
  },
  buttons: {
    clear: 'Clear',
  },
  banners: {
    ready: '[terminal ready]',
  },
  sourceTags: {
    network: 'NET',
    console: 'CON',
  },
} as const;
