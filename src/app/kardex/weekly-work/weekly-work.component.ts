import { Component, OnInit } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

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

@Component({
  selector: 'app-weekly-work',
  templateUrl: './weekly-work.component.html',
  styleUrls: ['./weekly-work.component.css'],
})
export class WeeklyWorkComponent implements OnInit {
  weeks: WeekSummaryDto[] = [];
  currentWeekView: DayView[] = [];

  currentWeekNumber!: number;
  currentYear!: number;
  currentMonth!: number;

  selectedWeekIndex = 0;

  // 👇 almacén seleccionado
  selectedWarehouse = 1;

  constructor(
    private contractService: ContractService,
    private authenticationToken: AuthenticationToken,
    private router: Router
  ) {}

  ngOnInit(): void {
    const today = new Date();

    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth() + 1;
    this.currentWeekNumber = this.getWeekNumber(today);

    this.loadWeeks();
  }

  // ================================
  // Cargar semanas desde backend
  // ================================

  private loadWeeks(): void {
    const headers = new HttpHeaders().set(
      'Authorization',
      'Bearer ' + this.authenticationToken.myValue
    );

    this.contractService
      .getWeeklySummary(this.currentYear, this.currentMonth, headers)
      .subscribe({
        next: (weeks: WeekSummaryDto[]) => {
          this.weeks = (weeks || []).sort(
            (a, b) => a.weekNumber - b.weekNumber
          );

          if (this.weeks.length === 0) {
            this.currentWeekView = [];
            return;
          }

          let index = this.weeks.findIndex(
            (w) => w.weekNumber === this.currentWeekNumber
          );

          if (index === -1) index = this.weeks.length - 1;

          this.selectedWeekIndex = index;
          this.updateCurrentWeekView();
        },
        error: (error) => {
          if (error.status === 401) {
            this.router.navigate(['/app-login']);
          }
        },
      });
  }

  // ===============================
  // Navegación entre semanas
  // ===============================

  get selectedWeekNumber(): number | null {
    if (!this.weeks.length) return null;
    return this.weeks[this.selectedWeekIndex]?.weekNumber ?? null;
  }

  get selectedWeekRange(): string {
    if (!this.weeks.length) return '';
    const w = this.weeks[this.selectedWeekIndex];
    return `${w.from} / ${w.to}`;
  }

  goToPreviousWeek(): void {
    if (this.selectedWeekIndex > 0) {
      this.selectedWeekIndex--;
      this.updateCurrentWeekView();
    }
  }

  goToNextWeek(): void {
    if (this.selectedWeekIndex < this.weeks.length - 1) {
      this.selectedWeekIndex++;
      this.updateCurrentWeekView();
    }
  }

  private updateCurrentWeekView(): void {
    const week = this.weeks[this.selectedWeekIndex];
    if (!week) {
      this.currentWeekView = [];
      return;
    }
    this.currentWeekView = this.buildDayView(week.days);
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
  // Helpers
  // ===============================

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
