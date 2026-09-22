import { Component, Input, OnInit } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { addDays, differenceInCalendarDays, format, max as maxDate, min as minDate, startOfDay, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { ContractService } from '../../Servicios/contract.service';
import { AuthenticationToken } from '../../Servicios/autentication-token.service';
// eslint-disable-next-line import/no-cycle -- ContractComponent también abre este modal (Ver disponibilidad); acá lo reutilizamos para el detalle de contrato, referencia circular intencional entre ambos.
import { ContractComponent } from '../../contract/contract.component';

// Una reserva de duración mayor a esto se marca como atípica: muy por
// encima del alquiler típico de este negocio (pocos días), suele ser una
// fecha de recojo mal ingresada que bloquea el mobiliario sin necesidad.
const ANOMALY_THRESHOLD_DAYS = 30;

// Ventana visual de la línea de tiempo: no la estiramos indefinidamente por
// una sola reserva larga (eso aplastaría a las demás), pero tampoco la
// dejamos angosta si no hay nada reservado.
const DOMAIN_MIN_DAYS = 14;
const DOMAIN_MAX_DAYS = 120;
const DOMAIN_PAST_CAP_DAYS = 14;

interface ReservationRaw {
  _id: string;
  codContract: string;
  customerName: string;
  installDate: string;
  pickupDate: string;
  amount: number;
  status: string;
}

interface ReservationParsed {
  _id: string;
  codContract: string;
  customerName: string;
  installDate: Date;
  pickupDate: Date;
  amount: number;
  status: string;
}

interface ReservationView {
  _id: string;
  codContract: string;
  customerName: string;
  amount: number;
  installDate: Date;
  pickupDate: Date;
  durationDays: number;
  isAnomaly: boolean;
  leftPct: number;
  widthPct: number;
  clippedLeft: boolean;
  clippedRight: boolean;
  dateLabel: string;
}

interface WeekBucket {
  label: string;
  minAvailable: number;
  pct: number;
  colorClass: string;
  isCurrentWeek: boolean;
}

interface DayRangeContract {
  _id: string;
  codContract: string;
  customerName: string;
  amount: number;
}

interface DayRangeRow {
  label: string;
  reserved: number;
  available: number;
  isFull: boolean;
  isFree: boolean;
  contracts: DayRangeContract[];
  expanded: boolean;
}

@Component({
  selector: 'app-accessory-availability',
  templateUrl: './accessory-availability.component.html',
  styleUrls: ['./accessory-availability.component.css'],
})
export class AccessoryAvailabilityComponent implements OnInit {
  @Input() accessory!: { _id: string; description: string; stock: number };

  readonly ANOMALY_THRESHOLD_DAYS = ANOMALY_THRESHOLD_DAYS;

  loading = true;
  errorMsg = '';

  reservations: ReservationView[] = [];
  availableToday = 0;
  reservedToday = 0;
  activeContractsToday = 0;
  nextFullRelease: Date | null = null;
  nextFullReleaseLabel: string | null = null;
  nextFullReleaseShortLabel: string | null = null;
  // El día de recojo el mobiliario sigue ocupado (recién se libera al día
  // siguiente) — ver la nota en `build()`. Esta es la fecha honesta para
  // "a partir de cuándo puedo volver a ofrecer el 100% del stock".
  firstFullyAvailableLabel: string | null = null;

  domainStart = new Date();
  domainDays = DOMAIN_MIN_DAYS;
  todayLeftPct = 0;
  lastOccupiedLeftPct: number | null = null;
  lastOccupiedClipped = false;
  dateTicks: { label: string; leftPct: number }[] = [];

  weekBuckets: WeekBucket[] = [];
  dayRanges: DayRangeRow[] = [];

  constructor(
    public activeModal: NgbActiveModal,
    private modalService: NgbModal,
    private contractService: ContractService,
    private authenticationToken: AuthenticationToken,
    private router: Router
  ) {}

  ngOnInit(): void {
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    this.contractService.getAccessoryReservations(this.accessory._id, headers).subscribe(
      (response: ReservationRaw[]) => {
        this.build(response || []);
        this.loading = false;
      },
      () => {
        this.errorMsg = 'No se pudo cargar la disponibilidad de este mobiliario.';
        this.loading = false;
      }
    );
  }

  irAContratos(): void {
    this.activeModal.close();
    this.router.navigate(['/dashboard/contract']);
  }

  toggleDayRange(row: DayRangeRow): void {
    row.expanded = !row.expanded;
  }

  // Reutiliza el mismo ContractComponent que ya se usa como modal desde el
  // calendario (ver calendar.component.ts openContractModal): ahí el
  // contrato completo ya estaba cargado en memoria, acá lo pedimos porque
  // solo tenemos el id.
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

  private build(raw: ReservationRaw[]): void {
    const today = startOfDay(new Date());
    const stock = this.accessory.stock || 0;

    const parsed: ReservationParsed[] = raw.map((r) => ({
      ...r,
      installDate: this.parseCalendarDay(r.installDate),
      pickupDate: this.parseCalendarDay(r.pickupDate),
    }));

    // ---- Tarjetas resumen ----
    const activeToday = parsed.filter((r) => r.installDate <= today && r.pickupDate >= today);
    this.reservedToday = activeToday.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    this.availableToday = Math.max(stock - this.reservedToday, 0);
    this.activeContractsToday = activeToday.length;
    // Ya vinieron filtradas con pickupDate >= hoy, así que la última fecha
    // de recojo es, honestamente, cuándo termina de estar ocupado TODO lo
    // reservado hoy. Pero ese mismo día el mobiliario TODAVÍA está fuera
    // (se está recogiendo) — el mismo criterio "inclusive" que usa el
    // backend para calcular stock (ver groupAccessoryByDay). El primer día
    // realmente disponible es uno después.
    this.nextFullRelease = parsed.length ? maxDate(parsed.map((r) => r.pickupDate)) : null;
    this.nextFullReleaseLabel = this.nextFullRelease ? format(this.nextFullRelease, "d 'de' MMMM yyyy", { locale: es }) : null;
    this.nextFullReleaseShortLabel = this.nextFullRelease ? format(this.nextFullRelease, 'd MMM', { locale: es }) : null;
    this.firstFullyAvailableLabel = this.nextFullRelease
      ? format(addDays(this.nextFullRelease, 1), "d 'de' MMMM yyyy", { locale: es })
      : null;

    // ---- Ventana de la línea de tiempo ----
    // "Hoy" siempre debe caer dentro de la ventana visible (si no, el
    // marcador HOY queda fuera de pantalla), así que el inicio nunca es
    // posterior a hoy, aunque todas las reservas sean futuras.
    const earliestInstall = parsed.length ? minDate([today, ...parsed.map((r) => r.installDate)]) : today;
    const latestPickup = parsed.length ? maxDate(parsed.map((r) => r.pickupDate)) : addDays(today, DOMAIN_MIN_DAYS);

    this.domainStart = maxDate([earliestInstall, addDays(today, -DOMAIN_PAST_CAP_DAYS)]);
    const rawEnd = maxDate([latestPickup, addDays(today, DOMAIN_MIN_DAYS)]);
    const domainEnd = minDate([rawEnd, addDays(this.domainStart, DOMAIN_MAX_DAYS)]);
    this.domainDays = Math.max(differenceInCalendarDays(domainEnd, this.domainStart), 1);
    this.todayLeftPct = this.pctOf(today);

    // Marca del último día ocupado (misma idea que HOY): si cae más allá de
    // la ventana visible, se ancla al borde derecho y se avisa que sigue.
    if (this.nextFullRelease) {
      this.lastOccupiedClipped = this.nextFullRelease > domainEnd;
      this.lastOccupiedLeftPct = this.pctOf(minDate([this.nextFullRelease, domainEnd]));
    } else {
      this.lastOccupiedClipped = false;
      this.lastOccupiedLeftPct = null;
    }

    this.dateTicks = this.buildDateTicks(domainEnd);

    // ---- Barras de reserva ----
    this.reservations = parsed
      .map((r) => {
        const clippedLeft = r.installDate < this.domainStart;
        const clippedRight = r.pickupDate > domainEnd;
        const barStart = maxDate([r.installDate, this.domainStart]);
        const barEnd = minDate([r.pickupDate, domainEnd]);
        const leftPct = this.pctOf(barStart);
        const widthPct = Math.max(this.pctOf(barEnd) - leftPct, 0.6);
        const durationDays = differenceInCalendarDays(r.pickupDate, r.installDate);

        return {
          _id: r._id,
          codContract: r.codContract,
          customerName: r.customerName,
          amount: Number(r.amount || 0),
          installDate: r.installDate,
          pickupDate: r.pickupDate,
          durationDays,
          isAnomaly: durationDays > ANOMALY_THRESHOLD_DAYS,
          leftPct,
          widthPct,
          clippedLeft,
          clippedRight,
          dateLabel: `${format(r.installDate, 'd MMM', { locale: es })} – ${format(r.pickupDate, 'd MMM', { locale: es })}`,
        } as ReservationView;
      })
      .sort((a, b) => a.installDate.getTime() - b.installDate.getTime());

    // ---- Gráfico semanal de disponibilidad ----
    this.weekBuckets = this.buildWeekBuckets(parsed, stock, domainEnd);

    // ---- Detalle día a día ----
    this.dayRanges = this.buildDayRanges(parsed, stock, domainEnd);
  }

  private activeOnDay<T extends { installDate: Date; pickupDate: Date }>(reservations: T[], day: Date): T[] {
    return reservations.filter((r) => r.installDate <= day && r.pickupDate >= day);
  }

  private reservedOnDay(reservations: { installDate: Date; pickupDate: Date; amount: number }[], day: Date): number {
    return this.activeOnDay(reservations, day).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }

  // El backend manda las fechas como medianoche UTC del día calendario que
  // corresponde (mismo criterio que el resto de la app: `.slice(0,10)`,
  // pipes con `:'UTC'`). `new Date(iso)` + funciones locales de date-fns
  // (`startOfDay`, `format`, etc.) se equivocan de día en cualquier
  // navegador con offset negativo (ej. Lima UTC-5): medianoche UTC del 18
  // cae en la tarde/noche del 17 en hora local. Por eso acá tomamos el
  // "Y-M-D" del ISO tal cual y construimos una fecha LOCAL con esos mismos
  // números — así todo lo que sigue (date-fns, que opera en hora local)
  // sigue operando en el día calendario correcto sin más conversión.
  private parseCalendarDay(iso: string): Date {
    const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private pctOf(date: Date): number {
    const offset = differenceInCalendarDays(date, this.domainStart);
    return Math.min(Math.max((offset / this.domainDays) * 100, 0), 100);
  }

  // Marcas de fecha a lo largo del eje, cada 7/10/14 días según qué tan
  // ancha sea la ventana visible: dan una referencia de orden clara sin
  // amontonar etiquetas cuando la ventana es larga.
  private buildDateTicks(domainEnd: Date): { label: string; leftPct: number }[] {
    const intervalDays = this.domainDays <= 30 ? 7 : this.domainDays <= 60 ? 10 : 14;
    const ticks: { label: string; leftPct: number }[] = [];

    for (let cursor = this.domainStart; cursor <= domainEnd; cursor = addDays(cursor, intervalDays)) {
      ticks.push({ label: format(cursor, 'd MMM', { locale: es }), leftPct: this.pctOf(cursor) });
    }
    return ticks;
  }

  // Semanas de calendario (lunes a domingo), arrancando en la semana en
  // curso — no un rolling de 7 días desde una fecha cualquiera — para que
  // las etiquetas se lean como semanas reales y se identifique cuál es "la
  // semana en curso".
  private buildWeekBuckets(
    reservations: { installDate: Date; pickupDate: Date; amount: number }[],
    stock: number,
    domainEnd: Date
  ): WeekBucket[] {
    const buckets: WeekBucket[] = [];
    const today = startOfDay(new Date());
    let bucketStart = startOfWeek(today, { weekStartsOn: 1 });

    while (bucketStart < domainEnd) {
      const bucketEnd = addDays(bucketStart, 7);
      const bucketLastDay = addDays(bucketEnd, -1);

      let peakReserved = 0;
      for (let day = bucketStart; day < bucketEnd; day = addDays(day, 1)) {
        peakReserved = Math.max(peakReserved, this.reservedOnDay(reservations, day));
      }
      const minAvailable = Math.max(stock - peakReserved, 0);
      const pct = stock > 0 ? Math.min((minAvailable / stock) * 100, 100) : 0;
      const sameMonth = bucketStart.getMonth() === bucketLastDay.getMonth();

      buckets.push({
        label: sameMonth
          ? `${format(bucketStart, 'd', { locale: es })}–${format(bucketLastDay, 'd MMM', { locale: es })}`
          : `${format(bucketStart, 'd MMM', { locale: es })}–${format(bucketLastDay, 'd MMM', { locale: es })}`,
        minAvailable,
        pct,
        colorClass: this.colorClassFor(minAvailable, stock),
        isCurrentWeek: today >= bucketStart && today <= bucketLastDay,
      });

      bucketStart = bucketEnd;
    }
    return buckets;
  }

  // Detalle exacto por día: recorre cada día de la ventana visible y agrupa
  // los días consecutivos con la MISMA cantidad reservada en una sola fila
  // ("15–16 set", no un día por fila) — así queda compacto incluso con
  // ventanas largas, porque casi todos los días "no cambian nada" respecto
  // al anterior; solo un inicio/fin de reserva mueve el número.
  private buildDayRanges(reservations: ReservationParsed[], stock: number, domainEnd: Date): DayRangeRow[] {
    const rows: DayRangeRow[] = [];
    let segmentStart: Date | null = null;
    let segmentActive: ReservationParsed[] = [];
    let segmentSignature = '';

    // Se agrupa por el CONJUNTO de contratos activos (sus ids), no solo por
    // la suma reservada: dos combinaciones distintas de contratos pueden
    // sumar lo mismo (uno termina justo cuando otro de igual cantidad
    // empieza) y ahí sí importa no mezclarlos en una sola fila.
    for (let day = this.domainStart; day <= domainEnd; day = addDays(day, 1)) {
      const active = this.activeOnDay(reservations, day);
      const signature = active.map((r) => r._id).sort().join('|');
      if (segmentStart === null) {
        segmentStart = day;
        segmentActive = active;
        segmentSignature = signature;
      } else if (signature !== segmentSignature) {
        rows.push(this.makeDayRangeRow(segmentStart, addDays(day, -1), segmentActive, stock));
        segmentStart = day;
        segmentActive = active;
        segmentSignature = signature;
      }
    }
    if (segmentStart !== null) {
      rows.push(this.makeDayRangeRow(segmentStart, domainEnd, segmentActive, stock));
    }
    return rows;
  }

  private makeDayRangeRow(start: Date, end: Date, active: ReservationParsed[], stock: number): DayRangeRow {
    const reserved = active.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const available = Math.max(stock - reserved, 0);
    const sameDay = start.getTime() === end.getTime();
    const sameMonth = start.getMonth() === end.getMonth();
    const label = sameDay
      ? format(start, 'd MMM', { locale: es })
      : sameMonth
        ? `${format(start, 'd', { locale: es })}–${format(end, 'd MMM', { locale: es })}`
        : `${format(start, 'd MMM', { locale: es })}–${format(end, 'd MMM', { locale: es })}`;

    return {
      label,
      reserved,
      available,
      isFull: available <= 0,
      isFree: reserved <= 0,
      expanded: false,
      contracts: active.map((r) => ({
        _id: r._id,
        codContract: r.codContract,
        customerName: r.customerName,
        amount: Number(r.amount || 0),
      })),
    };
  }

  get hasAnomaly(): boolean {
    return this.reservations.some((r) => r.isAnomaly);
  }

  private colorClassFor(available: number, stock: number): string {
    if (stock <= 0) return 'aa-bar-danger';
    const ratio = available / stock;
    if (available >= stock) return 'aa-bar-success';
    if (ratio < 0.25) return 'aa-bar-danger';
    if (ratio < 0.55) return 'aa-bar-warning';
    return 'aa-bar-ok';
  }
}
