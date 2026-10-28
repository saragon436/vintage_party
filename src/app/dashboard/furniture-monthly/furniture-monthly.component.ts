import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthenticationToken } from '../../Servicios/autentication-token.service';
import { ContractService } from '../../Servicios/contract.service';
import { FurnitureRank } from '../furniture-ranking/furniture-ranking';
import { MonthlyFurniture, monthlyFurniture } from './furniture-monthly';

@Component({
  selector: 'app-furniture-monthly',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './furniture-monthly.component.html',
  styleUrls: ['./furniture-monthly.component.css'],
})
export class FurnitureMonthlyComponent implements OnInit, OnDestroy {
  readonly year = new Date().getFullYear();
  readonly closedMonths = new Date().getMonth();
  readonly ranks = Array.from({ length: 10 }, (_, index) => index);
  months: MonthlyFurniture[] = [];
  selectedId = '';
  selectedDescription = '';
  selectedMonth = 0;
  loading = false;
  error = false;
  private readonly destroy = new Subject<void>();

  constructor(private contracts: ContractService, private authentication: AuthenticationToken) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    if (this.loading || !this.closedMonths) return;
    this.loading = true;
    this.error = false;
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authentication.myValue);
    // Reuse existing creation-year endpoints, retaining the accepted historical coverage limitation.
    forkJoin([
      this.contracts.getContractsByYear(this.year, headers),
      this.contracts.getContractsByYear(this.year - 1, headers),
    ]).pipe(takeUntil(this.destroy)).subscribe({
      next: lists => {
        this.months = monthlyFurniture(lists.flat(), this.year, this.closedMonths);
        const latest = [...this.months].reverse().find(month => month.rows.length);
        if (latest) this.select(latest.rows[0], latest.month - 1);
        this.loading = false;
      },
      error: () => { this.error = true; this.loading = false; },
    });
  }

  select(row: FurnitureRank, monthIndex: number): void {
    this.selectedId = row.id;
    this.selectedDescription = row.description;
    this.selectedMonth = monthIndex;
  }

  get hasRows(): boolean { return this.months.some(month => month.rows.length > 0); }
  get activeMonth(): MonthlyFurniture | undefined { return this.months[this.selectedMonth]; }
  position(month: MonthlyFurniture): number { return month.rows.findIndex(row => row.id === this.selectedId) + 1; }
  selectedRow(month: MonthlyFurniture): FurnitureRank | undefined { return month.rows.find(row => row.id === this.selectedId); }
  isEntry(row: FurnitureRank, index: number): boolean {
    return index > 0 && !this.months[index - 1].rows.some(previous => previous.id === row.id);
  }
  get movement(): string {
    const current = this.activeMonth;
    if (!current) return '';
    const rank = this.position(current);
    if (!rank) return current.rows.length ? 'Fuera del top 10' : 'Sin alquileres en este mes';
    if (!this.selectedMonth) return 'Primer mes del año';
    const previous = this.position(this.months[this.selectedMonth - 1]);
    if (!previous) return 'Entra al top 10';
    const change = previous - rank;
    return change === 0 ? 'Mantiene su puesto' : `${change > 0 ? '↑ Sube' : '↓ Baja'} ${Math.abs(change)} ${Math.abs(change) === 1 ? 'puesto' : 'puestos'}`;
  }
  shortName(row: FurnitureRank): string { return row.description.split(' (')[0]; }
  trackMonth(_index: number, month: MonthlyFurniture): number { return month.month; }
  ngOnDestroy(): void { this.destroy.next(); this.destroy.complete(); }
}
