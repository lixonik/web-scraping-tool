import { Page, ConsoleMessage } from 'playwright-core';
import { mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { formatDateLocal, formatDateISO } from './date-utils';
import { getConsoleLogsDir } from './paths';

export interface ConsoleLoggerHandle {
  stop: () => void;
  logFilePath: string;
}

export function attachConsoleLogger(
  page: Page,
  onLog?: (line: string) => void,
): ConsoleLoggerHandle {
  const logDir = getConsoleLogsDir();
  mkdirSync(logDir, { recursive: true });

  const logFilePath = join(logDir, `${formatDateLocal(new Date())}.log`);

  let stopped = false;

  const log = (line: string) => {
    if (stopped) return;
    const formatted = `[${formatDateISO(new Date())}] ${line}`;
    appendFileSync(logFilePath, `${formatted}\n`);
    onLog?.(formatted);
  };

  const handler = async (msg: ConsoleMessage) => {
    const rawType = msg.type();
    const type = rawType.toUpperCase();
    const args = msg.args();
    const dirMode = rawType === 'dir';

    if (args.length === 0) {
      log(`[${type}] ${msg.text()}`);
      return;
    }

    const parts = await Promise.all(
      args.map(async (arg) => {
        try {
          return await arg.evaluate((v: unknown, isDir: boolean) => {
            const serializeObject = (obj: unknown): string => {
              try {
                const seen = new WeakSet();
                return JSON.stringify(
                  obj,
                  (_k, val) => {
                    if (typeof val === 'object' && val !== null) {
                      if (seen.has(val)) return '[Circular]';
                      seen.add(val);
                    }
                    return val;
                  },
                  2,
                );
              } catch {
                return String(obj);
              }
            };

            // DOM-свойства как console.dir
            const describeNode = (node: Node): Record<string, unknown> => {
              const result: Record<string, unknown> = {};
              for (const key in node) {
                try {
                  const val = (node as any)[key];
                  if (typeof val === 'function') continue;
                  if (val === null) continue;
                  if (val instanceof Node || val instanceof NodeList || val instanceof HTMLCollection) continue;
                  if (val instanceof Window) continue;
                  if (val === undefined || typeof val !== 'object') {
                    result[key] = val;
                  } else if (Array.isArray(val)) {
                    result[key] = val.map((x) =>
                      x && typeof x === 'object' ? '[object]' : x,
                    );
                  } else if (val instanceof DOMTokenList) {
                    result[key] = Array.from(val);
                  } else if (val instanceof NamedNodeMap) {
                    const attrs: Record<string, string> = {};
                    for (let i = 0; i < val.length; i++) {
                      attrs[val[i].name] = val[i].value;
                    }
                    result[key] = attrs;
                  } else if (val instanceof DOMStringMap) {
                    result[key] = { ...val };
                  } else if (val instanceof DOMRect || val instanceof DOMRectReadOnly) {
                    result[key] = {
                      x: val.x, y: val.y,
                      width: val.width, height: val.height,
                      top: val.top, right: val.right, bottom: val.bottom, left: val.left,
                    };
                  } else {
                    result[key] = '[object]';
                  }
                } catch { /* skip */ }
              }
              return result;
            };

            if (typeof Element !== 'undefined' && v instanceof Element) {
              if (isDir) return serializeObject(describeNode(v));
              return v.outerHTML;
            }
            if (typeof Node !== 'undefined' && v instanceof Node) {
              if (isDir) return serializeObject(describeNode(v));
              return (v as Node).nodeName + (v.textContent ? `: ${v.textContent}` : '');
            }
            if (typeof v === 'function') return v.toString();
            if (v === null) return 'null';
            if (v === undefined) return 'undefined';
            if (typeof v === 'object') return serializeObject(v);
            return String(v);
          }, dirMode);
        } catch {
          return String(arg);
        }
      }),
    );

    log(`[${type}] ${parts.join(' ')}`);
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
