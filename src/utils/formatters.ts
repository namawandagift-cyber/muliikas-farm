import { DateFilter, DateFilterOption, Sale, Expense } from '../types';

/**
 * Format currency in Uganda Shillings (UGX) safely
 * Always guards against undefined, null, NaN
 */
export function formatMoney(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return 'UGX 0';
  }
  const numeric = Math.round(Number(amount));
  return `UGX ${numeric.toLocaleString('en-US')}`;
}

/**
 * Format milk quantity in Litres
 */
export function formatLitres(litres: number | string | undefined | null): string {
  if (litres === undefined || litres === null || isNaN(Number(litres))) {
    return '0 L';
  }
  const val = Number(litres);
  const formatted = Number.isInteger(val) ? val.toLocaleString('en-US') : val.toFixed(1);
  return `${formatted} L`;
}

/**
 * Get date string in YYYY-MM-DD
 */
export function getTodayString(): string {
  const now = new Date();
  return formatDateToISO(now);
}

export function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateToISO(d);
}

export function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Friendly readable date label
 */
export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) {
    return 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  } else {
    return 'Good evening';
  }
}

/**
 * Format today's date nicely for farmer header
 * e.g. "Saturday, 26 September"
 */
export function getTodayFormatted(): string {
  const d = new Date();
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Format time from createdAt string or current time
 * e.g. "08:30" or "16:15"
 */
export function formatTimeFromDate(isoOrDateStr?: string): string {
  if (!isoOrDateStr) return '';
  try {
    const d = new Date(isoOrDateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
  } catch {
    // fallback
  }
  return '';
}

/**
 * Format time from createdAt string or current time in 12h AM/PM
 * e.g. "7:15 AM" or "5:20 PM"
 */
export function formatTime12Hour(isoOrDateStr?: string): string {
  if (!isoOrDateStr) return '';
  try {
    const d = new Date(isoOrDateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  } catch {
    // fallback
  }
  return '';
}

/**
 * Format date string (YYYY-MM-DD) into Day Month format
 * e.g. "2026-09-26" -> "26 September"
 */
export function formatDayMonth(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

/**
 * Get current week's 7 days from Monday to Sunday
 */
export interface WeekDayInfo {
  dayName: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  shortName: string;
  dateStr: string; // YYYY-MM-DD
  displayDate: string; // e.g. "22 Sep"
  isToday: boolean;
}

export function getCurrentWeekDays(): WeekDayInfo[] {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = (dayOfWeek + 6) % 7; // distance back to Monday

  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const days: WeekDayInfo[] = [];
  const dayNames: WeekDayInfo['dayName'][] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const todayStr = getTodayString();

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = formatDateToISO(d);
    days.push({
      dayName: dayNames[i],
      shortName: dayNames[i].slice(0, 3),
      dateStr,
      displayDate: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      isToday: dateStr === todayStr,
    });
  }

  return days;
}

/**
 * Friendly readable date label
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const today = getTodayString();
  const yesterday = getYesterdayString();

  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';

  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

/**
 * Check if a date string falls inside the selected DateFilter
 */
export function isDateInFilter(dateStr: string, filter: DateFilter): boolean {
  if (!dateStr) return false;
  const today = getTodayString();
  const yesterday = getYesterdayString();

  switch (filter.type) {
    case 'today':
      return dateStr === today;
    case 'yesterday':
      return dateStr === yesterday;
    case 'week': {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 is Sunday
      const diffToMonday = (dayOfWeek + 6) % 7;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - diffToMonday);
      startOfWeek.setHours(0, 0, 0, 0);

      const itemDate = new Date(dateStr + 'T00:00:00');
      return itemDate >= startOfWeek;
    }
    case 'month': {
      const currentYearMonth = today.slice(0, 7); // YYYY-MM
      return dateStr.startsWith(currentYearMonth);
    }
    case 'custom': {
      if (filter.startDate && filter.endDate) {
        return dateStr >= filter.startDate && dateStr <= filter.endDate;
      }
      if (filter.startDate) {
        return dateStr >= filter.startDate;
      }
      if (filter.endDate) {
        return dateStr <= filter.endDate;
      }
      return true;
    }
    default:
      return true;
  }
}

/**
 * Generate readable Human Summary for DairyPulse Dashboard
 * Example: "Today you sold 128 litres and made UGX 305,000 after expenses."
 */
export function generateTodayMilkSummary(
  recordCount: number,
  litres: number,
  moneyReceived: number,
  moneyOwed: number
): string {
  if (recordCount === 0 || litres === 0) {
    return "You haven't recorded any milk yet today.";
  }

  const roundedLitres = Number.isInteger(litres) ? litres : litres.toFixed(1);
  const formattedReceived = formatMoney(moneyReceived);

  if (recordCount === 1) {
    if (moneyOwed > 0) {
      return `You sold ${roundedLitres} litres today and received ${formattedReceived} (${formatMoney(moneyOwed)} still owed).`;
    }
    return `You sold ${roundedLitres} litres today and received ${formattedReceived}.`;
  }

  // Multiple records
  if (moneyOwed > 0) {
    return `You sold ${roundedLitres} litres today across ${recordCount} batches, received ${formattedReceived}, and ${formatMoney(moneyOwed)} is still owed.`;
  }
  return `You sold ${roundedLitres} litres today and received ${formattedReceived}.`;
}

/**
 * Generate readable Human Summary for DairyPulse Dashboard
 * Example: "Today you sold 128 litres and made UGX 305,000 after expenses."
 */
export function generateHumanSummary(
  filterType: DateFilterOption,
  litres: number,
  profit: number,
  sales: number,
  moneyIn: number,
  moneySpent: number
): string {
  let periodWord = 'Today';
  if (filterType === 'yesterday') periodWord = 'Yesterday';
  else if (filterType === 'week') periodWord = 'This week';
  else if (filterType === 'month') periodWord = 'This month';
  else if (filterType === 'custom') periodWord = 'During this period';

  if (litres === 0 && moneySpent === 0 && sales === 0) {
    return `${periodWord} has no milk sales or farm expenses recorded yet.`;
  }

  const roundedLitres = Number.isInteger(litres) ? litres : litres.toFixed(1);
  const formattedProfit = formatMoney(Math.abs(profit));

  if (profit >= 0) {
    return `${periodWord} you sold ${roundedLitres} litres and made ${formattedProfit} after expenses.`;
  } else {
    return `${periodWord} you sold ${roundedLitres} litres, with farm expenses exceeding cash in by ${formattedProfit}.`;
  }
}
