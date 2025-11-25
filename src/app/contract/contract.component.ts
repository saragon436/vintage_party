import { HttpHeaders } from '@angular/common/http';
import { Component, Input, Optional  } from '@angular/core';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  Observable,
  Subject,
  takeUntil,
} from 'rxjs';
import { CustomerService } from '../Servicios/customer.service';
import { Router } from '@angular/router';
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

interface Customer {
  name: string;
  documentNumber: string;
  address: string;
  phone: string;
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
  closeResult: string = '';
  searchValue: string = '';
  selectedCustomer = {};
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
  codUser = '';
  _idContrat = '';
  A_cuenta_fecha_1 = '';
  selectStatus = '';
  A_cuenta_2 = 0;
  isDisabled = false;
  listarDetalle = false;

  constructor(
    private modalService: NgbModal,
    private customerService: CustomerService,
    private accessoryService: AccessoryService,
    private contractService: ContractService,
    private authenticationToken: AuthenticationToken,
    private route: Router,
    //ublic activeModal: NgbActiveModal,  // 👈 aquí
    @Optional() public activeModal: NgbActiveModal,   // 👈 OPCIONAL
    private formBuilder: FormBuilder
  ) {
    this.unsubscribe = new Subject();
    this.customer$ = new Observable<Customer[]>();
    this.accessory$ = new Observable<Accessory[]>();

    this.form = this.formBuilder.group({
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
      comment: new FormControl('', Validators.required),
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
    this.searchStock();

    // 👇 AQUÍ DECIDIMOS el modo:
    // - Si viene desde calendar (modal) -> cargamos ese contrato directamente
    // - Si NO, se comporta como siempre: lista de recientes
    if (this.initialContract) {
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
      comment: new FormControl('', Validators.required),
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
            Validators.max(itemSelected?.stock || 0),
            Validators.min(1),
          ]),
          stock: new FormControl(itemSelected?.stock),
          price: new FormControl(itemSelected?.price),
          items: [itemSelected?.items],
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

  onDeleteItem(index: number) {
    this.arrayAccessory.removeAt(index);
    this.sumarValores();
  }

  onDeleteItemOnAccount(index: number) {
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
      .open(content, { ariaLabelledBy: 'modal-basic-title' })
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
      .open(content, { ariaLabelledBy: 'modal-basic-title' })
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
    if (this.form.valid && this.isDisabled == false) {
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
      const values = { ...this.form.value };
      this.contractService.saveContract(values, headers).subscribe((resp) => {
        this.isDisabled = true;
        this.numberContract = resp.codContract;
        this.codUser = this.authenticationToken.user;
        this.customerName = resp.customer.name;
        this.phone = resp.customer.phone;
        this.documentNumber = resp.customer.documentNumber;
        this.startTimer();
      });
    }
  }

  onUpdate() {
    if (this.form.valid && this.isDisabled == false) {
      const headers = new HttpHeaders().set(
        'Authorization',
        'Bearer ' + this.authenticationToken.myValue
      );
      const values = { ...this.form.value };
      this.contractService.saveContract(values, headers).subscribe((resp) => {
        this.isDisabled = true;
        this.numberContract = resp.codContract;
        this.codUser = this.authenticationToken.user;
        this.customerName = resp.customer.name;
        this.phone = resp.customer.phone;
        this.documentNumber = resp.customer.documentNumber;
        this.startTimer();
      });
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
    this.selectedCustomer = response.customer;
    this.form.controls['customer'].setValue(
      response.customer.documentNumber + ' ' + response.customer.name
    );
    this.numberContract = response.codContract;
    this.form.controls['hourIni'].setValue(response.hourIni);
    this.form.controls['hourFin'].setValue(response.hourFin);
    this.form.controls['hourIniPickup'].setValue(response.hourIniPickup);
    this.form.controls['hourFinPickup'].setValue(response.hourFinPickup);
    this.form.controls['address'].setValue(response.address);
    this.form.controls['district'].setValue(response.district);
    this.form.controls['comment'].setValue(response.comment);
    this.form.controls['installDate'].setValue(
      response.installDate.slice(0, 10)
    );
    this.form.controls['eventDate'].setValue(response.eventDate.slice(0, 10));
    this.form.controls['pickupDate'].setValue(
      response.pickupDate.slice(0, 10)
    );
    this.form.controls['createDate']?.setValue(
      response.createDate.slice(0, 10)
    );
    this.fechaCreacion = response.createDate.slice(0, 10);
    this.customerName = response.customer.name;
    this.phone = response.customer.phone;
    this.documentNumber = response.customer.documentNumber;
    this.codUser = response?.userCreate?.userName;
    this.selectStatus = response.status;

    response.listAccessories.forEach((res: any) => {
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
