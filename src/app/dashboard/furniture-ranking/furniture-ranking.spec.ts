import { RentalContract, furnitureDescription, rankFurniture, rentalVariation } from './furniture-ranking';

describe('Ranking de mobiliarios', () => {
  const contract = (status: string, date: string, amount: number | string, id = 'chair'): RentalContract => ({
    status, eventDate: date, listAccessories: [{ id, description: id, amount }],
  });

  it('suma todos los estados excepto Anulado', () => {
    const contracts = ['Por Pagar', 'Archivado', 'Anulado', 'Pagado', 'En Almacen', 'Otro']
      .map(status => contract(status, '2026-09-10', 10));
    expect(rankFurniture(contracts, 2026, 9)[0].current).toBe(50);
  });

  it('muestra color, diseño y todas las medidas guardadas en el contrato', () => {
    const item = { id: 'table', description: 'Mesa', amount: 1, color: 'Natural', design: 'Rústico',
      high: '0.80', width: 80, large: '1.80', diameter: '1.20', bottom: '0.60' };
    const expected = 'Mesa Natural Rústico (Alto: 0.80 · Ancho: 80 · Largo: 1.80 · Diámetro: 1.20 · Fondo: 0.60)';
    expect(furnitureDescription(item)).toBe(expected);
    const rows = rankFurniture([{ status: 'Pagado', eventDate: '2026-09-01', listAccessories: [item] }], 2026, 9);
    expect(rows[0].description).toBe(expected);
  });

  it('omite características vacías, marcadores y medidas en cero', () => {
    expect(furnitureDescription({ id: 'chair', description: ' Silla ', amount: 1, color: ' ', design: '.',
      high: 0, width: '0', large: '0.00', diameter: null, bottom: '' })).toBe('Silla');
  });

  it('compara los mismos mobiliarios y aplica el filtro de estados en los tres períodos', () => {
    const rows = rankFurniture([
      contract('Por Pagar', '2026-09-01', 30),
      contract('Archivado', '2025-09-30', 10),
      contract('Archivado', '2026-08-31', 20),
      contract('Anulado', '2025-09-01', 500),
      contract('Pagado', '2026-08-01', 500),
      contract('Archivado', '2025-09-01', 1000, 'historical-only'),
    ], 2026, 9);
    expect(rows.length).toBe(1);
    expect(rows[0]).toEqual({ id: 'chair', description: 'chair', current: 30, previousYear: 10, previousMonth: 520 });
  });

  it('compara enero contra diciembre del año anterior sin desplazar fechas ISO a otro mes', () => {
    const rows = rankFurniture([
      contract('Por Pagar', '2026-01-01T00:00:00.000Z', 12),
      contract('Archivado', '2025-12-31T00:00:00.000Z', 8),
      contract('Archivado', '2025-01-01', 6),
    ], 2026, 1);
    expect(rows[0].current).toBe(12);
    expect(rows[0].previousMonth).toBe(8);
    expect(rows[0].previousYear).toBe(6);
  });

  it('limita a diez y ordena por unidades, conservando identificadores distintos con el mismo nombre', () => {
    const contracts = Array.from({ length: 12 }, (_, i) => contract('Por Pagar', '2026-09-10', i + 1, `item-${i}`));
    contracts.forEach(c => c.listAccessories![0].description = 'Silla');
    const rows = rankFurniture(contracts, 2026, 9);
    expect(rows.length).toBe(10);
    expect(rows[0].current).toBe(12);
    expect(rows[9].current).toBe(3);
  });

  it('evita duplicar un contrato recibido en más de una consulta', () => {
    const same = { ...contract('Por Pagar', '2026-09-01', 20), _id: 'contract-1' };
    expect(rankFurniture([same, same], 2026, 9)[0].current).toBe(20);
  });

  it('acepta cantidades numéricas en texto e ignora datos inválidos o sin detalle', () => {
    const rows = rankFurniture([
      contract('Por Pagar', '2026-09-01', '5'),
      contract('Por Pagar', '2026-09-01', 'incorrecto'),
      contract('Por Pagar', '2026-09-01', -20),
      contract('Por Pagar', 'invalid', 100),
      { status: 'Archivado', eventDate: '2026-09-01' },
    ], 2026, 9);
    expect(rows[0].current).toBe(5);
    expect(rankFurniture([], 2026, 9)).toEqual([]);
  });

  it('calcula variaciones sin inventar porcentajes cuando la base es cero', () => {
    expect(rentalVariation(30, 20)).toBe(50);
    expect(rentalVariation(10, 20)).toBe(-50);
    expect(rentalVariation(20, 20)).toBe(0);
    expect(rentalVariation(20, 0)).toBeNull();
  });
});
