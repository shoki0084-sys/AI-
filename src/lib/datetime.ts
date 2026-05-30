const JST = 'Asia/Tokyo';

/** 指定日（デフォルトは現在）の JST における 0:00〜23:59:59.999 */
export function getJstDayBounds(date = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: JST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

  return {
    start: `${day}T00:00:00+09:00`,
    end: `${day}T23:59:59.999+09:00`,
    label: day,
  };
}

export function isWithinJstDay(iso: string, date = new Date()) {
  const { start, end } = getJstDayBounds(date);
  return iso >= start && iso <= end;
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

/** YYYY-MM-DD（日本時間のカレンダー日） */
export function getJstDayBoundsFromString(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error('invalid date format');
  }
  return {
    start: `${day}T00:00:00+09:00`,
    end: `${day}T23:59:59.999+09:00`,
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
