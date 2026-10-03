const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * "3 Sep 2026", by this phone's calendar. Written out rather than left to the
 * runtime's locale data, which spells September "Sept" in some builds.
 */
export function shortDate(at: number): string {
  const date = new Date(at);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "3 Sep 2026, 14:32". */
export function dateAndTime(at: number): string {
  const date = new Date(at);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${shortDate(at)}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "3 September", as a screen reader says a row's day. */
export function spokenDay(at: number): string {
  const date = new Date(at);
  return `${date.getDate()} ${LONG_MONTHS[date.getMonth()]}`;
}
