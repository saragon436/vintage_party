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

@Component({
  selector: 'app-weekly-work',
  templateUrl: './weekly-work.component.html',
  styleUrls: ['./weekly-work.component.css'],
})
export class WeeklyWorkComponent implements OnInit {
  weeks: WeekSummaryDto[] = [];     // 🔹 todas las semanas que devuelve el API
  currentWeekView: DayView[] = [];  // 🔹 días + contratos de la semana seleccionada

  currentWeekNumber!: number;       // semana actual (según hoy) – solo para setear índice inicial
  currentYear!: number;
  currentMonth!: number;

  selectedWeekIndex = 0;            // índice dentro de this.weeks
  

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

  // ================== Carga de semanas ==================

  private loadWeeks(): void {
    const headers = new HttpHeaders().set(
      'Authorization',
      'Bearer ' + this.authenticationToken.myValue
    );

    this.contractService
      .getWeeklySummary(this.currentYear, this.currentMonth, headers)
      .subscribe({
        next: (weeks: WeekSummaryDto[]) => {
          console.log('✅ Semanas recibidas:', weeks);
          this.weeks = weeks || [];

          if (this.weeks.length === 0) {
            this.currentWeekView = [];
            return;
          }

          // Buscar índice de la semana actual; si no existe, usar la primera
          let index = this.weeks.findIndex(
            (w) => w.weekNumber === this.currentWeekNumber
          );
          if (index === -1) {
            index = 0;
          }

          this.selectedWeekIndex = index;
          this.updateCurrentWeekView();
        },
        error: (error) => {
          console.error('❌ Error al obtener weekly-summary', error);
          if (error.status === 401) {
            console.log('usuario o claves incorrectos');
            this.router.navigate(['/app-login']);
          } else {
            console.log('error desconocido en weekly-summary');
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
    console.log('👀 currentWeekView (semana index', this.selectedWeekIndex, '):', this.currentWeekView);
  }

  // ================== Helpers de transformación ==================

  // misma lógica de número de semana que en backend
  private getWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(
      ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );
  }

private buildDayView(days: DaySummaryDto[]): DayView[] {
  // ordenar por fecha usando el string (yyyy-mm-dd)
  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));

  return sortedDays.map((day) => {
    // Mapa: descripción → total acumulado
    const accessoriesMap = new Map<string, number>();

    for (const item of day.items) {
      const key = item.description; // puedes usar description o description+id si quieres ser ultra estricto
      const prev = accessoriesMap.get(key) ?? 0;
      accessoriesMap.set(key, prev + item.amount);
    }

    // Convertir el mapa a arreglo ordenado por descripción
    const accessories: AggregatedAccessoryView[] = Array.from(
      accessoriesMap.entries()
    )
      .map(([description, totalAmount]) => ({ description, totalAmount }))
      .sort((a, b) => a.description.localeCompare(b.description));

    // Formatear fecha usando el string del backend (evitamos problemas de timezone)
    const [year, month, dayNum] = day.date.split('-'); // "2025-11-20"
    const dateLabel = `${day.dayName} ${dayNum}/${month}`;

    return {
      date: dateLabel,
      accessories,
    };
  });

}

}
