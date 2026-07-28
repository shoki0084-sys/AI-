const JST = 'Asia/Tokyo';

/** 指定日（デフォルトは現在）の JST における 0:00〜23:59:59.999（UTC ISO で返す） */
export function getJstDayBounds(date = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: JST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return getJstDayBoundsFromString(day);
}

export function isWithinJstDay(iso: string, date = new Date()) {
  return toJstDateString(iso) === getJstDayBounds(date).label;
}

export function formatDateTimeJa(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    timeZone: JST,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getJstTodayString() {
  return getJstDayBounds().label;
}

/** YYYY-MM-DD（日本時間のカレンダー日）→ DB 比較用の UTC ISO 境界 */
export function getJstDayBoundsFromString(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error('invalid date format');
  }
  const startMs = new Date(`${day}T00:00:00+09:00`).getTime();
  const endMs = new Date(`${day}T23:59:59.999+09:00`).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    throw new Error('invalid date format');
  }
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    label: day,
  };
}

export function formatDateJa(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function toJstDateString(iso: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: JST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

/** `<input type="datetime-local">` 用の日本時間の壁時計 (YYYY-MM-DDTHH:mm) */
export function toDatetimeLocalValue(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: JST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/**
 * datetime-local の値を「日本時間の壁時計」として解釈し ISO（UTC）に変換。
 * 端末タイムゾーンに依存させない（アプリ全体が JST 基準のため）。
 */
export function datetimeLocalToIso(value: string) {
  if (!value) return new Date().toISOString();
  const trimmed = value.trim();
  const withSeconds =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(withSeconds)) {
    return new Date(`${withSeconds}+09:00`).toISOString();
  }
  return new Date(trimmed).toISOString();
}
