export function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

export function getWeekStart(date: Date, startOfWeek: string = 'sunday'): Date {
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  }

  const targetDay = dayMap[startOfWeek.toLowerCase()] ?? 0
  const currentDay = date.getDay()
  const diff = (currentDay - targetDay + 7) % 7

  const weekStart = new Date(date)
  weekStart.setDate(date.getDate() - diff)
  weekStart.setHours(0, 0, 0, 0)

  return weekStart
}

export function getCurrentPeriodDates(
  period: 'daily' | 'weekly' | 'monthly' | 'session' | 'blocks',
  startOfWeek: string = 'sunday'
): { since: string; until: string } {
  const today = new Date()
  const todayStr = formatDateYYYYMMDD(today)

  switch (period) {
    case 'daily':
      return { since: todayStr, until: todayStr }

    case 'weekly': {
      const weekStart = getWeekStart(today, startOfWeek)
      return { since: formatDateYYYYMMDD(weekStart), until: todayStr }
    }

    case 'monthly':
    case 'session': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      return { since: formatDateYYYYMMDD(monthStart), until: todayStr }
    }

    case 'blocks': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      return { since: formatDateYYYYMMDD(monthStart), until: todayStr }
    }
  }
}
