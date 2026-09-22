import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';

import { DistrictHeatmapComponent } from './district-heatmap.component';
import { ContractService, DistrictSummary } from '../../Servicios/contract.service';
import { AuthenticationToken } from '../../Servicios/autentication-token.service';

describe('DistrictHeatmapComponent', () => {
  let component: DistrictHeatmapComponent;
  let fixture: ComponentFixture<DistrictHeatmapComponent>;
  let contractServiceSpy: jasmine.SpyObj<ContractService>;

  const summary: DistrictSummary[] = [
    { district: 'Santiago de Surco', count: 100 },
    { district: 'San Borja', count: 25 },
    { district: 'Ate', count: 1 },
  ];

  beforeEach(async () => {
    contractServiceSpy = jasmine.createSpyObj('ContractService', [
      'getDistrictSummary',
      'getContractsByDistrict',
    ]);
    contractServiceSpy.getDistrictSummary.and.returnValue(of(summary));
    contractServiceSpy.getContractsByDistrict.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [DistrictHeatmapComponent],
      providers: [
        { provide: ContractService, useValue: contractServiceSpy },
        { provide: AuthenticationToken, useValue: { myValue: 'test-token' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DistrictHeatmapComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('loading the summary', () => {
    it('starts in a loading state and clears it once the summary resolves', () => {
      expect(component.isLoading).toBeTrue();

      fixture.detectChanges(); // triggers ngOnInit -> loadSummary()

      expect(component.isLoading).toBeFalse();
      expect(component.loadError).toBeFalse();
    });

    it('requests the last 30 days by default', () => {
      fixture.detectChanges();

      const [headers, from, to] = contractServiceSpy.getDistrictSummary.calls.mostRecent().args;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
      const daysDiff = (new Date(to as string).getTime() - new Date(from as string).getTime()) / 86400000;
      expect(Math.round(daysDiff)).toBe(30);
    });

    it('shows an error state when the summary request fails', () => {
      contractServiceSpy.getDistrictSummary.and.returnValue(throwError(() => new Error('boom')));

      fixture.detectChanges();

      expect(component.isLoading).toBeFalse();
      expect(component.loadError).toBeTrue();
    });

    it('handles an empty summary (no contracts with a district in range) without crashing', () => {
      contractServiceSpy.getDistrictSummary.and.returnValue(of([]));

      fixture.detectChanges();

      expect(component.totalContracts).toBe(0);
      expect(component.activeDistricts).toBe(0);
      expect(component.topDistrict).toBeNull();
      expect(component.topDistrictPct).toBe(0);
      expect(component.ranked).toEqual([]);
      expect(component.maxCount).toBe(0);
    });
  });

  describe('KPIs and ranking derived from the summary', () => {
    beforeEach(() => fixture.detectChanges());

    it('computes total, top district and active district count', () => {
      expect(component.totalContracts).toBe(126);
      expect(component.activeDistricts).toBe(3);
      expect(component.topDistrict).toBe('Santiago de Surco');
      expect(component.topDistrictPct).toBe(79); // Math.round(100/126*100)
      expect(component.maxCount).toBe(100);
    });

    it('ranks districts by count, descending, with percentages that add up to ~100', () => {
      expect(component.ranked.map((r) => r.name)).toEqual(['Santiago de Surco', 'San Borja', 'Ate']);
      const totalPct = component.ranked.reduce((sum, r) => sum + r.pct, 0);
      expect(totalPct).toBeCloseTo(100, 0);
    });

    it('countFor returns 0 for a district absent from the summary', () => {
      expect(component.countFor('Pucusana')).toBe(0);
      expect(component.countFor('Santiago de Surco')).toBe(100);
    });
  });

  describe('choropleth color bucketing', () => {
    beforeEach(() => fixture.detectChanges());

    it('marks a district with zero contracts as empty, with no fill', () => {
      expect(component.isEmpty('Pucusana')).toBeTrue();
      expect(component.fillFor('Pucusana')).toBe('');
    });

    it('assigns the top (max) bucket to the leading district', () => {
      expect(component.isEmpty('Santiago de Surco')).toBeFalse();
      expect(component.fillFor('Santiago de Surco')).toBe('var(--dh-seq-8)');
    });

    it('uses a sqrt scale so a small count is not squashed into the empty bucket', () => {
      // San Borja = 25 of a max of 100 -> sqrt(0.25) = 0.5 -> bucket 4 (0-indexed) -> seq-5
      expect(component.fillFor('San Borja')).toBe('var(--dh-seq-5)');
    });

    it('still renders a low-but-nonzero count as a visibly distinct (non-empty) bucket', () => {
      // Ate = 1 of 100 -> not empty, but the lightest non-empty step
      expect(component.isEmpty('Ate')).toBeFalse();
      expect(component.fillFor('Ate')).toBe('var(--dh-seq-2)');
    });
  });

  describe('setRange', () => {
    beforeEach(() => fixture.detectChanges());

    it('reloads the summary with the new range', () => {
      contractServiceSpy.getDistrictSummary.calls.reset();

      component.setRange(90);

      expect(component.rangeDays).toBe(90);
      expect(contractServiceSpy.getDistrictSummary).toHaveBeenCalledTimes(1);
      const [, from, to] = contractServiceSpy.getDistrictSummary.calls.mostRecent().args;
      const daysDiff = (new Date(to as string).getTime() - new Date(from as string).getTime()) / 86400000;
      expect(Math.round(daysDiff)).toBe(90);
    });

    it('is a no-op when the range is already selected (avoids a redundant request)', () => {
      contractServiceSpy.getDistrictSummary.calls.reset();

      component.setRange(30);

      expect(contractServiceSpy.getDistrictSummary).not.toHaveBeenCalled();
    });

    it('clears any active district selection when the range changes', () => {
      component.selectDistrict('San Borja');
      expect(component.selectedDistrict).toBe('San Borja');

      component.setRange(365);

      expect(component.selectedDistrict).toBeNull();
      expect(component.selectedRows).toEqual([]);
    });
  });

  describe('selecting a district (click-to-filter for seguimiento)', () => {
    beforeEach(() => fixture.detectChanges());

    it('fetches and exposes the contracts for the clicked district', () => {
      const rows = [
        {
          _id: 'ct1',
          codContract: '2026-0000000042',
          customer: { name: 'Juan Perez' },
          eventDate: '2026-09-20T00:00:00.000Z',
          installDate: '2026-09-19T00:00:00.000Z',
          status: 'Por Pagar',
        },
      ];
      contractServiceSpy.getContractsByDistrict.and.returnValue(of(rows));

      component.selectDistrict('San Borja');

      expect(component.selectedDistrict).toBe('San Borja');
      expect(component.selectedLoading).toBeFalse();
      expect(component.selectedRows).toEqual([
        {
          id: 'ct1',
          codContract: '2026-0000000042',
          customerName: 'Juan Perez',
          eventDate: '2026-09-20T00:00:00.000Z',
          installDate: '2026-09-19T00:00:00.000Z',
          status: 'Por Pagar',
        },
      ]);
      expect(contractServiceSpy.getContractsByDistrict).toHaveBeenCalledWith(
        'San Borja',
        jasmine.anything(),
        jasmine.any(String),
        jasmine.any(String)
      );
    });

    it('falls back to a placeholder customer name when the customer is missing', () => {
      contractServiceSpy.getContractsByDistrict.and.returnValue(
        of([{ _id: 'ct1', codContract: 'C-1', customer: null, status: 'Pagado' }])
      );

      component.selectDistrict('Ate');

      expect(component.selectedRows[0].customerName).toBe('—');
    });

    it('clicking the same district again clears the selection (toggle off)', () => {
      component.selectDistrict('San Borja');
      contractServiceSpy.getContractsByDistrict.calls.reset();

      component.selectDistrict('San Borja');

      expect(component.selectedDistrict).toBeNull();
      expect(component.selectedRows).toEqual([]);
      expect(contractServiceSpy.getContractsByDistrict).not.toHaveBeenCalled();
    });

    it('clicking a different district switches the filter without needing to clear first', () => {
      component.selectDistrict('San Borja');
      component.selectDistrict('Ate');

      expect(component.selectedDistrict).toBe('Ate');
      expect(contractServiceSpy.getContractsByDistrict).toHaveBeenCalledTimes(2);
    });

    it('selecting a district with zero contracts in the summary still queries and yields an empty list', () => {
      contractServiceSpy.getContractsByDistrict.and.returnValue(of([]));

      component.selectDistrict('Pucusana');

      expect(component.selectedDistrict).toBe('Pucusana');
      expect(component.selectedRows).toEqual([]);
      expect(component.selectedError).toBeFalse();
    });

    it('shows an error state when the per-district request fails, without clearing the selection', () => {
      contractServiceSpy.getContractsByDistrict.and.returnValue(throwError(() => new Error('boom')));

      component.selectDistrict('San Borja');

      expect(component.selectedDistrict).toBe('San Borja');
      expect(component.selectedError).toBeTrue();
      expect(component.selectedLoading).toBeFalse();
      expect(component.selectedRows).toEqual([]);
    });

    it('clearSelection resets district, rows and error state', () => {
      contractServiceSpy.getContractsByDistrict.and.returnValue(throwError(() => new Error('boom')));
      component.selectDistrict('San Borja');

      component.clearSelection();

      expect(component.selectedDistrict).toBeNull();
      expect(component.selectedRows).toEqual([]);
      expect(component.selectedError).toBeFalse();
    });

    it('isSelected reflects only the currently selected district', () => {
      component.selectDistrict('San Borja');

      expect(component.isSelected('San Borja')).toBeTrue();
      expect(component.isSelected('Ate')).toBeFalse();
    });

    it('ignores a stale response that resolves after the user already switched districts (race condition)', () => {
      const sanBorja$ = new Subject<any[]>();
      const ate$ = new Subject<any[]>();
      contractServiceSpy.getContractsByDistrict.and.returnValues(sanBorja$ as any, ate$ as any);

      component.selectDistrict('San Borja'); // slow request, still pending
      component.selectDistrict('Ate'); // user changes their mind before it resolves

      // Ate's request resolves first...
      ate$.next([{ _id: 'ate-1', codContract: 'C-ATE', customer: { name: 'Ana' }, status: 'Pagado' }]);
      // ...then the stale San Borja response arrives late and must NOT overwrite the view.
      sanBorja$.next([{ _id: 'sb-1', codContract: 'C-SB', customer: { name: 'Luis' }, status: 'Pagado' }]);

      expect(component.selectedDistrict).toBe('Ate');
      expect(component.selectedRows.length).toBe(1);
      expect(component.selectedRows[0].codContract).toBe('C-ATE');
    });

    it('a stale error response does not flip the current selection into an error state', () => {
      const sanBorja$ = new Subject<any[]>();
      const ate$ = new Subject<any[]>();
      contractServiceSpy.getContractsByDistrict.and.returnValues(sanBorja$ as any, ate$ as any);

      component.selectDistrict('San Borja');
      component.selectDistrict('Ate');

      ate$.next([]);
      sanBorja$.error(new Error('boom')); // late failure for the abandoned request

      expect(component.selectedDistrict).toBe('Ate');
      expect(component.selectedError).toBeFalse();
    });

    it('flags the list as truncated when the backend cap (500) returns fewer rows than the summary count', () => {
      contractServiceSpy.getDistrictSummary.and.returnValue(
        of([{ district: 'Santiago de Surco', count: 600 }])
      );
      component.loadSummary(); // ngOnInit already ran; reload explicitly with the new summary
      const rows = Array.from({ length: 500 }, (_, i) => ({ _id: `c${i}`, codContract: `C-${i}`, customer: { name: 'X' }, status: 'Pagado' }));
      contractServiceSpy.getContractsByDistrict.and.returnValue(of(rows));

      component.selectDistrict('Santiago de Surco');

      expect(component.selectedRows.length).toBe(500);
      expect(component.selectedTruncated).toBeTrue();
    });

    it('does not flag truncation when every contract for the district was returned', () => {
      // summary count for 'Ate' is 1; return exactly one row to match it.
      contractServiceSpy.getContractsByDistrict.and.returnValue(
        of([{ _id: 'c1', codContract: 'C-1', customer: { name: 'X' }, status: 'Pagado' }])
      );

      component.selectDistrict('Ate');

      expect(component.selectedTruncated).toBeFalse();
    });
  });

  describe('hover tooltip', () => {
    beforeEach(() => fixture.detectChanges());

    it('showTip reads the hovered element position and the district count', () => {
      const fakeEvent = {
        target: {
          getBoundingClientRect: () => ({ left: 10, width: 20, top: 30 }),
        },
      } as unknown as Event;

      component.showTip(component.features[0], fakeEvent);

      expect(component.hoverTip).toEqual(
        jasmine.objectContaining({ name: component.features[0].name, x: 20, y: 30 })
      );
    });

    it('hideTip clears the tooltip', () => {
      component.hoverTip = { name: 'Ate', count: 1, x: 0, y: 0 };
      component.hideTip();
      expect(component.hoverTip).toBeNull();
    });
  });

  describe('statusClass', () => {
    beforeEach(() => fixture.detectChanges());

    it('maps every known StatusContract value to its chip class', () => {
      expect(component.statusClass('Pagado')).toBe('good');
      expect(component.statusClass('En Almacen')).toBe('active');
      expect(component.statusClass('Por Pagar')).toBe('warn');
      expect(component.statusClass('Archivado')).toBe('neutral');
      expect(component.statusClass('Anulado')).toBe('bad');
    });

    it('falls back to neutral for an unrecognized status', () => {
      expect(component.statusClass('Algo Nuevo')).toBe('neutral');
    });
  });

  describe('geo data integrity', () => {
    it('loads all 50 raw polygons (43 Lima districts + 7 Callao-province sub-districts)', () => {
      expect(component.features.length).toBe(50);
    });

    it('collapses the 7 Callao-province polygons onto the single "Callao" name used by the contract form', () => {
      const names = component.features.map((f) => f.name);
      const uniqueNames = new Set(names);

      // 43 Lima districts + 1 "Callao" label shared by every Callao-province polygon
      expect(uniqueNames.size).toBe(44);
      expect(names.filter((n) => n === 'Callao').length).toBe(7);
    });

    it('every feature has a non-empty SVG path', () => {
      expect(component.features.every((f) => typeof f.d === 'string' && f.d.startsWith('M'))).toBeTrue();
    });
  });
});
