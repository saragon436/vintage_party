import { HttpHeaders } from '@angular/common/http';
import { Component, OnInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service';
import { ContractService } from '../Servicios/contract.service';
import { addDays, isTuesday } from 'date-fns';
import * as XLSX from 'xlsx';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

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
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {
  @ViewChild('table') table!: ElementRef;

  week: Date[] = [];
  contract: Contract[] = [];

  /**
   * Rutas de calle (sin almacén)
   */
  dailySchedules: { [dateKey: string]: DailyTask[] } = {};

  /**
   * Entregas en almacén por fecha
   */
  storeDeliveries: { [dateKey: string]: Contract[] } = {};

  /**
   * Recojos en almacén por fecha
   */
  storePickups: { [dateKey: string]: Contract[] } = {};

  constructor(
    private route: Router,
    private cd: ChangeDetectorRef,
    private authenticationToken: AuthenticationToken,
    private contractService: ContractService
  ) {}

  public nombresDias: string[] = [
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
    'Lunes'
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
    'Diciembre'
  ];

  ngOnInit(): void {
    const currentDate = new Date();
    this.week = this.calculateWeek(currentDate);
    this.findContract();
  }

  exportToExcel(): void {
    const tableToExport = this.table.nativeElement;
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(tableToExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
    XLSX.writeFile(wb, 'Programacion.xlsx');
  }

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
        this.buildDailySchedules(); // ← construye rutas y almacén
        this.cd.detectChanges();
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
            routePos: c.order || 0
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
            routePos: c.orderPickup || 0
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

  // yyyy-MM-dd usando hora local (sin UTC)
  getDayKey(day: Date): string {
    const year = day.getFullYear();
    const month = (day.getMonth() + 1).toString().padStart(2, '0');
    const date = day.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${date}`;
  }

  // Rutas de calle (sin almacén)
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

 // Total de filas del día (ruta + header ALMACÉN + filas de almacén)
getTotalRowsForDay(day: Date): number {
  const rutas = this.getDailyScheduleForDay(day).length;
  const storeD = this.getStoreDeliveriesForDay(day).length;
  const storeP = this.getStorePickupsForDay(day).length;

  const filasAlmacen = storeD + storeP;
  const headerAlmacen = filasAlmacen > 0 ? 1 : 0; // 1 fila que dice "ALMACÉN"

  const total = rutas + filasAlmacen + headerAlmacen;
  return total > 0 ? total : 1;
}

  // ===========================
  //  Drag & Drop ruta calle
  // ===========================
  dropDailySchedule(day: Date, event: CdkDragDrop<DailyTask[]>) {
    const key = this.getDayKey(day);
    const tasks = this.dailySchedules[key];

    if (!tasks) {
      return;
    }

    moveItemInArray(tasks, event.previousIndex, event.currentIndex);

    tasks.forEach((task, index) => {
      const newPos = index + 1;
      task.routePos = newPos;

      if (task.type === 'ENTREGA') {
        task.contract.order = newPos;
      } else {
        task.contract.orderPickup = newPos;
      }
    });

    this.saveDailyOrder(tasks);
  }

  private saveDailyOrder(tasks: DailyTask[]) {
    const headers = new HttpHeaders().set(
      'Authorization',
      'Bearer ' + this.authenticationToken.myValue
    );

    tasks.forEach((task) => {
      const payload: any = {
        _id: task.contract._id,
        onAccount: []
      };

      if (task.type === 'ENTREGA') {
        payload.order = task.contract.order;
      } else {
        payload.orderPickup = task.contract.orderPickup;
      }

      this.contractService.updateContract(payload, headers).subscribe(
        () => {
          console.log(`Ruta actualizada para contrato ${task.contract._id}`);
        },
        (error) => {
          if (error.status === 401) {
            console.log('Credenciales incorrectas');
            this.route.navigate(['/app-login']);
          } else {
            console.log('Error desconocido en el login');
          }
        }
      );
    });
  }

  // ===========================
  //  Updates varios
  // ===========================
  onOptionChange(id: string, isSelected: boolean) {
    const payload = {
      _id: id,
      isSelected,
      onAccount: []
    };
    this.updateSimple(payload);
  }

  onOptionChangePickup(id: string, isSelectedPickup: boolean) {
    const payload = {
      _id: id,
      isSelectedPickup,
      onAccount: []
    };
    this.updateSimple(payload);
  }

  onOptionChangeMobility(id: string, mobility: string) {
    const payload = {
      _id: id,
      mobility,
      onAccount: []
    };
    this.updateSimple(payload);
  }

  onOptionChangeMobilityPickup(id: string, mobilityPickup: string) {
    const payload = {
      _id: id,
      mobilityPickup,
      onAccount: []
    };
    this.updateSimple(payload);
  }

  saveHour(id: string, hourIni: string) {
    const payload = {
      _id: id,
      hourIni,
      onAccount: []
    };
    this.updateSimple(payload);
  }

  saveHourFin(id: string, hourFin: string) {
    const payload = {
      _id: id,
      hourFin,
      onAccount: []
    };
    this.updateSimple(payload);
  }

  saveHourPickup(id: string, hourIniPickup: string) {
    const payload = {
      _id: id,
      hourIniPickup,
      onAccount: []
    };
    this.updateSimple(payload);
  }

  saveHourFinPickup(id: string, hourFinPickup: string) {
    const payload = {
      _id: id,
      hourFinPickup,
      onAccount: []
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
        this.findContract(); // recarga y reconstruye rutas/almacén
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
}
