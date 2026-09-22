import { Component, OnInit } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ContractService } from '../../Servicios/contract.service';
import { QuotationService } from '../../Servicios/quotation.service';
import { AccessoryService } from '../../Servicios/accessory.service';
import { AuthenticationToken } from '../../Servicios/autentication-token.service';
import { WeekSummaryDto, AccessorySummaryDto } from '../../kardex/models/weekly-summary.model';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTH_NAMES_FULL = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DAY_LABELS_SHORT = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];

const STATUS_META: { key: string; label: string; cssClass: string }[] = [
  { key: 'Pagado', label: 'Pagado', cssClass: 'good' },
  { key: 'En Almacen', label: 'En almacén', cssClass: 'active' },
  { key: 'Por Pagar', label: 'Por pagar', cssClass: 'warn' },
  { key: 'Archivado', label: 'Archivado', cssClass: 'neutral' },
  { key: 'Anulado', label: 'Anulado', cssClass: 'bad' },
];

interface Contract {
  status: string;
  eventDate: string;
}

interface Quotation {
  createDate: string;
  status?: string;
}

interface Accessory {
  _id: string;
  description: string;
  stock: number;
}

interface StatusCount {
  label: string;
  cssClass: string;
  count: number;
  pct: number;
}

interface MonthPoint {
  label: string;
  current: number;
  previous: number;
}

interface AgendaItem {
  dayLabel: string;
  dayNumber: string;
  codContract: string;
  customerName: string;
  address: string;
  warehouse: number;
}

interface StockAlert {
  description: string;
  demand: number;
  stock: number;
}

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.css'],
})
export class DashboardHomeComponent implements OnInit {
  isLoading = true;
  loadError = false;
  todayLabel = '';
  currentMonthLabel = '';

  // KPIs
  contractsThisMonth = 0;
  eventsThisWeek = 0;
  quotationsThisMonth = 0;
  conversionRate: number | null = null;
  conversionDeltaPts: number | null = null;

  // Contratos por estado
  statusCounts: StatusCount[] = [];

  // Esta semana
  agenda: AgendaItem[] = [];
  weekRangeLabel = '';
  stockAlert: StockAlert | null = null;

  // Cotizaciones
  funnelTotal = 0;
  funnelFollowUp = 0;
  funnelConverted = 0;
  staleQuotations = 0;

  // Contratos por mes
  monthPoints: MonthPoint[] = [];

  currentYear = new Date().getFullYear();
  previousYear = this.currentYear - 1;

  constructor(
    private contractService: ContractService,
    private quotationService: QuotationService,
    private accessoryService: AccessoryService,
    private authenticationToken: AuthenticationToken
  ) {}

  ngOnInit(): void {
    this.todayLabel = new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    this.currentMonthLabel = MONTH_NAMES_FULL[new Date().getMonth()];

    const headers = this.buildHeaders();
    const todayUtc = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
    const monday = this.mondayOfWeek(todayUtc);
    const weekMonths = this.monthsInRange(monday, this.addDaysUtc(monday, 6));

    forkJoin({
      contractsCurrent: this.contractService.getContractsByYear(this.currentYear, headers).pipe(catchError(() => of([] as Contract[]))),
      contractsPrevious: this.contractService.getContractsByYear(this.previousYear, headers).pipe(catchError(() => of([] as Contract[]))),
      quotations: this.quotationService.listQuotation(headers, 1, 300).pipe(catchError(() => of({ items: [] as Quotation[] }))),
      accessories: this.accessoryService.listAccessory(headers).pipe(catchError(() => of([] as Accessory[]))),
      weeks: forkJoin(
        weekMonths.map((m) =>
          this.contractService.getWeeklySummary(m.year, m.month, headers).pipe(catchError(() => of([] as WeekSummaryDto[])))
        )
      ),
    }).subscribe({
      next: (result) => {
        this.buildStatusBreakdown(result.contractsCurrent || []);
        this.buildMonthlyTrend(result.contractsCurrent || [], result.contractsPrevious || []);
        this.buildQuotationInsights(result.quotations?.items || []);
        this.buildWeekAgenda(result.weeks || [], monday, result.accessories || []);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadError = true;
      },
    });
  }

  private buildHeaders(): HttpHeaders {
    return new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
  }

  // ===============================
  // Contratos por estado + contratos este mes
  // ===============================
  private buildStatusBreakdown(contracts: Contract[]): void {
    const counts = new Map<string, number>();
    contracts.forEach((c) => counts.set(c.status, (counts.get(c.status) || 0) + 1));

    const max = Math.max(1, ...STATUS_META.map((s) => counts.get(s.key) || 0));
    this.statusCounts = STATUS_META.map((meta) => ({
      label: meta.label,
      cssClass: meta.cssClass,
      count: counts.get(meta.key) || 0,
      pct: Math.round(((counts.get(meta.key) || 0) / max) * 100),
    }));

    const today = new Date();
    this.contractsThisMonth = contracts.filter((c) => {
      const d = this.parseDate(c.eventDate);
      return d && d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    }).length;
  }

  // ===============================
  // Contratos por mes (solo meses ya cerrados del año)
  // ===============================
  private buildMonthlyTrend(current: Contract[], previous: Contract[]): void {
    const currentMonthIdx = new Date().getMonth();
    const points: MonthPoint[] = [];
    for (let m = 0; m < currentMonthIdx; m++) {
      points.push({
        label: MONTH_LABELS[m],
        current: this.countByMonth(current, this.currentYear, m),
        previous: this.countByMonth(previous, this.previousYear, m),
      });
    }
    this.monthPoints = points;
  }

  private countByMonth(contracts: Contract[], year: number, month: number): number {
    return contracts.filter((c) => {
      const d = this.parseDate(c.eventDate);
      return d && d.getFullYear() === year && d.getMonth() === month;
    }).length;
  }

  get maxMonthValue(): number {
    return Math.max(1, ...this.monthPoints.flatMap((p) => [p.current, p.previous]));
  }

  barHeightPct(value: number): number {
    return Math.round((value / this.maxMonthValue) * 100);
  }

  // ===============================
  // Cotizaciones + conversión
  // ===============================
  private buildQuotationInsights(quotations: Quotation[]): void {
    const today = new Date();
    const inMonth = (d: Date | null, year: number, month: number) =>
      !!d && d.getFullYear() === year && d.getMonth() === month;

    const currentMonthQuotations = quotations.filter((q) =>
      inMonth(this.parseDate(q.createDate), today.getFullYear(), today.getMonth())
    );
    const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthQuotations = quotations.filter((q) =>
      inMonth(this.parseDate(q.createDate), prevMonthDate.getFullYear(), prevMonthDate.getMonth())
    );

    this.quotationsThisMonth = currentMonthQuotations.length;
    const convertedCurrent = currentMonthQuotations.filter((q) => q.status === 'CONVERTED').length;
    const convertedPrev = prevMonthQuotations.filter((q) => q.status === 'CONVERTED').length;

    this.conversionRate = currentMonthQuotations.length
      ? Math.round((convertedCurrent / currentMonthQuotations.length) * 100)
      : null;
    const prevRate = prevMonthQuotations.length ? Math.round((convertedPrev / prevMonthQuotations.length) * 100) : null;
    this.conversionDeltaPts =
      this.conversionRate !== null && prevRate !== null ? this.conversionRate - prevRate : null;

    this.funnelTotal = currentMonthQuotations.length;
    this.funnelConverted = convertedCurrent;
    this.funnelFollowUp = currentMonthQuotations.filter((q) => q.status !== 'CONVERTED').length;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    this.staleQuotations = currentMonthQuotations.filter((q) => {
      if (q.status === 'CONVERTED') return false;
      const d = this.parseDate(q.createDate);
      return !!d && d < sevenDaysAgo;
    }).length;
  }

  funnelPct(count: number): number {
    return this.funnelTotal ? Math.round((count / this.funnelTotal) * 100) : 0;
  }

  get conversionDeltaAbs(): number {
    return Math.abs(this.conversionDeltaPts || 0);
  }

  get stockOverage(): number {
    return this.stockAlert ? this.stockAlert.demand - this.stockAlert.stock : 0;
  }

  // ===============================
  // Esta semana (agenda + alerta de stock)
  // ===============================
  private buildWeekAgenda(weeks: WeekSummaryDto[][], monday: Date, accessories: Accessory[]): void {
    const daysByDate = new Map<string, AccessorySummaryDto[]>();
    weeks.forEach((weekList) =>
      (weekList || []).forEach((w) => (w.days || []).forEach((d) => daysByDate.set(d.date, d.items || [])))
    );

    const stockById = new Map<string, { description: string; stock: number }>();
    accessories.forEach((a) => stockById.set(a._id, { description: a.description, stock: a.stock }));

    const seenContracts = new Set<string>();
    const agenda: AgendaItem[] = [];
    const maxDemandByAccessory = new Map<string, number>();

    for (let i = 0; i < 7; i++) {
      const date = this.addDaysUtc(monday, i);
      const dateKey = this.toDateKey(date);
      const items = daysByDate.get(dateKey) || [];

      const demandToday = new Map<string, number>();
      items.forEach((item) => {
        demandToday.set(item.accessoryId, (demandToday.get(item.accessoryId) || 0) + item.amount);
        const key = `${dateKey}__${item.contractId}`;
        if (!seenContracts.has(key)) {
          seenContracts.add(key);
          agenda.push({
            dayLabel: DAY_LABELS_SHORT[date.getUTCDay()],
            dayNumber: String(date.getUTCDate()),
            codContract: item.codContract,
            customerName: item.customerName,
            address: item.address,
            warehouse: item.warehouse ?? 1,
          });
        }
      });
      demandToday.forEach((amount, accessoryId) => {
        maxDemandByAccessory.set(accessoryId, Math.max(maxDemandByAccessory.get(accessoryId) || 0, amount));
      });
    }

    this.agenda = agenda;
    this.eventsThisWeek = new Set(agenda.map((a) => a.codContract)).size;

    const endOfWeek = this.addDaysUtc(monday, 6);
    this.weekRangeLabel = `${monday.getUTCDate()}–${endOfWeek.getUTCDate()} ${MONTH_LABELS[endOfWeek.getUTCMonth()]}`;

    let worst: StockAlert | null = null;
    maxDemandByAccessory.forEach((demand, accessoryId) => {
      const info = stockById.get(accessoryId);
      if (!info || info.stock >= demand) return;
      const overage = demand - info.stock;
      if (!worst || overage > worst.demand - worst.stock) {
        worst = { description: info.description, demand, stock: info.stock };
      }
    });
    this.stockAlert = worst;
  }

  // ===============================
  // Helpers de fecha (UTC para no arrastrar desfase de huso horario)
  // ===============================
  private parseDate(value: string): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  private mondayOfWeek(d: Date): Date {
    const dayNum = d.getUTCDay() || 7;
    return this.addDaysUtc(d, -(dayNum - 1));
  }

  private addDaysUtc(d: Date, days: number): Date {
    const copy = new Date(d);
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
  }

  private toDateKey(d: Date): string {
    return d.toISOString().substring(0, 10);
  }

  private monthsInRange(start: Date, end: Date): { year: number; month: number }[] {
    const months: { year: number; month: number }[] = [];
    const seen = new Set<string>();
    let cursor = new Date(start);
    while (cursor <= end) {
      const year = cursor.getUTCFullYear();
      const month = cursor.getUTCMonth() + 1;
      const key = `${year}-${month}`;
      if (!seen.has(key)) {
        seen.add(key);
        months.push({ year, month });
      }
      cursor = this.addDaysUtc(cursor, 1);
    }
    return months;
  }
}
