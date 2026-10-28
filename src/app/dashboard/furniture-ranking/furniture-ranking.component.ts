import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpHeaders } from '@angular/common/http';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ContractService } from '../../Servicios/contract.service';
import { AuthenticationToken } from '../../Servicios/autentication-token.service';
import { FurnitureRank, RentalContract, rankFurniture, rentalVariation } from './furniture-ranking';

@Component({
  selector: 'app-furniture-ranking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './furniture-ranking.component.html',
  styleUrls: ['./furniture-ranking.component.css'],
})
export class FurnitureRankingComponent implements OnInit, OnDestroy {
  readonly months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  readonly years = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - index);
  private readonly lastClosedMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  year = this.lastClosedMonth.getFullYear();
  month = this.lastClosedMonth.getMonth() + 1;
  rows: FurnitureRank[] = [];
  loading = true;
  error = false;
  max = 1;
  private readonly cache = new Map<number, RentalContract[]>();
  private readonly selection = new Subject<void>();
  private readonly destroy = new Subject<void>();

  constructor(private contracts: ContractService, private authentication: AuthenticationToken) {}

  ngOnInit(): void {
    this.selection.pipe(
      tap(() => { this.loading = true; this.error = false; this.rows = []; }),
      switchMap(() => {
        const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authentication.myValue);
        return forkJoin([this.loadYear(this.year, headers), this.loadYear(this.year - 1, headers)]).pipe(
          map(lists => rankFurniture(lists.flat(), this.year, this.month)),
          catchError(() => { this.error = true; return of([] as FurnitureRank[]); }),
        );
      }),
      takeUntil(this.destroy),
    ).subscribe(rows => {
      this.rows = rows;
      this.max = Math.max(1, ...rows.flatMap(row => [row.current, row.previousYear, row.previousMonth]));
      this.loading = false;
    });
    this.refresh();
  }

  refresh(): void { this.selection.next(); }

  private loadYear(year: number, headers: HttpHeaders) {
    const cached = this.cache.get(year);
    return cached ? of(cached) : this.contracts.getContractsByYear(year, headers).pipe(
      tap((contracts: RentalContract[]) => this.cache.set(year, contracts)),
    );
  }

  get selectedLabel(): string { return `${this.months[this.month - 1]} ${this.year}`; }
  get previousYearLabel(): string { return `${this.months[this.month - 1]} ${this.year - 1}`; }
  get previousMonthLabel(): string { return this.month === 1 ? `Diciembre ${this.year - 1}` : `${this.months[this.month - 2]} ${this.year}`; }
  get partialMonth(): boolean { return this.year === new Date().getFullYear() && this.month === new Date().getMonth() + 1; }
  width(value: number): number { return value / this.max * 100; }
  variation = rentalVariation;
  trackRow(_index: number, row: FurnitureRank): string { return row.id; }

  ngOnDestroy(): void { this.destroy.next(); this.destroy.complete(); this.selection.complete(); }
}
