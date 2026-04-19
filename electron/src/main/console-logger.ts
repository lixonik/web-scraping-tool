import { Page, ConsoleMessage } from 'playwright-core';
import { mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { formatDateLocal, formatDateISO } from './date-utils';

const LOG_DIR = join(__dirname, '../../../output/logs/console');

export interface ConsoleLoggerHandle {
  stop: () => void;
  logFilePath: string;
}

export function attachConsoleLogger(
  page: Page,
  onLog?: (line: string) => void,
): ConsoleLoggerHandle {
  mkdirSync(LOG_DIR, { recursive: true });

  const logFilePath = join(LOG_DIR, `${formatDateLocal(new Date())}.log`);

  let stopped = false;

  const log = (line: string) => {
    if (stopped) return;
    const formatted = `[${formatDateISO(new Date())}] ${line}`;
    appendFileSync(logFilePath, `${formatted}\n`);
    onLog?.(formatted);
  };

  const handler = (msg: ConsoleMessage) => {
    const type = msg.type().toUpperCase();
    log(`[${type}] ${msg.text()}`);
  };

  page.on('console', handler);

  const stop = () => {
    if (stopped) return;
    stopped = true;
    try {
      page.off('console', handler);
    } catch {
      /* page may already be closed */
    }
  };

  console.log('Console logging started:', logFilePath);
  return { stop, logFilePath };
}
