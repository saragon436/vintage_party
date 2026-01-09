// Lo que ya tienes del backend
export interface AccessorySummaryDto {
  description: string;
  amount: number;
  accessoryId: string;
  contractId: string;
  codContract: string;
  customerName: string;
  address: string;
  district: string;
  warehouse?: number; // 👈 IMPORTANTE: aunque sea opcional, debe existir
}

export interface DaySummaryDto {
  date: string;        // "2025-11-20"
  dayName: string;     // "miércoles"
  items: AccessorySummaryDto[];
}

export interface WeekSummaryDto {
  weekNumber: number;
  from: string;
  to: string;
  days: DaySummaryDto[];
}

// 👇 NUEVO: vista agregada por día
export interface AggregatedAccessoryView {
  description: string;
  totalAmount: number;
  warehouse: number; // 👈 nuevo
}

// 👇 NUEVO DayView (ya sin contratos)
export interface DayView {
  date: string;                      // "miércoles 20/11"
  accessories: AggregatedAccessoryView[];
}

