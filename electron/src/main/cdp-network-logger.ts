import { Page } from 'playwright-core';
import { mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { formatDateLocal, formatDateISO } from './date-utils';

export type NetworkResourceType =
  | 'Document'
  | 'Stylesheet'
  | 'Image'
  | 'Media'
  | 'Font'
  | 'Script'
  | 'XHR'
  | 'Fetch'
  | 'WebSocket'
  | 'Manifest'
  | 'Other'
  | 'Wasm';

export type LoggableNetworkResourceType = 'All' | NetworkResourceType;

const MAX_BODY_LENGTH = 10_000;
const LOG_DIR = join(__dirname, '../../../output/logs/network');

export interface NetworkLoggerHandle {
  stop: () => void;
  logFilePath: string;
}

export async function attachCDPNetworkLogger(
  page: Page,
  resourceTypes: LoggableNetworkResourceType[] = ['All'],
  onLog?: (line: string) => void,
): Promise<NetworkLoggerHandle> {
  mkdirSync(LOG_DIR, { recursive: true });

  const logFilePath = join(LOG_DIR, `${formatDateLocal(new Date())}.log`);

  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');

  const pendingBodies = new Set<string>();
  let stopped = false;

  const log = (line: string) => {
    if (stopped) return;
    const formatted = `[${formatDateISO(new Date())}] ${line}`;
    appendFileSync(logFilePath, `${formatted}\n`);
    onLog?.(formatted);
  };

  const shouldLog = (type: string): boolean => {
    if (resourceTypes.includes('All')) return true;
    return resourceTypes.includes(type as NetworkResourceType);
  };

  const logWs = resourceTypes.includes('All') || resourceTypes.includes('WebSocket');

  // --- HTTP lifecycle ---

  client.on('Network.requestWillBeSent', (event: any) => {
    if (!shouldLog(event.type)) return;

    log(`[REQUEST] ${event.request.method} ${event.request.url} [${event.type}]`);

    if (event.request.postData) {
      log(`[REQUEST BODY] ${event.request.postData}`);
    }
  });

  client.on('Network.responseReceived', (event: any) => {
    if (!shouldLog(event.type)) return;

    log(`[RESPONSE] ${event.response.status} ${event.response.url} [${event.type}]`);
    pendingBodies.add(event.requestId);
  });

  client.on('Network.loadingFinished', async (event: any) => {
    if (!pendingBodies.has(event.requestId)) return;
    pendingBodies.delete(event.requestId);

    try {
      const body = await client.send('Network.getResponseBody', {
        requestId: event.requestId,
      });

      if (body.base64Encoded) {
        const buf = Buffer.from(body.body, 'base64');
        log(`[RESPONSE BODY] ${event.requestId} [BINARY length=${buf.length}]`);
      } else {
        const text = body.body.length > MAX_BODY_LENGTH
          ? body.body.slice(0, MAX_BODY_LENGTH) + `... [truncated, total ${body.body.length} chars]`
          : body.body;
        log(`[RESPONSE BODY] ${event.requestId}\n${text}`);
      }
    } catch (err) {
      log(`[RESPONSE BODY ERROR] ${event.requestId} ${String(err)}`);
    }
  });

  // --- WebSocket frames ---

  if (logWs) {
    client.on('Network.webSocketFrameReceived', (event: any) => {
      const payload = event.response?.payloadData ?? '';
      log(`[WS RECEIVED] ${payload}`);
    });

    client.on('Network.webSocketFrameSent', (event: any) => {
      const payload = event.response?.payloadData ?? '';
      log(`[WS SENT] ${payload}`);
    });
  }

  // --- Stop handle ---

  const stop = () => {
    if (stopped) return;
    stopped = true;
    pendingBodies.clear();
    try {
      client.send('Network.disable').catch(() => {});
      client.detach().catch(() => {});
    } catch {
      /* session may already be detached */
    }
  };

  console.log('Network logging started:', logFilePath);
  return { stop, logFilePath };
}
