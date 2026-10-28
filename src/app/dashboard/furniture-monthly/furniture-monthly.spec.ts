import { of, throwError } from 'rxjs';
import { ContractService } from '../../Servicios/contract.service';
import { AuthenticationToken } from '../../Servicios/autentication-token.service';
import { RentalContract } from '../furniture-ranking/furniture-ranking';
import { FurnitureMonthlyComponent } from './furniture-monthly.component';
import { monthlyFurniture } from './furniture-monthly';

function rental(id: string, month: number, amount: number, status = 'Pagado'): RentalContract {
  return { _id: `${id}-${month}-${status}`, eventDate: `2026-${String(month).padStart(2, '0')}-01T00:00:00.000Z`, status,
    listAccessories: [{ id, description: id, amount, color: 'Natural', high: '0.80' }] };
}

describe('Top 10 de mobiliarios mes a mes', () => {
  it('reordena cada mes por unidades, sin acumular las cantidades del mes anterior', () => {
    const months = monthlyFurniture([rental('A', 1, 100), rental('B', 1, 50), rental('A', 2, 20), rental('B', 2, 80)], 2026, 2);
    expect(months[0].rows.map(row => row.id)).toEqual(['A', 'B']);
    expect(months[1].rows.map(row => row.id)).toEqual(['B', 'A']);
    expect(months[1].rows[1].current).toBe(20);
  });

  it('permite salir y volver al top 10, conservando solo diez puestos cada mes', () => {
    const contracts = [rental('A', 1, 100), rental('A', 2, 1), rental('A', 3, 100)];
    for (let i = 0; i < 10; i++) contracts.push(rental(`B${i}`, 2, 10 + i));
    const months = monthlyFurniture(contracts, 2026, 3);
    expect(months[0].rows[0].id).toBe('A');
    expect(months[1].rows.length).toBe(10);
    expect(months[1].rows.some(row => row.id === 'A')).toBeFalse();
    expect(months[2].rows[0].id).toBe('A');
  });

  it('excluye únicamente Anulado y conserva meses sin alquileres y las medidas completas', () => {
    const months = monthlyFurniture([
      rental('A', 1, 10, 'Por Pagar'), rental('A', 1, 20, 'Archivado'),
      rental('A', 1, 30, 'Pagado'), rental('A', 1, 40, 'En Almacen'), rental('A', 1, 999, 'Anulado'),
    ], 2026, 2);
    expect(months[0].rows[0].current).toBe(100);
    expect(months[0].rows[0].description).toBe('A Natural (Alto: 0.80)');
    expect(months[1].rows).toEqual([]);
  });

  it('respeta los meses cerrados, el año y no duplica contratos', () => {
    const first = rental('A', 1, 10);
    const months = monthlyFurniture([first, first, rental('B', 3, 100),
      { ...rental('C', 1, 100), eventDate: '2025-01-01' }], 2026, 2);
    expect(months.length).toBe(2);
    expect(months[0].rows[0].current).toBe(10);
    expect(months[1].rows).toEqual([]);
    expect(monthlyFurniture([first], 2026, 0)).toEqual([]);
  });
});

describe('Selección del ranking mensual', () => {
  let api: jasmine.SpyObj<ContractService>;
  let component: FurnitureMonthlyComponent;

  beforeEach(() => {
    spyOn(Date.prototype, 'getFullYear').and.returnValue(2026);
    spyOn(Date.prototype, 'getMonth').and.returnValue(3);
    api = jasmine.createSpyObj('ContractService', ['getContractsByYear']);
    component = new FurnitureMonthlyComponent(api, { myValue: 'test' } as AuthenticationToken);
  });

  afterEach(() => { component.ngOnDestroy(); });

  it('selecciona el líder del último mes con datos y describe bajas, salidas y reingresos', () => {
    const contracts = [rental('A', 1, 100), rental('A', 2, 20), rental('B', 2, 80), rental('B', 3, 50)];
    api.getContractsByYear.and.callFake(year => of(year === 2026 ? contracts : []));
    component.ngOnInit();
    expect(component.selectedId).toBe('B');
    expect(component.selectedMonth).toBe(2);
    component.select(component.months[1].rows[1], 1);
    expect(component.movement).toBe('↓ Baja 1 puesto');
    component.selectedMonth = 2;
    expect(component.movement).toBe('Fuera del top 10');
    component.select(component.months[1].rows[0], 1);
    expect(component.movement).toBe('Entra al top 10');
    expect(component.isEntry(component.months[1].rows[0], 1)).toBeTrue();
    expect(component.selectedDescription).toContain('Alto: 0.80');
  });

  it('muestra un error si falla una consulta y permite reintentar sin confundirlo con cero alquileres', () => {
    api.getContractsByYear.and.returnValue(throwError(() => new Error('unavailable')));
    component.ngOnInit();
    expect(component.error).toBeTrue();
    expect(component.loading).toBeFalse();
    api.getContractsByYear.and.returnValue(of([]));
    component.load();
    expect(component.error).toBeFalse();
    expect(component.hasRows).toBeFalse();
  });
});
