import { Component, OnInit } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { ContractService } from '../../Servicios/contract.service';
import { AuthenticationToken } from '../../Servicios/autentication-token.service';

import {
  WeekSummaryDto,
  DaySummaryDto,
  DayView,
  AggregatedAccessoryView,
} from '../models/weekly-summary.model';

import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

const EXCLUDED_ACCESSORY_IDS: string[] = [
  '646635fe4c19f94ae45758ef',
  '6484877ece523caa9d3016a6',
  '6474d1e4ce523caa9d300720',
];

const SPANISH_DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

@Component({
  selector: 'app-weekly-work',
  templateUrl: './weekly-work.component.html',
  styleUrls: ['./weekly-work.component.css'],
})
export class WeeklyWorkComponent implements OnInit {
  currentWeekView: DayView[] = [];
  isLoading = false;

  // Lunes de la semana que se está mostrando (medianoche UTC, para no
  // arrastrar el desfase de zona horaria al comparar/formatear fechas).
  currentWeekStart!: Date;

  // Cache de meses ya consultados al backend, para no repetir la llamada
  // cada vez que navegás dentro del mismo mes. Clave: "YYYY-M".
  private monthCache = new Map<string, WeekSummaryDto[]>();

  // 👇 almacén seleccionado
  selectedWarehouse = 1;

  constructor(
    private contractService: ContractService,
    private authenticationToken: AuthenticationToken,
    private router: Router
  ) {}

  ngOnInit(): void {
    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    this.currentWeekStart = this.mondayOfWeek(todayUtc);
    this.loadWeekView(this.currentWeekStart);
  }

  // ===============================
  // Navegación entre semanas (siempre disponible, tenga o no mobiliario)
  // ===============================

  get selectedWeekNumber(): number {
    return this.getWeekNumber(this.currentWeekStart);
  }

  get selectedWeekRange(): string {
    const end = this.addDaysUtc(this.currentWeekStart, 6);
    return `${this.toDateKey(this.currentWeekStart)} / ${this.toDateKey(end)}`;
  }

  goToPreviousWeek(): void {
    if (this.isLoading) return;
    this.loadWeekView(this.addDaysUtc(this.currentWeekStart, -7));
  }

  goToNextWeek(): void {
    if (this.isLoading) return;
    this.loadWeekView(this.addDaysUtc(this.currentWeekStart, 7));
  }

  private loadWeekView(weekStart: Date): void {
    this.currentWeekStart = weekStart;
    const weekEnd = this.addDaysUtc(weekStart, 6);
    const months = this.monthsInRange(weekStart, weekEnd);

    this.isLoading = true;
    forkJoin(months.map((m) => this.fetchMonth(m.year, m.month))).subscribe({
      next: () => {
        this.isLoading = false;
        this.currentWeekView = this.buildWeekView(weekStart, weekEnd);
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.router.navigate(['/app-login']);
        }
      },
    });
  }

  private fetchMonth(year: number, month: number): Observable<WeekSummaryDto[]> {
    const key = `${year}-${month}`;
    const cached = this.monthCache.get(key);
    if (cached) {
      return of(cached);
    }

    const headers = new HttpHeaders().set(
      'Authorization',
      'Bearer ' + this.authenticationToken.myValue
    );

    return this.contractService.getWeeklySummary(year, month, headers).pipe(
      map((weeks) => weeks || []),
      tap((weeks) => this.monthCache.set(key, weeks))
    );
  }

  private buildWeekView(weekStart: Date, weekEnd: Date): DayView[] {
    const daysByDate = new Map<string, DaySummaryDto>();
    this.monthsInRange(weekStart, weekEnd).forEach((m) => {
      const weeks = this.monthCache.get(`${m.year}-${m.month}`) || [];
      weeks.forEach((w) => w.days.forEach((d) => daysByDate.set(d.date, d)));
    });

    const days: DaySummaryDto[] = [];
    for (let i = 0; i < 7; i++) {
      const date = this.addDaysUtc(weekStart, i);
      const dateKey = this.toDateKey(date);
      days.push(
        daysByDate.get(dateKey) || {
          date: dateKey,
          dayName: SPANISH_DAY_NAMES[date.getUTCDay()],
          items: [],
        }
      );
    }

    return this.buildDayView(days);
  }

  // ===============================
  // Tabs de almacenes
  // ===============================

  setWarehouse(warehouse: number): void {
    this.selectedWarehouse = warehouse;
  }

  hasAccessoriesForSelectedWarehouse(): boolean {
    for (const day of this.currentWeekView) {
      if (this.getAccessoriesByWarehouse(day, this.selectedWarehouse).length > 0) {
        return true;
      }
    }
    return false;
  }

  getAccessoriesByWarehouse(
    day: DayView,
    warehouse: number
  ): AggregatedAccessoryView[] {
    if (!day?.accessories) return [];
    return day.accessories.filter((x) => x.warehouse === warehouse);
  }

  // ===============================
  // Helpers de fechas (todo en UTC, para no arrastrar desfase de huso horario)
  // ===============================

  private toDateKey(d: Date): string {
    return d.toISOString().substring(0, 10);
  }

  private addDaysUtc(d: Date, days: number): Date {
    const copy = new Date(d);
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
  }

  private mondayOfWeek(d: Date): Date {
    const dayNum = d.getUTCDay() || 7; // lunes=1 ... domingo=7
    return this.addDaysUtc(d, -(dayNum - 1));
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

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private buildDayView(days: DaySummaryDto[]): DayView[] {
    const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));

    return sortedDays.map((day) => {
      const filtered = day.items.filter(
        (item) => !EXCLUDED_ACCESSORY_IDS.includes(item.accessoryId)
      );

      const map = new Map<string, AggregatedAccessoryView>();

      for (const item of filtered) {
        const warehouse = (item as any).warehouse ?? 1;
        const key = `${warehouse}__${item.description}`;

        if (map.has(key)) {
          map.get(key)!.totalAmount += item.amount;
        } else {
          map.set(key, {
            description: item.description,
            totalAmount: item.amount,
            warehouse,
          });
        }
      }

      const accessories = Array.from(map.values()).sort((a, b) =>
        a.description.localeCompare(b.description)
      );

      const [year, month, dayNum] = day.date.split('-');
      const dateLabel = `${day.dayName} ${dayNum}/${month}`;

      return {
        date: dateLabel,
        accessories,
      };
    });
  }

  // ===============================
  // Exportar
  // ===============================

  exportToExcel(): void {
    const rows: any[] = [];

    this.currentWeekView.forEach((day) => {
      const list = this.getAccessoriesByWarehouse(day, this.selectedWarehouse);

      list.forEach((acc) => {
        rows.push({
          Fecha: day.date,
          Mobiliario: acc.description,
          Cantidad: acc.totalAmount,
          Almacén: this.selectedWarehouse === 1 ? 'Almacén 1' : 'Almacén 2',
        });
      });
    });

    if (!rows.length) return;

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `Semana_${this.selectedWeekNumber}_ALM${this.selectedWarehouse}`
    );

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const excelBlob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    FileSaver.saveAs(
      excelBlob,
      `mobiliario_${this.selectedWeekNumber}_almacen_${this.selectedWarehouse}.xlsx`
    );
  }

  printWeek(): void {
    window.print();
  }
}
