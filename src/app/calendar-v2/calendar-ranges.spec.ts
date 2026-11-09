import { buildCalendarRanges, calendarDate, CalendarContract } from './calendar-ranges';

const rental = (id: string, start: string, end: string, status = 'Por Pagar'): CalendarContract => ({
  _id: id, codContract: `CON-${id}`, installDate: start, pickupDate: end, status, customer: { name: id },
});

describe('Franjas de contratos del calendario', () => {
  const october = new Date(2026, 9, 1);

  it('representa los tres días incluyendo instalación y recojo', () => {
    const layout = buildCalendarRanges([rental('a', '2026-10-27', '2026-10-29')], october);
    expect(layout.ranges[0].days).toBe(3);
    const segment = layout.weeks.flatMap(week => week.segments)[0];
    expect(segment.column).toBe(3);
    expect(segment.span).toBe(3);
    expect(segment.before).toBeFalse();
    expect(segment.after).toBeFalse();
  });

  it('separa contratos que se cruzan, incluso si comparten solo el día de recojo', () => {
    const { ranges } = buildCalendarRanges([
      rental('a', '2026-10-27', '2026-10-29'), rental('b', '2026-10-29', '2026-10-31'),
      rental('c', '2026-10-30', '2026-10-30'),
    ], october);
    expect(ranges[0].lane).not.toBe(ranges[1].lane);
    expect(ranges[1].lane).not.toBe(ranges[2].lane);
    expect(ranges[0].lane).toBe(ranges[2].lane);
  });

  it('divide por semanas, conserva la fila y añade la primera semana de noviembre', () => {
    const { weeks } = buildCalendarRanges([rental('b', '2026-10-28', '2026-11-02')], october);
    const segments = weeks.flatMap(week => week.segments);
    expect(weeks.every(week => week.days.length === 7)).toBeTrue();
    expect(weeks.length).toBe(6);
    expect(segments.length).toBe(2);
    expect(segments[0].after).toBeTrue();
    expect(segments[1].before).toBeTrue();
    expect(segments[0].span).toBe(4);
    expect(segments[1].span).toBe(2);
    expect(segments[0].range.lane).toBe(segments[1].range.lane);
    expect(weeks[5].continuation).toBeTrue();
  });

  it('incluye contratos que empezaron antes del mes y conserva color al navegar', () => {
    const contracts = [rental('b', '2026-10-28', '2026-11-02')];
    const oct = buildCalendarRanges(contracts, october);
    const nov = buildCalendarRanges(contracts, new Date(2026, 10, 1));
    expect(nov.ranges.length).toBe(1);
    expect(nov.ranges[0].days).toBe(6);
    expect(nov.ranges[0].color).toBe(oct.ranges[0].color);
    expect(nov.weeks[0].segments[0].before).toBeTrue();
  });

  it('maneja cambio de año, un día y febrero bisiesto', () => {
    const yearEnd = buildCalendarRanges([rental('a', '2026-12-31', '2027-01-02')], new Date(2027, 0, 1));
    expect(yearEnd.ranges[0].days).toBe(3);
    expect(buildCalendarRanges([rental('a', '2028-02-28', '2028-03-01')], new Date(2028, 1, 1)).ranges[0].days).toBe(3);
    const one = buildCalendarRanges([rental('a', '2026-10-30', '2026-10-30')], october);
    expect(one.ranges[0].days).toBe(1);
    expect(one.weeks.flatMap(week => week.segments)[0].span).toBe(1);
  });

  it('excluye solo anulados, omite duplicados y no modifica los datos recibidos', () => {
    const original = rental('a', '2026-10-01', '2026-10-03', 'Archivado');
    const contracts = [original, original, rental('b', '2026-10-01', '2026-10-03', 'Anulado'),
      rental('c', '2026-10-01', '2026-10-03', 'Pagado'), rental('d', '2026-10-01', '2026-10-03', 'En Almacen')];
    const snapshot = JSON.stringify(contracts);
    expect(buildCalendarRanges(contracts, october).ranges.length).toBe(3);
    expect(JSON.stringify(contracts)).toBe(snapshot);
  });

  it('señala fechas de recojo inválidas sin inventar duraciones y cuenta contratos sin instalación', () => {
    const layout = buildCalendarRanges([
      rental('a', '2026-10-20', ''), rental('b', '2026-10-20', '2026-10-19'),
      rental('c', '2026-02-30', '2026-10-22'),
    ], october);
    expect(layout.unplaced).toBe(1);
    expect(layout.ranges.every(range => range.dateIssue && range.days === null)).toBeTrue();
    expect(layout.weeks.flatMap(week => week.segments).every(segment => segment.span === 1)).toBeTrue();
  });

  it('conserva las fechas ISO sin desfase de zona horaria', () => {
    const date = calendarDate('2026-10-30T00:00:00.000Z')!;
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(9);
    expect(date.getDate()).toBe(30);
  });

  it('limita la continuación adicional para contratos largos y conserva las flechas', () => {
    const layout = buildCalendarRanges([rental('a', '2026-09-01', '2027-06-01')], october);
    expect(layout.weeks.length).toBe(6);
    expect(layout.weeks[0].segments[0].before).toBeTrue();
    expect(layout.weeks[5].segments[0].after).toBeTrue();
  });

  it('compacta filas históricas que ya no están ocupadas en el mes visible', () => {
    const contracts = Array.from({ length: 20 }, (_, i) => rental(String(i), '2026-09-01', '2026-09-30'));
    contracts.push(rental('z', '2026-09-02', '2026-10-02'));
    const layout = buildCalendarRanges(contracts, october);
    expect(layout.ranges.length).toBe(1);
    expect(layout.ranges[0].lane).toBe(0);
    expect(layout.weeks[0].laneCount).toBe(1);
  });
});
