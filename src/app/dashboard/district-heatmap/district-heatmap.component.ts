import { Component, OnInit } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';

import { ContractService, DistrictSummary } from '../../Servicios/contract.service';
import { AuthenticationToken } from '../../Servicios/autentication-token.service';
import { LIMA_DISTRICTS, LimaDistrictFeature } from './lima-districts-data';

interface RankedDistrict {
  name: string;
  count: number;
  pct: number;
}

interface DistrictContractRow {
  id: string;
  codContract: string;
  customerName: string;
  eventDate: string | null;
  installDate: string | null;
  status: string;
}

interface HoverTip {
  name: string;
  count: number;
  x: number;
  y: number;
}

const STATUS_CLASS: { [key: string]: string } = {
  'Pagado': 'good',
  'En Almacen': 'active',
  'Por Pagar': 'warn',
  'Archivado': 'neutral',
  'Anulado': 'bad',
};

@Component({
  selector: 'app-district-heatmap',
  templateUrl: './district-heatmap.component.html',
  styleUrls: ['./district-heatmap.component.css'],
})
export class DistrictHeatmapComponent implements OnInit {
  isLoading = true;
  loadError = false;

  readonly mapWidth = LIMA_DISTRICTS.width;
  readonly mapHeight = LIMA_DISTRICTS.height;
  readonly features: LimaDistrictFeature[] = LIMA_DISTRICTS.features;

  rangeDays = 30;
  counts = new Map<string, number>();
  maxCount = 0;
  totalContracts = 0;
  activeDistricts = 0;
  topDistrict: string | null = null;
  topDistrictPct = 0;
  ranked: RankedDistrict[] = [];

  selectedDistrict: string | null = null;
  selectedLoading = false;
  selectedRows: DistrictContractRow[] = [];
  selectedError = false;
  selectedTruncated = false;
  private selectedRequestId = 0;

  hoverTip: HoverTip | null = null;

  constructor(
    private contractService: ContractService,
    private authenticationToken: AuthenticationToken,
  ) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  private buildHeaders(): HttpHeaders {
    return new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
  }

  private dateRange(): { from: string; to: string } {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - this.rangeDays);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  loadSummary(): void {
    this.isLoading = true;
    this.loadError = false;
    this.selectedDistrict = null;
    this.selectedRows = [];

    const { from, to } = this.dateRange();
    this.contractService.getDistrictSummary(this.buildHeaders(), from, to).subscribe({
      next: (rows) => {
        this.counts = new Map(rows.map((r) => [r.district, r.count]));
        this.maxCount = rows.reduce((max, r) => Math.max(max, r.count), 0);
        this.totalContracts = rows.reduce((sum, r) => sum + r.count, 0);
        this.activeDistricts = rows.length;

        const top = rows.reduce<DistrictSummary | null>(
          (best, r) => (!best || r.count > best.count ? r : best),
          null,
        );
        this.topDistrict = top ? top.district : null;
        this.topDistrictPct = top && this.totalContracts ? Math.round((top.count / this.totalContracts) * 100) : 0;

        this.ranked = rows
          .slice()
          .sort((a, b) => b.count - a.count)
          .map((r) => ({
            name: r.district,
            count: r.count,
            pct: this.totalContracts ? Math.round((r.count / this.totalContracts) * 1000) / 10 : 0,
          }));

        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadError = true;
      },
    });
  }

  setRange(days: number): void {
    if (this.rangeDays === days) return;
    this.rangeDays = days;
    this.loadSummary();
  }

  countFor(name: string): number {
    return this.counts.get(name) || 0;
  }

  private bucketFor(name: string): number | null {
    const value = this.countFor(name);
    if (!value) return null;
    const t = Math.sqrt(value / (this.maxCount || 1));
    return Math.min(7, Math.round(t * 7));
  }

  fillFor(name: string): string {
    const idx = this.bucketFor(name);
    return idx === null ? '' : `var(--dh-seq-${idx + 1})`;
  }

  isEmpty(name: string): boolean {
    return this.bucketFor(name) === null;
  }

  showTip(feature: LimaDistrictFeature, evt: Event): void {
    const el = evt.target as SVGGraphicsElement;
    const rect = el.getBoundingClientRect();
    this.hoverTip = {
      name: feature.name,
      count: this.countFor(feature.name),
      x: rect.left + rect.width / 2,
      y: rect.top,
    };
  }

  hideTip(): void {
    this.hoverTip = null;
  }

  isSelected(name: string): boolean {
    return this.selectedDistrict === name;
  }

  selectDistrict(name: string): void {
    if (this.selectedDistrict === name) {
      this.clearSelection();
      return;
    }

    this.selectedDistrict = name;
    this.selectedLoading = true;
    this.selectedError = false;
    this.selectedTruncated = false;

    // Token para descartar una respuesta que llega fuera de orden si el
    // usuario hace click en otro distrito antes de que esta termine.
    const requestId = ++this.selectedRequestId;

    const { from, to } = this.dateRange();
    this.contractService.getContractsByDistrict(name, this.buildHeaders(), from, to).subscribe({
      next: (rows: any[]) => {
        if (requestId !== this.selectedRequestId) return;

        this.selectedRows = (rows || []).map((r) => ({
          id: r._id,
          codContract: r.codContract,
          customerName: r.customer?.name || '—',
          eventDate: r.eventDate || null,
          installDate: r.installDate || null,
          status: r.status,
        }));
        this.selectedLoading = false;
        // El backend capa la respuesta en 500 filas; si el total real del
        // resumen es mayor, avisamos en vez de mostrar la lista como completa.
        this.selectedTruncated = this.selectedRows.length < this.countFor(name);
      },
      error: () => {
        if (requestId !== this.selectedRequestId) return;

        this.selectedRows = [];
        this.selectedLoading = false;
        this.selectedError = true;
      },
    });
  }

  clearSelection(): void {
    this.selectedRequestId++;
    this.selectedDistrict = null;
    this.selectedRows = [];
    this.selectedError = false;
    this.selectedTruncated = false;
  }

  statusClass(status: string): string {
    return STATUS_CLASS[status] || 'neutral';
  }
}
