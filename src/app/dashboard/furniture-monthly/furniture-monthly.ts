import { FurnitureRank, RentalContract, rankFurniture } from '../furniture-ranking/furniture-ranking';

export interface MonthlyFurniture {
  month: number;
  name: string;
  rows: FurnitureRank[];
}

export const RENTAL_MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** Each closed month has its own top ten; this is not an annual cumulative ranking. */
export function monthlyFurniture(contracts: RentalContract[], year: number, closedMonths: number): MonthlyFurniture[] {
  return RENTAL_MONTHS.slice(0, Math.max(0, Math.min(12, closedMonths))).map((name, index) => ({
    month: index + 1,
    name,
    rows: rankFurniture(contracts, year, index + 1),
  }));
}
