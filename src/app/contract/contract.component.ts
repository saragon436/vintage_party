import { HttpHeaders } from '@angular/common/http';
import { Component, Input, Optional  } from '@angular/core';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  Observable,
  of,
  Subject,
  takeUntil,
} from 'rxjs';
import { CustomerService } from '../Servicios/customer.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service';
import { NgbModal, ModalDismissReasons, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CustomerComponent } from '../customer/customer.component';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AccessoryService } from '../Servicios/accessory.service';
import { ContractService } from '../Servicios/contract.service';
import { NgSelectComponent } from '@ng-select/ng-select/public-api';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import { distritosLima } from '../utils/distritos-lima';
import { environment } from 'src/environments/environment';
import { ConfirmDialogService } from '../shared/confirm-dialog/confirm-dialog.service';
import { AccessoryAvailabilityComponent } from '../accessory/accessory-availability/accessory-availability.component';

interface Customer {
  _id?: string;
  name: string;
  documentNumber: string;
  address: string;
  phone: string;
}

interface PendingContractSummary {
  _id: string;
  codContract: string;
  eventDate: string;
  status: string;
  saldo: number;
}

interface PendingBalance {
  hasPending: boolean;
  total: number;
  contracts: PendingContractSummary[];
}

interface Accessory {
  _id: string;
  description: string;
  color: string;
  design: string;
  large: string;
  bottom: string;
  high: string;
  width: string;
  diameter: string;
  stock: number;
  price: number;
  items?: any[];
  status: boolean;
  imageUrl?: string;
}

interface onAccount {
  number: string;
  amount: number;
  createdDate: string;
}

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
  comment: string;
  listAccessories: any[];
  onAccount: any[];
  customer: { name: string; documentNumber: string; phone: string };
  userCreate: { userName: string };
  quotationCod?: string;
}

@Component({
  selector: 'app-contract',
  templateUrl: './contract.component.html',
  styleUrls: ['./contract.component.css'],
})
export class ContractComponent {
  // 👇 NUEVO: cuando se usa en modal, el calendar pasa aquí el contrato seleccionado
  @Input() initialContract?: Contract | null;


  fechaActual: string = '';
  fechaCreacion: string = '';

  // 🔹 ÚNICA lista que se muestra en la tabla
  contract: Contract[] = [];
  contract2: Contract[] = [];

  form: FormGroup;
  customer$: Observable<Customer[]>;
  accessory$: Observable<Accessory[]>;
  public unsubscribe: Subject<void>;

  total = 0;
  totalOnAccount = 0;
  totalBalance = 0;
  onAccount = 0;

  customerName = '';
  numberContract = '';
  cliente: any;
  idItemDelete = '';
  apiUrl = environment.apiUrl;
  // Cantidad que este contrato ya tenía de cada mobiliario al abrirlo para
  // editar (id de accesorio -> cantidad), junto con las fechas de esa reserva.
  // Sirve para calcular el techo real al reagregar/aumentar un ítem que este
  // mismo contrato ya tenía asignado, sin permitir pasarse del total
  // disponible de verdad. Solo aplica si las fechas NO cambiaron: esa
  // cantidad estaba reservada para esas fechas puntuales, no para otras.
  originalAccessoryAmounts: Map<string, number> = new Map();
  originalInstallDate = '';
  originalPickupDate = '';
  closeResult: string = '';
  searchValue: string = '';
  selectedCustomer = {};

  // 👇 Aviso de saldo pendiente al seleccionar cliente (solo informativo,
  // no bloquea guardar/actualizar el contrato).
  pendingBalance: PendingBalance | null = null;
  loadingPendingBalance = false;
  showPendingDetail = false;
  // ids de clientes con saldo pendiente, para marcarlos en el propio
  // desplegable (antes de elegir uno) — ver loadPendingCustomerIds().
  pendingCustomerIds = new Set<string>();
  phone = '';
  documentNumber = '';
  operacion_1 = '';
  A_cuenta_1 = 0.0;
  listaDistritos = distritosLima;
  distritoSeleccionado: string = '';

  // 🔹 Año actual y lista de años
  currentYear = new Date().getFullYear();
  selectedYear = this.currentYear;
  years: number[] = [];

  // 🔹 Filtro por estado
  statuses: string[] = ['Por Pagar', 'En Almacen', 'Pagado', 'Archivado'];
  selectedStatus: string = 'Por Pagar';

  // 🔹 Título dinámico de la lista
  listTitle: string = 'Contratos recientes (últimos 90 días)';

  condicion = false;
  mostrarBotones = false;
  incluirImagenImpresion = false; // check "¿Desea incluir imagen?" antes de imprimir el contrato
  codUser = '';
  _idContrat = '';
  A_cuenta_fecha_1 = '';
  selectStatus = '';
  A_cuenta_2 = 0;
  isDisabled = false;
  isSaving = false;
  listarDetalle = false;

  constructor(
    private modalService: NgbModal,
    private customerService: CustomerService,
    private accessoryService: AccessoryService,
    private contractService: ContractService,
    private authenticationToken: AuthenticationToken,
    private route: Router,
    private activatedRoute: ActivatedRoute,
    //ublic activeModal: NgbActiveModal,  // 👈 aquí
    @Optional() public activeModal: NgbActiveModal,   // 👈 OPCIONAL
    private formBuilder: FormBuilder,
    private confirmDialog: ConfirmDialogService
  ) {
    this.unsubscribe = new Subject();
    this.customer$ = new Observable<Customer[]>();
    this.accessory$ = new Observable<Accessory[]>();

    this.form = this.formBuilder.group({
      _id: new FormControl(''),
      search: new FormControl(''),
      searchAccessory: new FormControl(''),
      customer: new FormControl('', Validators.required),
      onAccountvalues: new FormControl(0, Validators.required),
      saldo: new FormControl(0, Validators.required),
      createDate: new FormControl('', Validators.required),
      installDate: new FormControl('', Validators.required),
      eventDate: new FormControl('', Validators.required),
      pickupDate: new FormControl('', Validators.required),
      address: new FormControl('', Validators.required),
      district: new FormControl('', Validators.required),
      hourIni: new FormControl('', Validators.required),
      hourFin: new FormControl('', Validators.required),
      hourIniPickup: new FormControl('', Validators.required),
      hourFinPickup: new FormControl('', Validators.required),
      amount: new FormControl(0, Validators.required),
      // No obligatorio: un contrato creado desde una cotización hereda su
      // comentario (a menudo vacío), y no hay razón de negocio para bloquear
      // guardar/actualizar solo por no tener un comentario.
      comment: new FormControl(''),
      price: new FormControl(0, Validators.required),
      listAccessories: this.formBuilder.array([]),
      onAccount: this.formBuilder.array([]),
    });
    
  }

  // ==========================
  // Helpers de arrays del form
  // ==========================

  get arrayAccessory(): FormArray {
    return this.form.controls['listAccessories'] as FormArray;
  }

  get arrayValuesAccessory(): any[] {
    return this.arrayAccessory.value as any[];
  }

  get arrayOnAccount(): FormArray {
    return this.form.controls['onAccount'] as FormArray;
  }

  get arrayValuesOnAccount(): any[] {
    return this.arrayOnAccount.value as any[];
  }

  // ==========================
  // Init
  // ==========================

  ngOnInit() {
    this.buildYears();
    this.selectedYear = this.currentYear;
    this.selectedStatus = 'Por Pagar';

    this.findClient();
    this.loadPendingCustomerIds();
    this.searchStock();

    // 👇 AQUÍ DECIDIMOS el modo:
    // - Si viene un ?open=<id> en la URL (ej. tras generar el contrato desde
    //   una cotización) -> abrir ese contrato directamente en edición
    // - Si viene desde calendar (modal) -> cargamos ese contrato directamente
    // - Si NO, se comporta como siempre: lista de recientes
    const openId = this.activatedRoute.snapshot.queryParamMap.get('open');
    if (openId) {
      const headers = new HttpHeaders().set(
        'Authorization',
        'Bearer ' + this.authenticationToken.myValue
      );
      this.contractService.listContractById(openId, headers).subscribe(
        (response) => this.cargarContratoDesdeObjeto(response),
        () => this.loadRecentContracts()
      );
    } else if (this.initialContract) {
      this.cargarContratoDesdeObjeto(this.initialContract);
    } else {
      this.loadRecentContracts(); // por defecto, contratos de últimos 90 días
    }
  }

  buildYears(): void {
    this.years = [];
    for (let i = 1; i <= 5; i++) {
      this.years.push(this.currentYear - i);
    }
  }

  // ==========================
  // Utilidades
  // ==========================

  finDate() {
    const fecha = new Date();
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear().toString();
    this.fechaActual = `${anio}-${mes}-${dia}`;
    this.form.controls['createDate'].setValue(this.fechaActual);
  }

  private sortContracts(contracts: Contract[]): Contract[] {
    return (contracts || [])
      .filter(
        (contract: Contract) =>
          contract.codContract && typeof contract.codContract === 'string'
      )
      .sort((a: Contract, b: Contract) => {
        const aPart = parseInt(a.codContract.split('-')[0] || '0', 10);
        const bPart = parseInt(b.codContract.split('-')[0] || '0', 10);

        if (aPart !== bPart) {
          return bPart - aPart;
        } else {
          return b.codContract.localeCompare(a.codContract);
        }
      });
  }

  limpiar() {
    this.customer$ = new Observable<Customer[]>();
    this.accessory$ = new Observable<Accessory[]>();
    this.form = this.formBuilder.group({
      _id: new FormControl(''),
      search: new FormControl(''),
      searchAccessory: new FormControl(''),
      customer: new FormControl('', Validators.required),
      onAccountvalues: new FormControl(0, Validators.required),
      saldo: new FormControl(0, Validators.required),
      installDate: new FormControl('', Validators.required),
      eventDate: new FormControl('', Validators.required),
      createDate: new FormControl('', Validators.required),
      pickupDate: new FormControl('', Validators.required),
      amount: new FormControl(0, Validators.required),
      // No obligatorio: un contrato creado desde una cotización hereda su
      // comentario (a menudo vacío), y no hay razón de negocio para bloquear
      // guardar/actualizar solo por no tener un comentario.
      comment: new FormControl(''),
      address: new FormControl('', Validators.required),
      district: new FormControl('', Validators.required),
      hourIni: new FormControl('', Validators.required),
      hourFin: new FormControl('', Validators.required),
      hourIniPickup: new FormControl('', Validators.required),
      hourFinPickup: new FormControl('', Validators.required),
      price: new FormControl(0, Validators.required),
      listAccessories: this.formBuilder.array([]),
      onAccount: this.formBuilder.array([]),
    });
    this.totalBalance = 0;
    this._idContrat = '';
    this.fechaCreacion = '';
    this.numberContract = '';
    this.customerName = '';
    this.phone = '';
    this.documentNumber = '';
    this.selectStatus = '';
    this.originalAccessoryAmounts.clear();
    this.originalInstallDate = '';
    this.originalPickupDate = '';
    this.pendingBalance = null;
    this.showPendingDetail = false;
  }

  // ==========================
  // Carga de datos
  // ==========================

  findClient() {
    const headers = new HttpHeaders().set(
      'Authorization',
      'Bearer ' + this.authenticationToken.myValue
    );
    this.customer$ = this.customerService.listCustomer(headers);
  }

  // 👇 Trae de una sola vez qué clientes tienen saldo pendiente, para
  // marcarlos en el propio desplegable antes de elegir uno.
  loadPendingCustomerIds() {
    const headers = new HttpHeaders().set(
      'Authorization',
      'Bearer ' + this.authenticationToken.myValue
    );
    this.contractService.getCustomerIdsWithPendingBalance(headers).subscribe({
      next: (result) => {
        this.pendingCustomerIds = new Set(result?.customerIds || []);
      },
      error: () => {
        this.pendingCustomerIds = new Set();
      },
    });
  }

  hasPendingDebt(item: any): boolean {
    return !!item?._id && this.pendingCustomerIds.has(item._id);
  }

  // 👇 Se dispara al elegir un cliente en el ng-select (o al cargar un
  // contrato existente para editar). Solo informa: nunca bloquea guardar.
  onCustomerChange(item: any) {
    this.pendingBalance = null;
    this.showPendingDetail = false;

    const customerId = item?._id || item?.id;
    if (!customerId) {
      return;
    }

    this.loadingPendingBalance = true;
    const headers = new HttpHeaders().set(
      'Authorization',
      'Bearer ' + this.authenticationToken.myValue
    );
    this.contractService.getPendingBalanceByCustomer(customerId, headers).subscribe({
      next: (result) => this.applyPendingBalance(result),
      error: () => {
        this.loadingPendingBalance = false;
        this.pendingBalance = null;
      },
    });
  }

  // Si estamos editando un contrato, ese mismo contrato puede venir en la
  // respuesta (es el que tiene el saldo pendiente) — lo excluimos para no
  // avisar sobre el contrato que ya se está editando.
  private applyPendingBalance(result: PendingBalance) {
    this.loadingPendingBalance = false;
    const contracts = (result?.contracts || []).filter(
      (c) => c._id !== this._idContrat
    );
    const total = contracts.reduce((sum, c) => sum + (c.saldo || 0), 0);
    this.pendingBalance = { hasPending: contracts.length > 0, total, contracts };
  }

  togglePendingDetail() {
    this.showPendingDetail = !this.showPendingDetail;
  }

  // 👇 Buscador de cliente sin resultados -> abrir CustomerComponent en
  // modo alta rápida (ver customer.component.ts: quickAddName/activeModal).
  openAddCustomerModal(searchTerm: string) {
    const modalRef = this.modalService.open(CustomerComponent, { centered: true });
    modalRef.componentInstance.quickAddName = searchTerm || '';

    modalRef.result.then(
      (createdCustomer) => {
        if (!createdCustomer) {
          return;
        }
        const headers = new HttpHeaders().set(
          'Authorization',
          'Bearer ' + this.authenticationToken.myValue
        );
        this.customerService.listCustomer(headers).subscribe((list) => {
          const customers = list || [];
          this.customer$ = of(customers);
          const match =
            customers.find((c: Customer) => c._id === createdCustomer._id) ||
            createdCustomer;
          this.form.get('customer')?.setValue(match);
          this.onCustomerChange(match);
        });
      },
      () => {
        // modal cerrado sin guardar: no hacer nada
      }
    );
  }

  // 🔹 contratos recientes (últimos 90 días)
  loadRecentContracts(): void {
    const headers = new HttpHeaders().set(
      'Authorization',
      'Bearer ' + this.authenticationToken.myValue
    );

    this.contractService.getRecentContracts(headers).subscribe(
      (contracts: Contract[]) => {
        this.contract = this.sortContracts(contracts);
        this.listTitle = `Contratos recientes (últimos 90 días) [${this.contract.length}]`;
      },
      (error) => {
        console.error('Error obteniendo contratos recientes', error);
        if (error.status === 401) {
          this.route.navigate(['/app-login']);
        }
      }
    );
  }

  // 🔹 contratos por año + estado (solo se ejecuta al dar clic en "Aplicar filtros")
  findContract(
    year: number = this.selectedYear,
    status: string = this.selectedStatus
  ) {
    const headers = new HttpHeaders().set(
      'Authorization',
      'Bearer ' + this.authenticationToken.myValue
    );
    console.log('Consultando contratos del año: ', year, ' estado: ', status);

    this.contractService
      .getContractsByYearAndStatus(year, status, headers)
      .pipe(map((contracts: Contract[]) => this.sortContracts(contracts)))
      .subscribe(
        (contracts: Contract[]) => {
          this.contract = contracts;
          this.listTitle = `Contratos ${status} - ${year} (${this.contract.length})`;
          console.log('contract ', this.contract);
        },
        (error) => {
          if (error.status === 401) {
            console.log('usuario o claves incorrectos');
            this.route.navigate(['/app-login']);
          } else {
            console.log('error desconocido en el login:', error);
          }
        }
      );
  }

  // ==========================
  // Búsqueda global
  // ==========================

  onGlobalSearch(): void {
    const term = (this.searchValue || '').trim();

    // Si no hay texto -> volvemos a recientes
    if (!term) {
      this.loadRecentContracts();
      return;
    }

    const headers = new HttpHeaders().set(
      'Authorization',
      'Bearer ' + this.authenticationToken.myValue
    );

    this.contractService.searchContracts(term, headers).subscribe(
      (contracts: Contract[]) => {
        this.contract = this.sortContracts(contracts);
        this.listTitle = `Contratos encontrados (${this.contract.length})`;
      },
      (error) => {
        console.error('Error en búsqueda global', error);
        if (error.status === 401) {
          this.route.navigate(['/app-login']);
        }
      }
    );
  }

  clearGlobalSearch(): void {
    this.searchValue = '';
    this.loadRecentContracts();
  }

  // ==========================
  // Filtros (Año + Estado)
  // ==========================

  onYearChange(year: number) {
    this.selectedYear = year;
    // No llamamos a findContract aquí; se ejecuta solo al dar clic en "Aplicar filtros"
  }

  onStatusChange(status: string) {
    this.selectedStatus = status;
    // Igual, solo se aplica al dar clic
  }

  applyFilters(): void {
    this.findContract(this.selectedYear, this.selectedStatus);
  }

  // ==========================
  // Exportar Excel
  // ==========================

  exportToExcel(): void {
    let listExport: any[] = [];
    this.contract.forEach((item: any) => {
      listExport = [
        ...listExport,
        ...item.listAccessories.map((ele: any) => {
          return {
            Contrato: item.codContract,
            Cliente: item.customer.name,
            Direccion: item.address,
            'Mes Contrato': item.createDate.slice(5, 7),
            'F Creacion': item.createDate.slice(0, 10),
            'F Instalacion': item.installDate.slice(0, 10),
            'F Evento': item.eventDate.slice(0, 10),
            'F Recojo': item.pickupDate.slice(0, 10),
            Descripcion:
              ele.description +
              ' ' +
              ele.color +
              ' ' +
              ele.design +
              ' Largo= ' +
              ele.large +
              ' Fondo= ' +
              ele.bottom +
              ' Alto= ' +
              ele.high +
              ' ',
            Cantidad: ele.amount,
            Precio: ele.price,
            Total: ele.amount * ele.price,
            Comentario: item.comment,
            usuario: item.userCreate.userName,
            Estado: item.status,
          };
        }),
        {
          Contrato: item.codContract,
          Cliente: item.customer.name,
          'Mes Contrato': item.createDate.slice(5, 7),
          'F Creacion': item.createDate.slice(0, 10),
          Precio: 'Total',
          Total: item.amount,
          Estado: item.status,
        },
      ];
    });

    const headers = [
      'Contrato',
      'Cliente',
      'Direccion',
      'Mes Contrato',
      'F Creacion',
      'F Instalacion',
      'F Evento',
      'F Recojo',
      'Descripcion',
      'Cantidad',
      'Precio',
      'Total',
      'Comentario',
      'usuario',
      'Estado',
    ];

    const worksheet = XLSX.utils.json_to_sheet(listExport);
    XLSX.utils.sheet_add_json(worksheet, listExport, {
      header: headers,
      skipHeader: true,
      origin: 'A2',
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const excelBlob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    FileSaver.saveAs(excelBlob, 'data.xlsx');
  }

  exportToExcelAccount(): void {
    let listExport: any[] = [];
    this.contract.forEach((item: any) => {
      listExport = [
        ...listExport,
        ...item.onAccount.map((ele: any) => {
          return {
            Contrato: item.codContract,
            Cliente: item.customer.name,
            'Mes Contrato': item.createDate.slice(5, 7),
            'F Creacion': item.createDate.slice(0, 10),
            'F Instalacion': item.installDate.slice(0, 10),
            'F Evento': item.eventDate.slice(0, 10),
            'F Recojo': item.pickupDate.slice(0, 10),
            Cantidad: ele.amount,
            'Fecha Pago': ele.createdDate.slice(0, 10),
            '# Comprobante': ele.number,
            Estado: item.status,
          };
        }),
        {
          Contrato: item.codContract,
          Cliente: item.customer.name,
          'Mes Contrato': item.createDate.slice(5, 7),
          'F Creacion': item.createDate.slice(0, 10),
          'F Recojo': 'Total',
          Cantidad: item.amount,
          Estado: item.status,
        },
      ];
    });

    const headers = [
      'Contrato',
      'Cliente',
      'Mes Contrato',
      'F Creacion',
      'F Instalacion',
      'F Evento',
      'F Recojo',
      'Cantidad',
      'Fecha Pago',
      '# Comprobante',
      'Estado',
    ];

    const worksheet = XLSX.utils.json_to_sheet(listExport);
    XLSX.utils.sheet_add_json(worksheet, listExport, {
      header: headers,
      skipHeader: true,
      origin: 'A2',
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const excelBlob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    FileSaver.saveAs(excelBlob, 'vintageAcuenta.xlsx');
  }

  // ==========================
  // Mobiliario en contrato
  // ==========================

  onAddItem(element: NgSelectComponent) {
    const itemSelected = element.selectedValues[0] as Accessory;
    if (itemSelected) {
      if (this.arrayValuesAccessory.find((x) => x.id === itemSelected._id)) {
        this.form.get('searchAccessory')?.patchValue([]);
        return;
      }

      // Si este contrato ya tenía asignado este mismo mobiliario (antes de
      // borrarlo de la lista) Y las fechas siguen siendo las mismas con las
      // que se cargó, su techo real no es solo el stock libre global: es ese
      // stock libre MÁS lo que ya tenía, porque esa cantidad sigue siendo
      // suya para esas fechas puntuales. Si la fecha cambió, esa reserva
      // vieja no aplica a la fecha nueva, así que no se suma (evita mostrar
      // disponibilidad inflada, como 34 en vez de 30 al mover a un día libre).
      const mismasFechas =
        this.form.controls['installDate'].value === this.originalInstallDate &&
        this.form.controls['pickupDate'].value === this.originalPickupDate;
      const yaTenia = mismasFechas
        ? this.originalAccessoryAmounts.get(itemSelected?._id) || 0
        : 0;
      const techoReal = (itemSelected?.stock || 0) + yaTenia;

      this.arrayAccessory.push(
        this.formBuilder.group({
          id: new FormControl(itemSelected?._id),
          description: itemSelected?.description,
          color: itemSelected?.color,
          design: itemSelected?.design,
          high: itemSelected?.high,
          width: itemSelected?.width,
          large: itemSelected?.large,
          diameter: itemSelected?.diameter,
          bottom: itemSelected?.bottom,
          amount: new FormControl(1, [
            Validators.required,
            Validators.max(techoReal),
            Validators.min(1),
          ]),
          stock: new FormControl(techoReal),
          price: new FormControl(itemSelected?.price),
          items: [itemSelected?.items],
          imageUrl: itemSelected?.imageUrl || '',
        })
      );
    }

    this.form.get('searchAccessory')?.patchValue([]);
    this.sumarValores();
    this.sumarValoresOnAccount();
  }

  onAddCustomer(element: NgSelectComponent) {
    const itemSelected = element.selectedValues[0] as Customer;
    if (itemSelected) {
      this.customerName = itemSelected?.name;
    }
    this.form.get('searchAccessory')?.patchValue([]);
    this.sumarValores();
    this.sumarValoresOnAccount();
  }

  onAddItemOnAccount(element: number) {
    this.arrayOnAccount.push(
      this.formBuilder.group({
        number: '',
        amount: element,
      })
    );
    this.onAccount = 0;
    this.sumarValoresOnAccount();
  }

  sumarValores() {
    this.total = this.arrayValuesAccessory.reduce(
      (sum, item) => sum + item.price * item.amount,
      0
    );
    this.form.get('amount')?.setValue(this.total);
    this.sumarValoresOnAccount();
  }

  sumarValoresOnAccount() {
    this.totalOnAccount = this.arrayValuesOnAccount.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    this.totalBalance = this.total - this.totalOnAccount;
  }

  openAvailability(item: any) {
    // El control "stock" de esta fila es el TECHO disponible para las
    // fechas de ESTE contrato (ver comentario de originalAccessoryAmounts
    // más arriba), no el stock total del mobiliario — para eso hay que
    // pedirlo aparte antes de abrir el modal, si no las tarjetas del
    // resumen (disponible/reservado) salen mal calculadas.
    const accessoryId = item.get('id')?.value;
    const description = item.get('description')?.value;
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    this.accessoryService.listAccessory(headers).subscribe((list: any[]) => {
      const found = (list || []).find((a) => a._id === accessoryId);
      const modalRef = this.modalService.open(AccessoryAvailabilityComponent, { centered: true, size: 'xl' });
      modalRef.componentInstance.accessory = {
        _id: accessoryId,
        description: found?.description || description,
        stock: found?.stock ?? 0,
      };
    });
  }

  async onDeleteItem(index: number) {
    const confirmado = await this.confirmDialog.confirm(
      '¿Desea eliminar este mobiliario del contrato?',
      'Eliminar Mobiliario'
    );
    if(!confirmado){
      return;
    }
    this.arrayAccessory.removeAt(index);
    this.sumarValores();
  }

  async onDeleteItemOnAccount(index: number) {
    const confirmado = await this.confirmDialog.confirm(
      '¿Desea eliminar este pago a cuenta?',
      'Eliminar Pago'
    );
    if(!confirmado){
      return;
    }
    this.arrayOnAccount.removeAt(index);
    this.sumarValoresOnAccount();
  }

  // ==========================
  // UI de creación / edición
  // ==========================

  onSubmitAdd() {
    this.finDate();
    this.condicion = true;
    this.mostrarBotones = true;
    this.isDisabled = false;
    this.listarDetalle = false;
    this.codUser = this.authenticationToken.user;
  }

  openModal() {
    this.modalService.open(CustomerComponent, { centered: true });
  }

  openAcount(content: any) {
    this.modalService
      .open(content, { ariaLabelledBy: 'modal-basic-title', centered: true })
      .result.then(
        (result) => {
          this.closeResult = `Closed with: ${result}`;
        },
        (reason) => {
          this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
        }
      );
  }

  open(content: any, valor: string) {
    this.idItemDelete = valor;
    this.modalService
      .open(content, { ariaLabelledBy: 'modal-basic-title', centered: true })
      .result.then(
        (result) => {
          this.closeResult = `Closed with: ${result}`;
        },
        (reason) => {
          this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
        }
      );
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }

  addAcount() {
    const saldo = this.A_cuenta_2 - this.A_cuenta_1;
    if (saldo === 0) {
      this.selectStatus = 'Pagado';
    }

    const payload = {
      _id: this._idContrat,
      onAccount: [
        {
          amount: parseFloat(this.A_cuenta_1.toString()),
          number: this.operacion_1,
          createdDate: this.A_cuenta_fecha_1,
        },
      ],
      status: this.selectStatus,
    };
    const headers = new HttpHeaders().set(
      'Authorization',
      'Bearer ' + this.authenticationToken.myValue
    );
    this.contractService.updateContract(payload, headers).subscribe(
      () => {
        this._idContrat = '';
        this.A_cuenta_1 = 0;
        this.A_cuenta_fecha_1 = '';
        this.operacion_1 = '';
        this.A_cuenta_2 = 0;
        this.onSubmitExit();
      },
      (error) => {
        if (error.status === 401) {
          this.route.navigate(['/app-login']);
        } else {
          console.log('error desconocido en el login');
        }
      }
    );
  }

  startTimer() {
    setTimeout(() => {
      window.print();
      // aquí podrías decidir si recargar recientes o filtros
      this.findContract(this.selectedYear, this.selectedStatus);
      this.limpiar();
      this.findClient();
      this.searchStock();
      this.condicion = false;
    }, 100);
  }

  onSave() {
    if (this.form.valid && this.isDisabled == false && this.isSaving == false) {
      if (!this.mostrarBotones) {
        const customerValue = this.form.controls['customer'].value;
        if (!(typeof customerValue === 'object' && customerValue !== null)) {
          this.form.controls['customer'].setValue(this.selectedCustomer);
        }
      }
      const headers = new HttpHeaders().set(
        'Authorization',
        'Bearer ' + this.authenticationToken.myValue
      );
      // onSave() solo crea contratos nuevos: _id nunca debe mandarse aquí
      // (el formulario lo trae vacío desde limpiar()/reset, y un string vacío
      // rompe el cast a ObjectId del backend).
      const { _id, ...values } = this.form.value;
      this.isSaving = true;
      this.contractService.saveContract(values, headers).subscribe(
        (resp) => {
          this.isSaving = false;
          this.isDisabled = true;
          this.numberContract = resp.codContract;
          this.codUser = this.authenticationToken.user;
          this.customerName = resp.customer.name;
          this.phone = resp.customer.phone;
          this.documentNumber = resp.customer.documentNumber;
          this.startTimer();
        },
        () => {
          this.isSaving = false;
        }
      );
    }
  }

  async onUpdate() {
    if (this.form.valid && this.isDisabled == false && this.isSaving == false) {
      const confirmado = await this.confirmDialog.confirm(
        '¿Desea actualizar este contrato?',
        'Actualizar Contrato'
      );
      if (!confirmado) {
        return;
      }
      const headers = new HttpHeaders().set(
        'Authorization',
        'Bearer ' + this.authenticationToken.myValue
      );
      // Solo los campos que este formulario realmente edita. _id identifica
      // el contrato existente: por eso esto llama a PUT /contract (actualizar)
      // en vez de a POST /contract (crear), que es lo que generaba un
      // contrato duplicado con código nuevo cada vez que se "actualizaba".
      // installDate/pickupDate/listAccessories siempre se mandan para que el
      // backend revalide disponibilidad contra las fechas y mobiliario
      // vigentes (excluyendo este mismo contrato del cálculo).
      const payload = {
        _id: this.form.controls['_id'].value,
        comment: this.form.controls['comment'].value,
        hourIni: this.form.controls['hourIni'].value,
        hourFin: this.form.controls['hourFin'].value,
        hourIniPickup: this.form.controls['hourIniPickup'].value,
        hourFinPickup: this.form.controls['hourFinPickup'].value,
        installDate: this.form.controls['installDate'].value,
        pickupDate: this.form.controls['pickupDate'].value,
        listAccessories: this.arrayValuesAccessory,
      };
      this.isSaving = true;
      this.contractService.updateContract(payload, headers).subscribe(
        () => {
          this.isSaving = false;
          this.isDisabled = true;
          this.startTimer();
        },
        (error) => {
          this.isSaving = false;
          if (error?.status === 424) {
            this.confirmDialog.alert('No se pudo actualizar el contrato: el mobiliario seleccionado no tiene disponibilidad suficiente para las fechas indicadas.');
          }
        }
      );
    }
  }

  printDocument() {
    this.listarDetalle = false;
    setTimeout(() => {
      window.print();
    }, 200);
  }

  printDocumentDetalle() {
    this.listarDetalle = true;
    setTimeout(() => {
      window.print();
    }, 200);
  }

  onOptionChange(id: string, status: string) {
    const payload = {
      _id: id,
      status: status,
      onAccount: [],
    };
    if (status != 'Anulado') {
      const headers = new HttpHeaders().set(
        'Authorization',
        'Bearer ' + this.authenticationToken.myValue
      );
      this.contractService.updateContract(payload, headers).subscribe(
        () => {
          this.findContract(this.selectedYear, this.selectedStatus);
        },
        (error) => {
          if (error.status === 401) {
            this.route.navigate(['/app-login']);
          } else {
            console.log('error desconocido en el login');
          }
        }
      );
    }
  }

  // 🔹 ahora solo busca en this.contract y delega al helper
  findAccesoryById(valor: string) {
    this.isDisabled = false;

    const response = this.contract.find((c) => c._id === valor);
    if (!response) {
      console.warn('Contrato no encontrado para id', valor);
      return;
    }

    this.cargarContratoDesdeObjeto(response);
  }

  // 🔹 NUEVO: usado tanto por findAccesoryById como por initialContract (modal)
  private cargarContratoDesdeObjeto(response: Contract) {
    // limpiar arrays antes de cargar
    this.arrayAccessory.clear();
    this.arrayOnAccount.clear();

    this._idContrat = response._id;
    this.idItemDelete = response._id;
    this.form.controls['_id'].setValue(response._id);
    this.selectedCustomer = response.customer;
    this.form.controls['customer'].setValue(
      response.customer.documentNumber + ' ' + response.customer.name
    );
    this.onCustomerChange(response.customer);
    this.numberContract = response.codContract;
    this.form.controls['hourIni'].setValue(response.hourIni);
    this.form.controls['hourFin'].setValue(response.hourFin);
    this.form.controls['hourIniPickup'].setValue(response.hourIniPickup);
    this.form.controls['hourFinPickup'].setValue(response.hourFinPickup);
    this.form.controls['address'].setValue(response.address);
    this.form.controls['district'].setValue(response.district);
    this.form.controls['comment'].setValue(response.comment);
    this.originalInstallDate = response.installDate.slice(0, 10);
    this.originalPickupDate = response.pickupDate.slice(0, 10);
    this.form.controls['installDate'].setValue(this.originalInstallDate);
    this.form.controls['eventDate'].setValue(response.eventDate.slice(0, 10));
    this.form.controls['pickupDate'].setValue(this.originalPickupDate);
    this.form.controls['createDate']?.setValue(
      response.createDate.slice(0, 10)
    );
    this.fechaCreacion = response.createDate.slice(0, 10);
    this.customerName = response.customer.name;
    this.phone = response.customer.phone;
    this.documentNumber = response.customer.documentNumber;
    this.codUser = response?.userCreate?.userName;
    this.selectStatus = response.status;

    this.originalAccessoryAmounts.clear();
    response.listAccessories.forEach((res: any) => {
      this.originalAccessoryAmounts.set(res.id, res.amount);
      this.arrayAccessory.push(
        this.formBuilder.group({
          id: res.id,
          description: res.description,
          color: res.color,
          design: res.design,
          high: res.high,
          width: res.width,
          large: res.large,
          bottom: res.bottom,
          amount: res.amount,
          stock: res.stock,
          price: res.price,
          items: [res.items],
          diameter: res.diameter ?? 0,
          imageUrl: res.imageUrl || '',
        })
      );
    });
    response.onAccount.forEach((res: any) => {
      this.arrayOnAccount.push(
        this.formBuilder.group({
          amount: res.amount,
          number: res.number,
          createdDate: res.createdDate.slice(0, 10),
        })
      );
    });

    this.sumarValores();
    this.sumarValoresOnAccount();
    this.A_cuenta_2 = this.totalBalance;
    this.condicion = true;
    this.mostrarBotones = false;
  }

  searchStock() {
    this.form.valueChanges
      .pipe(
        takeUntil(this.unsubscribe),
        debounceTime(50),
        distinctUntilChanged(
          (prev, curr) =>
            prev.installDate === curr.installDate &&
            prev.pickupDate === curr.pickupDate
        )
      )
      .subscribe((value) => {
        if (
          value.installDate !== '' &&
          value.pickupDate !== '' &&
          value.installDate <= value.pickupDate
        ) {
          const headers = new HttpHeaders().set(
            'Authorization',
            'Bearer ' + this.authenticationToken.myValue
          );
          // Muestra el stock real/global (igual que en cotización), sin
          // excluir este contrato: así el número que ve el usuario para
          // decidir si puede aumentar la cantidad es siempre el honesto.
          // La validación al GUARDAR (ContractService.updateContract en el
          // backend) sí excluye este contrato, para no bloquear a alguien
          // que solo quiere recuperar su propia reserva ya asignada.
          this.accessory$ = this.accessoryService.listStockAccessory(headers, {
            installDate: value.installDate,
            pickupDate: value.pickupDate,
          });
        }
      });
  }

  deleteContract() {
    const payload = {
      _id: this.idItemDelete,
      onAccount: [],
      status: 'Anulado',
    };
    const headers = new HttpHeaders().set(
      'Authorization',
      'Bearer ' + this.authenticationToken.myValue
    );
    this.contractService.updateContract(payload, headers).subscribe(
      () => {
        this.ngOnInit();
      },
      (error) => {
        if (error.status === 401) {
          this.route.navigate(['/app-login']);
        } else {
          console.log('error desconocido en el eliminar');
        }
      }
    );
  }

  onSubmitExit() {
    this.findContract(this.selectedYear, this.selectedStatus);
    this.limpiar();
    this.findClient();
    this.searchStock();
    this._idContrat = '';
    this.A_cuenta_1 = 0;
    this.A_cuenta_fecha_1 = '';
    this.operacion_1 = '';
    this.condicion = false;
    this.A_cuenta_2 = 0;
    this.listarDetalle = false;
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  imprimir(valor: string) {}

  closeModal() {
  if (this.activeModal) {
    this.activeModal.dismiss('close-click');
  }
}
}
