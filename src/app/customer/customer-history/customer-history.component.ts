import { Component, Input, OnInit } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin } from 'rxjs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ContractService } from '../../Servicios/contract.service';
import { QuotationService } from '../../Servicios/quotation.service';
import { AuthenticationToken } from '../../Servicios/autentication-token.service';
// eslint-disable-next-line import/no-cycle -- mismo patrón que AccessoryAvailabilityComponent: reutiliza el modal de Contrato para "Ver contrato" desde este historial.
import { ContractComponent } from '../../contract/contract.component';

interface CustomerInput {
  _id: string;
  name: string;
  documentNumber: string;
  address?: string;
  phone?: string;
}

interface OnAccountItem {
  amount: number;
  number: string;
  createdDate: string;
}

interface AccessoryItem {
  id: string;
  description: string;
  amount: number;
  price: number;
}

interface ContractRaw {
  _id: string;
  codContract: string;
  createDate: string;
  eventDate: string;
  district?: string;
  address?: string;
  amount: number;
  onAccount: OnAccountItem[];
  status: string;
  listAccessories: AccessoryItem[];
  quotationCod?: string;
}

interface QuotationRaw {
  _id: string;
  codQuotation: string;
  createDate: string;
  eventDate: string;
  amount: number;
  status: string;
  associatedContractCod?: string;
}

interface ContractView {
  _id: string;
  codContract: string;
  eventDateLabel: string;
  district: string;
  status: string;
  pillClass: string;
  amount: number;
  abonado: number;
  saldo: number;
}

interface QuotationView {
  _id: string;
  codQuotation: string;
  createDateLabel: string;
  eventDateLabel: string;
  statusLabel: string;
  pillClass: string;
  amount: number;
  associatedContractCod?: string;
}

interface RankRow {
  description: string;
  eventos: number;
  unidades: number;
  lastDateLabel: string;
  barPct: number;
  isTop: boolean;
}

interface MonthBar {
  label: string;
  fullLabel: string;
  count: number;
  heightPct: number;
  isPeak: boolean;
}

const STATUS_NOT_COUNTED = ['Anulado'];
const STATUS_NOT_PENDING = ['Pagado', 'Archivado', 'Anulado'];

const CONTRACT_PILL: Record<string, string> = {
  'Por Pagar': 'ch-pill-warning',
  'En Almacen': 'ch-pill-info',
  'Pagado': 'ch-pill-success',
  'Archivado': 'ch-pill-muted',
  'Anulado': 'ch-pill-danger',
};

const QUOTATION_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  CONVERTED: 'Convertida',
  CANCELLED: 'Cancelada',
};

const QUOTATION_PILL: Record<string, string> = {
  PENDING: 'ch-pill-warning',
  CONVERTED: 'ch-pill-success',
  CANCELLED: 'ch-pill-danger',
};

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const MONTH_FULL_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-customer-history',
  templateUrl: './customer-history.component.html',
  styleUrls: ['./customer-history.component.css'],
})
export class CustomerHistoryComponent implements OnInit {
  @Input() customer!: CustomerInput;

  loading = true;
  errorMsg = '';

  activeTab: 'contratos' | 'cotizaciones' | 'mobiliario' = 'contratos';

  contracts: ContractView[] = [];
  quotations: QuotationView[] = [];
  rankRows: RankRow[] = [];
  monthBars: MonthBar[] = [];
  peakMonthLabel = '';
  peakMonthCount = 0;

  totalContratos = 0;
  totalCotizaciones = 0;
  facturado = 0;
  saldoPendiente = 0;
  contratoConSaldo = '';
  clienteDesdeLabel = '';
  ultimaActividadLabel = '';
  ultimaActividadSub = '';

  showTopTable = false;
  showTrendTable = false;

  private rawContracts: ContractRaw[] = [];

  constructor(
    public activeModal: NgbActiveModal,
    private modalService: NgbModal,
    private contractService: ContractService,
    private quotationService: QuotationService,
    private authenticationToken: AuthenticationToken
  ) {}

  ngOnInit(): void {
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);

    forkJoin({
      contracts: this.contractService.getContractsByCustomer(this.customer._id, headers),
      quotations: this.quotationService.getQuotationsByCustomer(this.customer._id, headers),
    }).subscribe(
      ({ contracts, quotations }) => {
        this.build(contracts || [], quotations || []);
        this.loading = false;
      },
      () => {
        this.errorMsg = 'No se pudo cargar el historial de este cliente.';
        this.loading = false;
      }
    );
  }

  setTab(tab: 'contratos' | 'cotizaciones' | 'mobiliario'): void {
    this.activeTab = tab;
  }

  verContrato(contractId: string): void {
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    this.contractService.listContractById(contractId, headers).subscribe((fullContract) => {
      const modalRef = this.modalService.open(ContractComponent, {
        size: 'xl',
        scrollable: true,
        centered: true,
      });
      modalRef.componentInstance.initialContract = fullContract;
    });
  }

  private build(rawContracts: ContractRaw[], rawQuotations: QuotationRaw[]): void {
    this.rawContracts = rawContracts;

    this.totalContratos = rawContracts.length;
    this.totalCotizaciones = rawQuotations.length;

    const countedContracts = rawContracts.filter((c) => !STATUS_NOT_COUNTED.includes(String(c.status)));
    this.facturado = countedContracts.reduce((sum, c) => sum + Number(c.amount || 0), 0);

    let saldoTotal = 0;
    let saldoContractCode = '';
    for (const c of rawContracts) {
      if (STATUS_NOT_PENDING.includes(String(c.status))) continue;
      const abonado = (c.onAccount || []).reduce((sum, o) => sum + Number(o.amount || 0), 0);
      const saldo = Number(c.amount || 0) - abonado;
      if (saldo > 0) {
        saldoTotal += saldo;
        if (!saldoContractCode) saldoContractCode = c.codContract;
      }
    }
    this.saldoPendiente = saldoTotal;
    this.contratoConSaldo = saldoContractCode;

    // El orden (eventDate desc) ya viene dado por el backend.
    this.contracts = rawContracts.map((c) => {
      const abonado = (c.onAccount || []).reduce((sum, o) => sum + Number(o.amount || 0), 0);
      return {
        _id: c._id,
        codContract: c.codContract,
        eventDateLabel: this.formatDate(c.eventDate),
        district: c.district || '—',
        status: String(c.status),
        pillClass: CONTRACT_PILL[String(c.status)] || 'ch-pill-muted',
        amount: Number(c.amount || 0),
        abonado,
        saldo: Number(c.amount || 0) - abonado,
      };
    });

    this.quotations = rawQuotations.map((q) => ({
      _id: q._id,
      codQuotation: q.codQuotation,
      createDateLabel: this.formatDate(q.createDate),
      eventDateLabel: this.formatDate(q.eventDate),
      statusLabel: QUOTATION_LABEL[String(q.status)] || String(q.status),
      pillClass: QUOTATION_PILL[String(q.status)] || 'ch-pill-muted',
      amount: Number(q.amount || 0),
      associatedContractCod: q.associatedContractCod,
    }));

    this.buildClienteDesde(rawContracts, rawQuotations);
    this.buildUltimaActividad(rawContracts, rawQuotations);
    this.buildTopMobiliario(countedContracts);
    this.buildMonthTrend(countedContracts);
  }

  private buildClienteDesde(contracts: ContractRaw[], quotations: QuotationRaw[]): void {
    const isoDates = [
      ...contracts.map((c) => c.createDate),
      ...quotations.map((q) => q.createDate),
    ].filter(Boolean);

    if (isoDates.length === 0) {
      this.clienteDesdeLabel = '';
      return;
    }
    const earliestIso = isoDates.reduce((min, d) =>
      new Date(d).getTime() < new Date(min).getTime() ? d : min
    );
    this.clienteDesdeLabel = format(this.parseCalendarDay(earliestIso), 'MMMM yyyy', { locale: es });
  }

  private buildUltimaActividad(contracts: ContractRaw[], quotations: QuotationRaw[]): void {
    type Event = { date: number; label: string; sub: string };
    const events: Event[] = [
      ...contracts.map((c) => ({
        date: new Date(c.createDate).getTime(),
        label: this.formatDate(c.createDate),
        sub: `contrato ${c.codContract} registrado`,
      })),
      ...quotations.map((q) => ({
        date: new Date(q.createDate).getTime(),
        label: this.formatDate(q.createDate),
        sub: `cotización ${q.codQuotation} emitida`,
      })),
    ];

    if (events.length === 0) {
      this.ultimaActividadLabel = '—';
      this.ultimaActividadSub = 'Sin historial todavía';
      return;
    }

    events.sort((a, b) => b.date - a.date);
    this.ultimaActividadLabel = events[0].label;
    this.ultimaActividadSub = events[0].sub;
  }

  private buildTopMobiliario(contracts: ContractRaw[]): void {
    interface Agg {
      description: string;
      eventIds: Set<string>;
      unidades: number;
      lastDate: number;
    }
    const byId = new Map<string, Agg>();

    for (const c of contracts) {
      for (const item of c.listAccessories || []) {
        const key = item.id;
        const eventDate = new Date(c.eventDate).getTime();
        const existing = byId.get(key);
        if (existing) {
          existing.eventIds.add(c._id);
          existing.unidades += Number(item.amount || 0);
          existing.lastDate = Math.max(existing.lastDate, eventDate);
        } else {
          byId.set(key, {
            description: item.description,
            eventIds: new Set([c._id]),
            unidades: Number(item.amount || 0),
            lastDate: eventDate,
          });
        }
      }
    }

    const aggregated = Array.from(byId.values())
      .map((a) => ({
        description: a.description,
        eventos: a.eventIds.size,
        unidades: a.unidades,
        lastDate: a.lastDate,
      }))
      .sort((a, b) => b.eventos - a.eventos || b.unidades - a.unidades)
      .slice(0, 6);

    const maxEventos = aggregated.length ? aggregated[0].eventos : 0;

    this.rankRows = aggregated.map((a) => ({
      description: a.description,
      eventos: a.eventos,
      unidades: a.unidades,
      lastDateLabel: this.formatDate(new Date(a.lastDate).toISOString()),
      barPct: maxEventos > 0 ? Math.round((a.eventos / maxEventos) * 100) : 0,
      isTop: a.eventos === maxEventos && maxEventos > 0,
    }));
  }

  private buildMonthTrend(contracts: ContractRaw[]): void {
    const counts = new Array(12).fill(0);
    for (const c of contracts) {
      if (!c.eventDate) continue;
      const month = this.parseCalendarDay(c.eventDate).getMonth();
      counts[month] += 1;
    }
    const max = Math.max(...counts, 0);

    this.monthBars = counts.map((count, i) => ({
      label: MONTH_LABELS[i],
      fullLabel: MONTH_FULL_LABELS[i],
      count,
      heightPct: max > 0 ? Math.max(Math.round((count / max) * 100), count > 0 ? 8 : 0) : 0,
      isPeak: max > 0 && count === max,
    }));

    if (max > 0) {
      const peakMonths = MONTH_FULL_LABELS.filter((_, i) => counts[i] === max);
      this.peakMonthLabel = peakMonths.join(' y ');
      this.peakMonthCount = max;
    } else {
      this.peakMonthLabel = '';
      this.peakMonthCount = 0;
    }
  }

  private formatDate(iso: string): string {
    if (!iso) return '—';
    try {
      return format(this.parseCalendarDay(iso), "d MMM yyyy", { locale: es });
    } catch {
      return '—';
    }
  }

  // El backend manda las fechas como medianoche UTC del día calendario que
  // corresponde (mismo criterio que el resto de la app: `.slice(0,10)`,
  // pipes con `:'UTC'`). `new Date(iso)` + funciones locales de date-fns
  // se equivocan de día en cualquier navegador con offset negativo (ej.
  // Lima UTC-5): medianoche UTC del 21 cae en la noche del 20 en hora
  // local. Por eso acá tomamos el "Y-M-D" del ISO tal cual y construimos
  // una fecha LOCAL con esos mismos números (mismo patrón que
  // AccessoryAvailabilityComponent.parseCalendarDay).
  private parseCalendarDay(iso: string): Date {
    const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }
}
