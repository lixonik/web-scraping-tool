const UTC_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC+3

const pad = (n: number) => String(n).padStart(2, '0');

/** HH_MM_SS-DD_MM_YYYY (UTC+3) — для имён файлов/папок */
export function formatDateLocal(date: Date): string {
  const local = new Date(date.getTime() + UTC_OFFSET_MS);
  return `${pad(local.getUTCHours())}_${pad(local.getUTCMinutes())}_${pad(local.getUTCSeconds())}-${pad(local.getUTCDate())}_${pad(local.getUTCMonth() + 1)}_${local.getUTCFullYear()}`;
}

/** YYYY-MM-DD HH:MM:SS UTC+3 — для отображения в отчётах/логах */
export function formatDateISO(date: Date): string {
  const local = new Date(date.getTime() + UTC_OFFSET_MS);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())} UTC+3`;
}
