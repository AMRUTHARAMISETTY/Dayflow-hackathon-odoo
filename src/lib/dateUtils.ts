import { HOLIDAYS } from "./mockApi"

export function isWeekend(date: string) {
  const d = new Date(date + "T00:00:00")
  const day = d.getDay()
  return day === 0 || day === 6
}

export function isHoliday(date: string) {
  return HOLIDAYS.has(date)
}

export function isNonWorkingDay(date: string) {
  return isWeekend(date) || isHoliday(date)
}

export function eachDate(start: string, end: string): string[] {
  if (!start || !end || end < start) return []
  const dates: string[] = []
  const cur = new Date(start + "T00:00:00")
  const last = new Date(end + "T00:00:00")
  while (cur <= last) {
    dates.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`,
    )
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export function computeWorkingDays(
  start: string,
  end: string,
  halfStart: boolean,
  halfEnd: boolean,
): number {
  const dates = eachDate(start, end).filter((d) => !isNonWorkingDay(d))
  if (dates.length === 0) return 0
  let total = dates.length
  if (halfStart && dates[0] === start) total -= 0.5
  if (halfEnd && dates[dates.length - 1] === end && dates.length > 1) total -= 0.5
  return total
}
