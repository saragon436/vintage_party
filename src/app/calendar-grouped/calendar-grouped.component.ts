import { HttpHeaders } from '@angular/common/http';
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service';
import { ContractService } from '../Servicios/contract.service';
import { addDays, isTuesday } from 'date-fns';
import * as XLSX from 'xlsx';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ContractComponent } from '../contract/contract.component';

interface Contract {
  _id: string;
  codContract: string;
  createDate: string;
  installDate: string;
  eventDate: string;
  pickupDate: string;
  high: string;
  stock: number;
  status: string;
  address: string;
  district: string;
  hourIni: string;
  hourFin: string;
  hourIniPickup: string;
  hourFinPickup: string;
  mobility: string;
  mobilityPickup: string;
  order: number;
  orderPickup: number;
  comment: string;
  listAccessories: [];
  onAccount: [];
  customer: { name: string; documentNumber: string; phone: string };
  userCreate: { userName: string };
  isSelected: boolean;
  isSelectedPickup: boolean;
}

type TaskType = 'ENTREGA' | 'RECOJO';

interface DailyTask {
  type: TaskType;
  contract: Contract;
  routePos: number; // posición en la ruta del día
}

@Component({
  selector: 'app-calendar-grouped',
  templateUrl: './calendar-grouped.component.html',
  styleUrls: ['./calendar-grouped.component.css'],
})
export class CalendarGroupedComponent implements OnInit {
  @ViewChild('table') table!: ElementRef;

  week: Date[] = [];
  contract: Contract[] = [];

  /**
   * Rutas de calle (sin almacén)
   * key: yyyy-MM-dd
   */
  dailySchedules: { [dateKey: string]: DailyTask[] } = {};

  /**
   * Entregas en almacén por fecha
   * key: yyyy-MM-dd
   */
  storeDeliveries: { [dateKey: string]: Contract[] } = {};

  /**
   * Recojos en almacén por fecha
   * key: yyyy-MM-dd
   */
  storePickups: { [dateKey: string]: Contract[] } = {};

  public nombresDias: string[] = [
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
    'Lunes',
  ];

  public nombresMeses: string[] = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  constructor(
    private route: Router,
    private authenticationToken: AuthenticationToken,
    private contractService: ContractService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    const currentDate = new Date();
    this.week = this.calculateWeek(currentDate);
    this.findContract();
  }

  // ===========================
  //  Excel
  // ===========================
  exportToExcel(): void {
    if (!this.table) {
      return;
    }
    const tableToExport = this.table.nativeElement;
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(tableToExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Programacion');
    XLSX.writeFile(wb, 'Programacion_Agrupada.xlsx');
  }

  // ===========================
  //  Calcular semana (Martes - Lunes)
  // ===========================
  calculateWeek(currentDate: Date): Date[] {
    let startOfWeek: Date = currentDate;
    while (!isTuesday(startOfWeek)) {
      startOfWeek = addDays(startOfWeek, -1);
    }

    const week: Date[] = [startOfWeek];
    for (let i = 1; i < 7; i++) {
      const nextDay: Date = addDays(startOfWeek, i);
      week.push(nextDay);
    }
    return week;
  }

calcularNext() {
  if (this.week && this.week.length > 0) {
    const lastDayOfWeek = this.week[this.week.length - 1];
    const nextWeekStartDate = new Date(lastDayOfWeek);
    nextWeekStartDate.setDate(lastDayOfWeek.getDate() + 1);
    this.week = this.calculateWeek(nextWeekStartDate);
  } else {
    const currentDate = new Date();
    this.week = this.calculateWeek(currentDate);
  }

  // 🔁 Recargar programación para asegurar refresco
  this.findContract();
}

calcularbefore() {
  if (this.week && this.week.length > 0) {
    const firstDayOfWeek = this.week[0];
    const previousWeekStartDate = new Date(firstDayOfWeek);
    previousWeekStartDate.setDate(firstDayOfWeek.getDate() - 7);
    this.week = this.calculateWeek(previousWeekStartDate);
  } else {
    const currentDate = new Date();
    this.week = this.calculateWeek(currentDate);
  }

  // 🔁 Recargar programación
  this.findContract();
}


  // ===========================
  //  Carga contratos desde API
  // ===========================
  findContract() {
    const headers = new HttpHeaders().set(
      'Authorization',
      'Bearer ' + this.authenticationToken.myValue
    );

    this.contractService.listContract(headers).subscribe(
      (contract) => {
        this.contract = contract;
        this.buildDailySchedules(); // construye rutas y almacén
      },
      (error) => {
        if (error.status === 401) {
          console.log('usuario o claves incorrectos');
          this.route.navigate(['/app-login']);
        } else {
          console.log('error desconocido en el login');
        }
      }
    );
  }

  // ===========================
  //  Construir rutas + almacén
  // ===========================
  private buildDailySchedules() {
    this.dailySchedules = {};
    this.storeDeliveries = {};
    this.storePickups = {};

    for (const c of this.contract) {
      // ENTREGAS
      if (c.installDate) {
        const dateKey = c.installDate.slice(0, 10); // yyyy-MM-dd

        if (c.district === 'Almacen') {
          if (!this.storeDeliveries[dateKey]) {
            this.storeDeliveries[dateKey] = [];
          }
          this.storeDeliveries[dateKey].push(c);
        } else {
          if (!this.dailySchedules[dateKey]) {
            this.dailySchedules[dateKey] = [];
          }
          this.dailySchedules[dateKey].push({
            type: 'ENTREGA',
            contract: c,
            routePos: c.order || 0,
          });
        }
      }

      // RECOJOS
      if (c.pickupDate) {
        const dateKey = c.pickupDate.slice(0, 10);

        if (c.district === 'Almacen') {
          if (!this.storePickups[dateKey]) {
            this.storePickups[dateKey] = [];
          }
          this.storePickups[dateKey].push(c);
        } else {
          if (!this.dailySchedules[dateKey]) {
            this.dailySchedules[dateKey] = [];
          }
          this.dailySchedules[dateKey].push({
            type: 'RECOJO',
            contract: c,
            routePos: c.orderPickup || 0,
          });
        }
      }
    }

    // Ajustar orden en cada fecha para la ruta de calle
    Object.keys(this.dailySchedules).forEach((dateKey) => {
      const tasks = this.dailySchedules[dateKey];
      const hasAnyOrder = tasks.some((t) => t.routePos && t.routePos > 0);

      if (!hasAnyOrder) {
        tasks.forEach((t, index) => (t.routePos = index + 1));
      } else {
        tasks.sort((a, b) => (a.routePos || 0) - (b.routePos || 0));
      }
    });
  }

  // ===========================
  //  Helpers de fecha y grupos
  // ===========================
  // yyyy-MM-dd usando hora local
  getDayKey(day: Date): string {
    const year = day.getFullYear();
    const month = (day.getMonth() + 1).toString().padStart(2, '0');
    const date = day.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${date}`;
  }

  // Rutas de calle (sin almacén) para la tabla principal
  getDailyScheduleForDay(day: Date): DailyTask[] {
    const key = this.getDayKey(day);
    return this.dailySchedules[key] || [];
  }

  // Entregas en almacén
  getStoreDeliveriesForDay(day: Date): Contract[] {
    const key = this.getDayKey(day);
    return this.storeDeliveries[key] || [];
  }

  // Recojos en almacén
  getStorePickupsForDay(day: Date): Contract[] {
    const key = this.getDayKey(day);
    return this.storePickups[key] || [];
  }

  // Total de filas del día en la tabla principal (ruta + header ALMACÉN + filas de almacén)
  getTotalRowsForDay(day: Date): number {
  const deliveries = this.getDeliveriesOnRouteForDay(day).length;
  const pickups   = this.getPickupsOnRouteForDay(day).length;
  const storeD    = this.getStoreDeliveriesForDay(day).length;
  const storeP    = this.getStorePickupsForDay(day).length;

  // Bloque ALMACÉN: 1 cabecera + filas de entrega + filas de recojo
  const almacenBlock = storeD + storeP > 0 ? 1 + storeD + storeP : 0;

  // Filas "de contenido" (sin contar la fila que lleva la celda de la fecha)
  const rowsWithoutDate = deliveries + pickups + almacenBlock;

  // +1 por la fila donde está la celda de la fecha
  const total = rowsWithoutDate + 1;
  return total > 0 ? total : 1;
}

  // ¿Hay algo para mostrar (ruta o almacén) en el día? (segunda tabla)
hasAnyGroupedDataForDay(day: Date): boolean {
  const deliveries = this.getDeliveriesOnRouteForDay(day).length;
  const pickups   = this.getPickupsOnRouteForDay(day).length;
  const storeD    = this.getStoreDeliveriesForDay(day).length;
  const storeP    = this.getStorePickupsForDay(day).length;

  return deliveries + pickups + storeD + storeP > 0;
}

  // ¿Hay algo "en ruta" ese día? (segunda tabla)
  hasAnyRouteForDay(day: Date): boolean {
    return this.getDailyScheduleForDay(day).length > 0;
  }

  // Tareas EN RUTA por tipo (ENTREGA o RECOJO) para la segunda tabla
  getRouteTasksByType(day: Date, type: TaskType): DailyTask[] {
    return this.getDailyScheduleForDay(day)
      .filter((t) => t.type === type)
      .sort((a, b) => (a.routePos || 0) - (b.routePos || 0));
  }

  // ===========================
  //  Actualizaciones simples
  // ===========================
  onOptionChange(id: string, isSelected: boolean) {
    const payload = {
      _id: id,
      isSelected,
      onAccount: [],
    };
    this.updateSimple(payload);
  }

  onOptionChangePickup(id: string, isSelectedPickup: boolean) {
    const payload = {
      _id: id,
      isSelectedPickup,
      onAccount: [],
    };
    this.updateSimple(payload);
  }

  saveHour(id: string, hourIni: string) {
    const payload = {
      _id: id,
      hourIni,
      onAccount: [],
    };
    this.updateSimple(payload);
  }

  saveHourFin(id: string, hourFin: string) {
    const payload = {
      _id: id,
      hourFin,
      onAccount: [],
    };
    this.updateSimple(payload);
  }

  saveHourPickup(id: string, hourIniPickup: string) {
    const payload = {
      _id: id,
      hourIniPickup,
      onAccount: [],
    };
    this.updateSimple(payload);
  }

  saveHourFinPickup(id: string, hourFinPickup: string) {
    const payload = {
      _id: id,
      hourFinPickup,
      onAccount: [],
    };
    this.updateSimple(payload);
  }

  private updateSimple(payload: any) {
    const headers = new HttpHeaders().set(
      'Authorization',
      'Bearer ' + this.authenticationToken.myValue
    );

    this.contractService.updateContract(payload, headers).subscribe(
      () => {
        // recargar para mantener sincronizadas ambas tablas
        this.findContract();
      },
      (error) => {
        if (error.status === 401) {
          console.log('usuario o claves incorrectos');
          this.route.navigate(['/app-login']);
        } else {
          console.log('error desconocido en el login');
        }
      }
    );
  }

  // ===========================
  //  Modal de contrato
  // ===========================
  openContractModal(contractId: string) {
    // const contrato = this.contract.find(c => c._id === contractId);
    // if (!contrato) {
    //   console.warn('Contrato no encontrado para id', contractId);
    //   return;
    // }
    // const modalRef = this.modalService.open(ContractComponent, {
    //   size: 'xl',
    //   scrollable: true,
    //   backdrop: 'static',
    // });

    // // Estos @Input deben existir en tu ContractComponent
    // (modalRef.componentInstance as any).modalMode = true;
    // (modalRef.componentInstance as any).contractIdFromCalendar = contractId;

    // modalRef.result
    //   .then(() => {
    //     // al cerrar, recargamos programación
    //     this.findContract();
    //   })
    //   .catch(() => {
    //     // al cerrar por X o fondo, también recargamos por si cambió algo
    //     this.findContract();
    //   });
    const contrato = this.contract.find(c => c._id === contractId);
    if (!contrato) {
      console.warn('Contrato no encontrado para id', contractId);
      return;
    }

    const modalRef = this.modalService.open(ContractComponent, {
      size: 'xl',
      scrollable: true,
      centered: true
    });

    modalRef.componentInstance.initialContract = contrato;

    // Opcional: recargar programación al cerrar
    modalRef.closed.subscribe(() => this.findContract());
    modalRef.dismissed.subscribe(() => this.findContract());
  }

  // Devuelve todas las tareas (ENTREGA) en ruta para ese día
getDeliveriesOnRouteForDay(day: Date): DailyTask[] {
  return (this.getDailyScheduleForDay(day) || []).filter(
    (t) => t.type === 'ENTREGA'
  );
}

// Devuelve todas las tareas (RECOJO) en ruta para ese día
getPickupsOnRouteForDay(day: Date): DailyTask[] {
  return (this.getDailyScheduleForDay(day) || []).filter(
    (t) => t.type === 'RECOJO'
  );
}

getRowSpanForDay(day: Date): number {
  const deliveriesRoute = this.getDeliveriesOnRouteForDay(day).length;
  const pickupsRoute    = this.getPickupsOnRouteForDay(day).length;
  const storeDeliveries = this.getStoreDeliveriesForDay(day).length;
  const storePickups    = this.getStorePickupsForDay(day).length;

  // 4 filas de cabecera de grupo (ruta entrega, ruta recojo, almacén entrega, almacén recojo)
  const headerRows = 4;

  const total =
    deliveriesRoute +
    pickupsRoute +
    storeDeliveries +
    storePickups +
    headerRows;

  return total > 0 ? total : 1;
}

hasAnyDataForDay(day: Date): boolean {
  return (
    this.getDeliveriesOnRouteForDay(day).length > 0 ||
    this.getPickupsOnRouteForDay(day).length > 0 ||
    this.getStoreDeliveriesForDay(day).length > 0 ||
    this.getStorePickupsForDay(day).length > 0
  );
}


}
