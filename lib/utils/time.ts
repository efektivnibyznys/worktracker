/**
 * Format minutes to hours and minutes string
 * @param minutes Total minutes
 * @returns Formatted string like "5 h 30 min" or "2 h"
 */
export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (mins === 0) {
    return `${hours} h`
  }

  return `${hours} h ${mins} min`
}

/**
 * Calculate duration in minutes from start and end time
 * @param startTime Time in format "HH:mm"
 * @param endTime Time in format "HH:mm"
 * @returns Duration in minutes
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)

  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  return endMinutes - startMinutes
}
