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

// 🔴 IDs de accesorios que NO deben aparecer en el resumen semanal
const EXCLUDED_ACCESSORY_IDS: string[] = [
  '646635fe4c19f94ae45758ef', // MOVILIDAD
  '6484877ece523caa9d3016a6', // IGV
  '6474d1e4ce523caa9d300720', // RECOJO
];

@Component({
  selector: 'app-weekly-work',
  templateUrl: './weekly-work.component.html',
  styleUrls: ['./weekly-work.component.css'],
})
export class WeeklyWorkComponent implements OnInit {
  weeks: WeekSummaryDto[] = [];     // todas las semanas devueltas por el API
  currentWeekView: DayView[] = [];  // vista actual (día → mobiliarios agregados)

  currentWeekNumber!: number;
  currentYear!: number;
  currentMonth!: number;

  selectedWeekIndex = 0;

  constructor(
    private contractService: ContractService,
    private authenticationToken: AuthenticationToken,
    private router: Router
  ) {}

  ngOnInit(): void {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth() + 1; // 1-12
    this.currentWeekNumber = this.getWeekNumber(today);

    this.loadWeeks();
  }

  // ================== Cargar semanas del mes ==================

  private loadWeeks(): void {
    const headers = new HttpHeaders().set(
      'Authorization',
      'Bearer ' + this.authenticationToken.myValue
    );

    this.contractService
      .getWeeklySummary(this.currentYear, this.currentMonth, headers)
      .subscribe({
        next: (weeks: WeekSummaryDto[]) => {
          // ordenar semanas de la más antigua a la más reciente
          this.weeks = (weeks || []).sort(
            (a, b) => a.weekNumber - b.weekNumber
          );

          if (this.weeks.length === 0) {
            this.currentWeekView = [];
            return;
          }

          // buscar semana actual según fecha de hoy
          let index = this.weeks.findIndex(
            (w) => w.weekNumber === this.currentWeekNumber
          );

          // si no se encuentra, usamos la última semana con datos
          if (index === -1) {
            index = this.weeks.length - 1;
          }

          this.selectedWeekIndex = index;
          this.updateCurrentWeekView();
        },
        error: (error) => {
          console.error('❌ Error al obtener weekly-summary', error);
          if (error.status === 401) {
            this.router.navigate(['/app-login']);
          }
        },
      });
  }

  // ================== Navegación entre semanas ==================

  get selectedWeekNumber(): number | null {
    if (!this.weeks || this.weeks.length === 0) {
      return null;
    }
    return this.weeks[this.selectedWeekIndex]?.weekNumber ?? null;
  }

  get selectedWeekRange(): string {
    if (!this.weeks || this.weeks.length === 0) {
      return '';
    }
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

  // ================== Helpers de transformación ==================

  private getWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(
      ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );
  }

  /**
   * Construye la vista de la semana:
   *  - Ordena los días
   *  - Excluye MOVILIDAD / IGV / RECOJO por accessoryId
   *  - Agrupa por descripción de mobiliario sumando cantidades
   */
  private buildDayView(days: DaySummaryDto[]): DayView[] {
    const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));

    return sortedDays.map((day) => {
      // 1) filtrar los items excluidos por ID
      const filteredItems = day.items.filter(
        (item) => !EXCLUDED_ACCESSORY_IDS.includes(item.accessoryId)
      );

      // 2) agrupar por descripción sumando la cantidad
      const accessoriesMap = new Map<string, number>();

      for (const item of filteredItems) {
        const key = item.description; // si quisieras ser ultra estricto, podrías usar item.accessoryId
        const prev = accessoriesMap.get(key) ?? 0;
        accessoriesMap.set(key, prev + item.amount);
      }

      const accessories: AggregatedAccessoryView[] = Array.from(
        accessoriesMap.entries()
      )
        .map(([description, totalAmount]) => ({ description, totalAmount }))
        .sort((a, b) => a.description.localeCompare(b.description));

      // 3) formatear fecha usando el string del backend (evitamos problemas de timezone)
      const [year, month, dayNum] = day.date.split('-'); // "2025-11-20"
      const dateLabel = `${day.dayName} ${dayNum}/${month}`;

      return {
        date: dateLabel,
        accessories,
      };
    });
  }

  // ================== Exportar semana actual a Excel ==================

  exportToExcel(): void {
    if (!this.currentWeekView || this.currentWeekView.length === 0) {
      return;
    }

    const rows: any[] = [];

    this.currentWeekView.forEach((day) => {
      day.accessories.forEach((acc) => {
        rows.push({
          Fecha: day.date,
          Mobiliario: acc.description,
          Cantidad: acc.totalAmount,
        });
      });
    });

    if (rows.length === 0) {
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `Semana_${this.selectedWeekNumber ?? ''}`
    );

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const excelBlob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fileName = `mobiliario_semana_${this.selectedWeekNumber ?? 'N'}.xlsx`;
    FileSaver.saveAs(excelBlob, fileName);
  }

  // ================== Imprimir ==================

  printWeek(): void {
    window.print();
  }
}


