import { getLocale, t } from "../i18n";

type DurationUnit = "hour" | "minute" | "second";

/** Human-readable duration, e.g. "1h 4m", "2m 3s", "8s", or "<1s" */
export function formatDuration(milliseconds: number) {
  if (milliseconds < 1000) return t("duration.underSecond");

  const totalSeconds = Math.round(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(formatUnit(hours, "hour"));
  if (minutes > 0) parts.push(formatUnit(minutes, "minute"));
  // Only show seconds when the duration is under an hour
  if (seconds > 0 && hours === 0) parts.push(formatUnit(seconds, "second"));

  return parts.join(" ");
}

export function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString(getLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatUnit(value: number, unit: DurationUnit) {
  return new Intl.NumberFormat(getLocale(), {
    style: "unit",
    unit,
    unitDisplay: "narrow",
  }).format(value);
}
