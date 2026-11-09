import { addDays, differenceInCalendarDays, endOfMonth, endOfWeek, format, isValid, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

export interface CalendarContract {
  _id: string;
  codContract: string;
  installDate: string;
  pickupDate: string;
  eventDate?: string;
  status?: string;
  customer?: { name: string };
}

export interface ContractRange<T extends CalendarContract = CalendarContract> {
  contract: T;
  start: Date;
  end: Date;
  event: Date | null;
  startLabel: string;
  endLabel: string;
  days: number | null;
  dateIssue: boolean;
  color: string;
  background: string;
  lane: number;
}

export interface ContractSegment<T extends CalendarContract = CalendarContract> {
  range: ContractRange<T>;
  column: number;
  span: number;
  before: boolean;
  after: boolean;
  label: string;
}

export interface RangeWeek<T extends CalendarContract = CalendarContract> {
  key: string;
  continuation: boolean;
  days: { date: Date; key: string; inMonth: boolean; occupied: boolean }[];
  segments: ContractSegment<T>[];
  laneCount: number;
}

const COLORS = [
  ['#6e2c7f', '#f4eaf8'], ['#286c77', '#e8f4f5'], ['#946529', '#fcf3e5'],
  ['#426646', '#edf5ee'], ['#8c405a', '#f9edf2'], ['#405e91', '#edf1fa'],
];

/** Preserve stored calendar dates instead of shifting ISO midnight to the browser timezone. */
export function calendarDate(value?: string): Date | null {
  const key = value?.slice(0, 10);
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const date = parseISO(key);
  return isValid(date) && format(date, 'yyyy-MM-dd') === key ? date : null;
}

export function buildCalendarRanges<T extends CalendarContract>(contracts: T[], selectedDate: Date): {
  ranges: ContractRange<T>[]; weeks: RangeWeek<T>[]; unplaced: number;
} {
  let unplaced = 0;
  const seen = new Set<string>();
  const all: ContractRange<T>[] = [];
  for (const contract of contracts) {
    if (contract.status === 'Anulado' || seen.has(contract._id)) continue;
    seen.add(contract._id);
    const start = calendarDate(contract.installDate);
    if (!start) { unplaced++; continue; }
    const pickup = calendarDate(contract.pickupDate);
    const dateIssue = !pickup || pickup < start;
    const end = dateIssue ? start : pickup!;
    const hash = Array.from(contract._id).reduce((value, char) => (Math.imul(value, 31) + char.charCodeAt(0)) | 0, 0) >>> 0;
    const [color, background] = COLORS[hash % COLORS.length];
    all.push({ contract, start, end, event: calendarDate(contract.eventDate), dateIssue,
      startLabel: format(start, 'd MMM yyyy', { locale: es }), endLabel: format(end, 'd MMM yyyy', { locale: es }),
      days: dateIssue ? null : differenceInCalendarDays(end, start) + 1, color, background, lane: 0 });
  }
  all.sort((a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime() || a.contract._id.localeCompare(b.contract._id));
  const laneEnds: Date[] = [];
  for (const range of all) {
    let lane = laneEnds.findIndex(end => end < range.start);
    if (lane < 0) lane = laneEnds.length;
    range.lane = lane;
    laneEnds[lane] = range.end;
  }
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const ranges = all.filter(range => range.start <= monthEnd && range.end >= monthStart);
  // Compact lanes unused in the month; keep each visible contract on one row across weeks.
  const lanes = [...new Set(ranges.map(range => range.lane))].sort((a, b) => a - b);
  const compactLanes = new Map(lanes.map((lane, index) => [lane, index]));
  ranges.forEach(range => range.lane = compactLanes.get(range.lane)!);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  let gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  // Show one extra week for spillovers; longer bookings retain a continuation arrow.
  if (ranges.some(range => range.end > gridEnd)) gridEnd = addDays(gridEnd, 7);
  const weeks: RangeWeek<T>[] = [];
  for (let start = gridStart; start <= gridEnd; start = addDays(start, 7)) {
    const end = addDays(start, 6);
    const segments = ranges.filter(range => range.start <= end && range.end >= start).map(range => {
      const first = range.start > start ? range.start : start;
      const last = range.end < end ? range.end : end;
      const before = range.start < start;
      const after = range.end > end;
      return { range, column: differenceInCalendarDays(first, start) + 1, span: differenceInCalendarDays(last, first) + 1,
        before, after, label: range.dateIssue ? 'Recojo por revisar' : `${after ? 'continúa hasta' : 'recojo'} ${range.endLabel}` };
    });
    weeks.push({ key: format(start, 'yyyy-MM-dd'), continuation: start > monthEnd,
      days: Array.from({ length: 7 }, (_, index) => {
        const date = addDays(start, index);
        return { date, key: format(date, 'yyyy-MM-dd'), inMonth: date >= monthStart && date <= monthEnd,
          occupied: ranges.some(range => range.start <= date && range.end >= date) };
      }), segments, laneCount: Math.max(0, ...segments.map(segment => segment.range.lane + 1)) });
  }
  return { ranges, weeks, unplaced };
}
