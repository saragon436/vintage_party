export interface RentalAccessory {
  id: string;
  description: string;
  amount: number | string;
  color?: string | null;
  design?: string | null;
  high?: string | number | null;
  width?: string | number | null;
  large?: string | number | null;
  diameter?: string | number | null;
  bottom?: string | number | null;
}

export interface RentalContract {
  _id?: string;
  status: string;
  eventDate: string;
  listAccessories?: RentalAccessory[];
}

export interface FurnitureRank {
  id: string;
  description: string;
  current: number;
  previousYear: number;
  previousMonth: number;
}

export function furnitureDescription(item: RentalAccessory): string {
  const value = (raw: string | number | null | undefined): string => {
    const text = String(raw ?? '').trim();
    return !text || text === '.' || Number(text) === 0 ? '' : text;
  };
  const name = [item.description?.trim() || 'Mobiliario sin nombre', value(item.color), value(item.design)]
    .filter(Boolean).join(' ');
  const measurements: [string, string | number | null | undefined][] = [
    ['Alto', item.high], ['Ancho', item.width], ['Largo', item.large],
    ['Diámetro', item.diameter], ['Fondo', item.bottom],
  ];
  const dimensions = measurements.filter(([, raw]) => value(raw))
    .map(([label, raw]) => `${label}: ${value(raw)}`).join(' · ');
  return dimensions ? `${name} (${dimensions})` : name;
}

/** Date-only and ISO dates are grouped by their stored calendar date, without local timezone shifts. */
export function rankFurniture(contracts: RentalContract[], year: number, month: number): FurnitureRank[] {
  const currentKey = `${year}-${String(month).padStart(2, '0')}`;
  const yearKey = `${year - 1}-${String(month).padStart(2, '0')}`;
  const monthKey = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
  const totals = new Map<string, FurnitureRank>();
  const seen = new Set<string>();

  for (const contract of contracts) {
    if (contract.status === 'Anulado') continue;
    if (contract._id && seen.has(contract._id)) continue;
    if (contract._id) seen.add(contract._id);
    const date = contract.eventDate?.slice(0, 10);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) continue;
    const key = date.slice(0, 7);
    const period = key === currentKey ? 'current' : key === yearKey ? 'previousYear' : key === monthKey ? 'previousMonth' : null;
    if (!period) continue;
    for (const item of contract.listAccessories || []) {
      const amount = Number(item.amount);
      if (!item.id || !Number.isFinite(amount) || amount <= 0) continue;
      let total = totals.get(item.id);
      if (!total) {
        total = { id: item.id, description: furnitureDescription(item), current: 0, previousYear: 0, previousMonth: 0 };
        totals.set(item.id, total);
      }
      total[period] += amount;
      if (period === 'current' && item.description) total.description = furnitureDescription(item);
    }
  }

  return [...totals.values()].filter(row => row.current > 0)
    .sort((a, b) => b.current - a.current || a.description.localeCompare(b.description, 'es') || a.id.localeCompare(b.id))
    .slice(0, 10);
}

export function rentalVariation(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous * 100 : null;
}
