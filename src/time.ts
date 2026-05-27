export type TimeZoneOption = {
  value: string;
  label: string;
};

export const timezoneOptions: TimeZoneOption[] = [
  { value: "Asia/Taipei", label: "Asia/Taipei" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" }
];

export function formatDateTime(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}/${value("month")}/${value("day")} ${value("hour")}:${value("minute")}:${value("second")}`;
}

export function formatEasternAxisLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hour12: true
  })
    .format(date)
    .replace(", ", " ")
    .replace(" AM", "AM")
    .replace(" PM", "PM");
}

export function formatDateTimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatDateTimeLocalValueInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}:${value("second")}`;
}

export function parseDateTimeLocalInTimeZone(value: string, timeZone: string): Date {
  const [dateValue, timeValue = "00:00:00"] = value.split("T");
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute, second = 0] = timeValue.split(":").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  const firstResult = new Date(utcGuess - firstOffset);
  const secondOffset = getTimeZoneOffsetMs(firstResult, timeZone);

  return secondOffset === firstOffset ? firstResult : new Date(utcGuess - secondOffset);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const zonedAsUtc = Date.UTC(
    Number(value("year")),
    Number(value("month")) - 1,
    Number(value("day")),
    Number(value("hour")),
    Number(value("minute")),
    Number(value("second"))
  );

  return zonedAsUtc - date.getTime();
}
