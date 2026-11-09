import { HttpHeaders } from '@angular/common/http';
import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { addMonths, isSameDay } from 'date-fns';
import { merge, Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { AuthenticationToken } from '../Servicios/autentication-token.service';
import { ContractService } from '../Servicios/contract.service';
import { ContractComponent } from '../contract/contract.component';
import { buildCalendarRanges, CalendarContract, ContractRange, RangeWeek } from './calendar-ranges';

@Component({
  selector: 'app-calendar-v2',
  templateUrl: './calendar-v2.component.html',
  styleUrls: ['./calendar-v2.component.css'],
})
export class CalendarV2Component implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('table') table?: ElementRef<HTMLElement>;
  today = new Date();
  selectedDate = new Date();
  contract: CalendarContract[] = [];
  weeks: RangeWeek[] = [];
  ranges: ContractRange[] = [];
  selectedId = '';
  loading = true;
  loadError = false;
  unplaced = 0;
  private focusTodayPending = true;
  private focusFrame?: number;
  private readonly destroy = new Subject<void>();

  readonly nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  readonly nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  constructor(
    private route: Router,
    private authenticationToken: AuthenticationToken,
    private contractService: ContractService,
    private modalService: NgbModal,
  ) {}

  ngOnInit(): void {
    this.updateCalendar();
    this.findContract();
  }

  ngAfterViewChecked(): void {
    if (!this.focusTodayPending || this.loading) return;
    const cell = this.table?.nativeElement.querySelector<HTMLElement>('.today');
    if (!cell) return;
    this.focusTodayPending = false;
    this.focusFrame = requestAnimationFrame(() => {
      cell.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center', inline: 'center' });
      cell.focus({ preventScroll: true });
      this.focusFrame = undefined;
    });
  }

  findContract(): void {
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    this.loadError = false;
    this.contractService.listContract(headers).pipe(takeUntil(this.destroy)).subscribe({
      next: contracts => {
        this.contract = contracts || [];
        this.updateCalendar();
        this.loading = false;
      },
      error: error => {
        this.loadError = true;
        this.loading = false;
        if (error.status === 401) this.route.navigate(['/login']);
      },
    });
  }

  updateCalendar(): void {
    const layout = buildCalendarRanges(this.contract, this.selectedDate);
    this.weeks = layout.weeks;
    this.ranges = layout.ranges;
    this.unplaced = layout.unplaced;
    if (!this.ranges.some(range => range.contract._id === this.selectedId)) this.selectedId = this.ranges[0]?.contract._id || '';
  }

  get selectedRange(): ContractRange | undefined { return this.ranges.find(range => range.contract._id === this.selectedId); }
  selectRange(range: ContractRange): void { this.selectedId = range.contract._id; }
  isToday(day: Date): boolean { return isSameDay(day, this.today); }

  previousMonth(): void { this.changeMonth(-1); }
  nextMonth(): void { this.changeMonth(1); }
  private changeMonth(amount: number): void {
    this.cancelTodayFocus();
    this.selectedDate = addMonths(this.selectedDate, amount);
    this.updateCalendar();
  }

  goToToday(): void {
    this.cancelTodayFocus();
    this.today = new Date();
    this.selectedDate = new Date(this.today);
    this.updateCalendar();
    this.focusTodayPending = true;
  }

  openContractModal(contractId: string): void {
    const contrato = this.contract.find(contract => contract._id === contractId);
    if (!contrato) return;
    this.selectedId = contractId;
    const modalRef = this.modalService.open(ContractComponent, { size: 'xl', scrollable: true, centered: true });
    modalRef.componentInstance.initialContract = contrato;
    merge(modalRef.closed, modalRef.dismissed).pipe(take(1), takeUntil(this.destroy)).subscribe(() => this.findContract());
  }

  trackRange(_index: number, range: ContractRange): string { return range.contract._id; }
  trackWeek(_index: number, week: RangeWeek): string { return week.key; }
  trackDay(_index: number, day: RangeWeek['days'][number]): string { return day.key; }

  private cancelTodayFocus(): void {
    this.focusTodayPending = false;
    if (this.focusFrame !== undefined) cancelAnimationFrame(this.focusFrame);
    this.focusFrame = undefined;
  }

  ngOnDestroy(): void {
    this.cancelTodayFocus();
    this.destroy.next();
    this.destroy.complete();
  }
}
