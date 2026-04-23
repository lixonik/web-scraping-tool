import { app } from 'electron';
import { join } from 'path';

/**
 * Единый корень артефактов инструмента — `Documents/WebScrapingTool/`.
 *
 * Используется пользовательский каталог документов вместо относительных путей
 * от `__dirname`, т.к. после сборки (`electron-builder`) код основного процесса
 * находится внутри `resources/app.asar` (read-only). Все выходные данные —
 * и логи, и сохранённые элементы — хранятся под одним корнем, чтобы кнопка
 * «Open Output Folder» открывала именно его, и пользователь видел всё рядом.
 */
export function getOutputRoot(): string {
  return join(app.getPath('documents'), 'WebScrapingTool');
}

export function getNetworkLogsDir(): string {
  return join(getOutputRoot(), 'logs', 'network');
}

export function getConsoleLogsDir(): string {
  return join(getOutputRoot(), 'logs', 'console');
}

export function getSavedElementsDir(): string {
  return join(getOutputRoot(), 'saved_elements');
}
