import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of, Subject } from 'rxjs';

import { CalendarV2Component } from './calendar-v2.component';
import { AuthenticationToken } from '../Servicios/autentication-token.service';
import { ContractService } from '../Servicios/contract.service';
import { ContractComponent } from '../contract/contract.component';

describe('CalendarV2Component', () => {
  let component: CalendarV2Component;
  let fixture: ComponentFixture<CalendarV2Component>;
  let api: jasmine.SpyObj<ContractService>;
  let modal: jasmine.SpyObj<NgbModal>;
  let frame: FrameRequestCallback | undefined;
  let closed: Subject<void>;
  let dismissed: Subject<void>;
  let modalInstance: { initialContract?: unknown };

  beforeEach(async () => {
    api = jasmine.createSpyObj('ContractService', ['listContract']);
    api.listContract.and.returnValue(of([]));
    modal = jasmine.createSpyObj('NgbModal', ['open']);
    closed = new Subject<void>();
    dismissed = new Subject<void>();
    modalInstance = {};
    modal.open.and.returnValue({ componentInstance: modalInstance, closed, dismissed } as any);
    frame = undefined;
    spyOn(window, 'requestAnimationFrame').and.callFake(callback => { frame = callback; return 1; });
    spyOn(window, 'cancelAnimationFrame');
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterTestingModule],
      declarations: [ CalendarV2Component ],
      providers: [AuthenticationToken, { provide: ContractService, useValue: api }, { provide: NgbModal, useValue: modal }],
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('resalta y enfoca hoy después de cargar, incluso sin contratos', () => {
    const today: HTMLElement = fixture.nativeElement.querySelector('.week-background .today');
    expect(today.getAttribute('aria-current')).toBe('date');
    expect(fixture.nativeElement.querySelector('.today-badge').textContent).toContain('HOY');
    expect(today.textContent).toContain('Sin contratos programados');
    const scroll = spyOn(today, 'scrollIntoView');
    const focus = spyOn(today, 'focus');
    frame!(0);
    expect(scroll).toHaveBeenCalled();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('permite navegar por meses y volver a hoy', () => {
    component.previousMonth();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    component.goToToday();
    fixture.detectChanges();
    expect(component.selectedDate.getFullYear()).toBe(new Date().getFullYear());
    expect(component.selectedDate.getMonth()).toBe(new Date().getMonth());
    expect(fixture.nativeElement.querySelector('.week-background .today')).toBeTruthy();
  });

  it('abre el mismo ContractComponent y opciones de Programación al pulsar el código', () => {
    const today = component.today;
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const contract = { _id: 'contract-1', codContract: 'CON-001', installDate: date, pickupDate: date, customer: { name: 'Cliente' } };
    component.contract = [contract as any];
    component.updateCalendar();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.code-link').click();
    expect(modal.open).toHaveBeenCalledWith(ContractComponent, { size: 'xl', scrollable: true, centered: true });
    expect(modalInstance.initialContract).toBe(contract);
    const before = api.listContract.calls.count();
    closed.next();
    dismissed.next();
    expect(api.listContract.calls.count()).toBe(before + 1);
  });

  it('recarga al descartar el modal y no vuelve a posicionar el calendario', () => {
    component.contract = [{ _id: 'contract-1' } as any];
    frame!(0);
    (window.requestAnimationFrame as jasmine.Spy).calls.reset();
    component.openContractModal('contract-1');
    dismissed.next();
    fixture.detectChanges();
    expect(api.listContract.calls.count()).toBe(2);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('espera a que los contratos lleguen antes de posicionar hoy', () => {
    fixture.destroy();
    (window.requestAnimationFrame as jasmine.Spy).calls.reset();
    const response = new Subject<any[]>();
    api.listContract.and.returnValue(response);
    fixture = TestBed.createComponent(CalendarV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    response.next([]);
    fixture.detectChanges();
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('no abre contratos inexistentes', () => {
    component.openContractModal('missing');
    expect(modal.open).not.toHaveBeenCalled();
  });

  it('resalta un contrato en todas sus franjas sin abrir el formulario', () => {
    component.selectedDate = new Date(2026, 9, 1);
    component.contract = [
      { _id: 'a', codContract: 'CON-A', installDate: '2026-10-27', pickupDate: '2026-10-29' },
      { _id: 'b', codContract: 'CON-B', installDate: '2026-10-28', pickupDate: '2026-11-02' },
    ];
    component.updateCalendar();
    fixture.detectChanges();
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-select'));
    buttons.find(button => button.getAttribute('aria-label')?.includes('CON-B'))!.click();
    fixture.detectChanges();
    expect(component.selectedId).toBe('b');
    expect(fixture.nativeElement.querySelectorAll('.contract-ribbon.selected').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.range-detail').textContent).toContain('02/11/2026');
    expect(modal.open).not.toHaveBeenCalled();
    component.nextMonth();
    expect(component.selectedId).toBe('b');
    expect(component.selectedRange?.days).toBe(6);
  });
});
