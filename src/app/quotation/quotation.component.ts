import { HttpHeaders } from '@angular/common/http';
import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import html2canvas from 'html2canvas';
import {
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { Observable, Subject, map, of, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { NgSelectComponent } from '@ng-select/ng-select/public-api';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

import { CustomerService } from '../Servicios/customer.service';
import { AuthenticationToken } from '../Servicios/autentication-token.service';
import { AccessoryService } from '../Servicios/accessory.service';
import { QuotationService } from '../Servicios/quotation.service';
import { ContractService } from '../Servicios/contract.service'; // To create contract from quotation
import { CustomerComponent } from '../customer/customer.component';
import { distritosLima } from '../utils/distritos-lima';
import { environment } from 'src/environments/environment';
import { ConfirmDialogService } from '../shared/confirm-dialog/confirm-dialog.service';
import { AccessoryAvailabilityComponent } from '../accessory/accessory-availability/accessory-availability.component';

interface Customer {
    id?: string; // Sometimes _id or id depending on backend
    _id?: string;
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
    imageUrl?: string;
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

interface Quotation {
    _id: string;
    codQuotation?: string;
    createDate: string;
    installDate: string;
    eventDate: string;
    pickupDate: string;
    amount: number;
    address: string;
    district: string;
    comment: string;
    customer: { _id?: string; id?: string; name: string; documentNumber: string };
    listAccessories: any[];
    status?: string;
}

@Component({
    selector: 'app-quotation',
    templateUrl: './quotation.component.html',
    styleUrls: ['./quotation.component.css'],
})
export class QuotationComponent implements OnInit {

    quotations: Quotation[] = [];
    form: FormGroup;
    customer$: Observable<Customer[]>;
    accessory$: Observable<Accessory[]>; // For selecting accessories (stock checks logic needed similar to contract)

    // UI helpers
    fechaActual: string = '';
    listTitle: string = 'Listado de Cotizaciones';
    searchValue: string = '';
    closeResult: string = '';

    // Flags for view mode
    condicion = false; // "condicion" seems to mean "is editing/creating" in contract component
    mostrarBotones = false; // show save buttons
    isDisabled = false; // disable form after save
    isSaving = false; // true only while the save request is in flight
    convertingId: string | null = null; // id of the quotation currently being converted to contract

    customerName = '';
    documentNumber = '';
    phone = '';
    selectedCustomer: any = {};

    // 👇 Aviso de saldo pendiente al seleccionar cliente (solo informativo,
    // no bloquea guardar la cotización).
    pendingBalance: PendingBalance | null = null;
    loadingPendingBalance = false;
    showPendingDetail = false;
    // ids de clientes con saldo pendiente, para marcarlos en el propio
    // desplegable (antes de elegir uno) — ver loadPendingCustomerIds().
    pendingCustomerIds = new Set<string>();

    listaDistritos = distritosLima;

    total = 0;
    quotationNumber = '';
    apiUrl = environment.apiUrl;
    currentQuotation: Quotation | null = null; // cotización cargada en la vista de detalle

    isCapturingPdf = false;
    isGeneratingPdf = false;
    @ViewChild('pagePrintRef') pagePrintRef?: ElementRef<HTMLElement>;

    // Envío por WhatsApp
    whatsappTargetQuotation: Quotation | null = null;
    whatsappMatchedCustomer: any = null; // ficha completa del cliente, si se encontró
    whatsappPhoneInput = '';
    whatsappSaveToCustomer = true;
    public unsubscribe: Subject<void> = new Subject();

    // Paginación del listado
    currentPage = 1;
    pageSize = 20;
    totalQuotations = 0;

    get totalPages(): number {
        return Math.max(1, Math.ceil(this.totalQuotations / this.pageSize));
    }

    constructor(
        private modalService: NgbModal,
        private customerService: CustomerService,
        private accessoryService: AccessoryService,
        private quotationService: QuotationService,
        private contractService: ContractService,
        private authenticationToken: AuthenticationToken,
        private route: Router,
        private formBuilder: FormBuilder,
        private confirmDialog: ConfirmDialogService
    ) {
        this.customer$ = new Observable<Customer[]>();
        this.accessory$ = new Observable<Accessory[]>();

        this.form = this.formBuilder.group({
            _id: new FormControl(null), // Add field to track ID
            customer: new FormControl('', Validators.required),
            createDate: new FormControl('', Validators.required),
            installDate: new FormControl('', Validators.required),
            eventDate: new FormControl('', Validators.required),
            pickupDate: new FormControl('', Validators.required),
            address: new FormControl('', Validators.required),
            district: new FormControl('', Validators.required),
            amount: new FormControl(0, Validators.required),
            comment: new FormControl(''),
            searchAccessory: new FormControl(''), // Control for searching accessories
            listAccessories: this.formBuilder.array([]),
        });
    }

    ngOnInit() {
        this.findClient();
        this.loadPendingCustomerIds();
        this.loadQuotations();
        // this.searchStock(); // If we want to allow searching accessories immediately or on type
    }

    // ==========================
    // Form Arrays
    // ==========================
    get arrayAccessory(): FormArray {
        return this.form.controls['listAccessories'] as FormArray;
    }

    get arrayValuesAccessory(): any[] {
        return this.arrayAccessory.value as any[];
    }

    // ==========================
    // Data Loading
    // ==========================

    findClient() {
        const headers = new HttpHeaders().set(
            'Authorization',
            'Bearer ' + this.authenticationToken.myValue
        );
        this.customer$ = this.customerService.listCustomer(headers);
    }

    loadQuotations(page: number = this.currentPage) {
        const headers = new HttpHeaders().set(
            'Authorization',
            'Bearer ' + this.authenticationToken.myValue
        );

        this.quotationService.listQuotation(headers, page, this.pageSize, this.searchValue).subscribe(
            (response) => {
                // El backend ya ordena por fecha descendente (más reciente primero);
                // no reordenar acá para no invertirlo.
                this.quotations = response.items;
                this.totalQuotations = response.total;
                this.currentPage = response.page;
                this.listTitle = `Listado de Cotizaciones (${this.totalQuotations})`;
            },
            (error) => {
                console.error('Error loading quotations', error);
                if (error.status === 401) {
                    this.route.navigate(['/app-login']);
                }
            }
        );
    }

    goToPage(page: number) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) {
            return;
        }
        this.loadQuotations(page);
    }

    // Busca por cliente o código de cotización en TODO el listado (no solo
    // la página actual), reiniciando a la primera página de resultados.
    onGlobalSearch(): void {
        this.loadQuotations(1);
    }

    clearGlobalSearch(): void {
        this.searchValue = '';
        this.loadQuotations(1);
    }

    // Re-use logic from Contract for searching accessories
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
                    value.installDate &&
                    value.pickupDate &&
                    value.installDate <= value.pickupDate
                ) {
                    const headers = new HttpHeaders().set(
                        'Authorization',
                        'Bearer ' + this.authenticationToken.myValue
                    );
                    this.accessory$ = this.accessoryService.listStockAccessory(headers, {
                        installDate: value.installDate.substring(0, 10),
                        pickupDate: value.pickupDate.substring(0, 10),
                    }).pipe(
                        map((items: Accessory[]) => {
                            console.log('Stock items from API:', items);
                            return items.filter(item => item.stock > 0);
                        })
                    );
                } else {
                    // Optionally clear if dates invalid
                }
            });
    }

    // ==========================
    // Actions
    // ==========================

    onSubmitAdd() {
        this.limpiarForm();
        this.finDate();
        this.quotationNumber = '';
        this.currentQuotation = null;
        this.condicion = true;
        this.mostrarBotones = true;
        this.isDisabled = false;

        // Load accessories for selection
        this.searchStock();
    }

    onSubmitExit() {
        this.condicion = false;
        this.mostrarBotones = false;
        this.isDisabled = false;
        this.currentQuotation = null;
        this.loadQuotations();
    }

    async onSave() {
        if (this.form.valid && !this.isDisabled && !this.isSaving) {
            const confirmado = await this.confirmDialog.confirm(
                '¿Desea guardar esta cotización?',
                'Guardar Cotización'
            );
            if (!confirmado) {
                return;
            }
            const headers = new HttpHeaders().set(
                'Authorization',
                'Bearer ' + this.authenticationToken.myValue
            );

            const result = this.form.value;
            const payload = {
                ...result,
                customer: result.customer
            };

            this.isSaving = true;

            if (result._id) {
                // Update
                this.quotationService.updateQuotation(payload, headers).subscribe(
                    (resp) => {
                        this.isSaving = false;
                        console.log('Quotation updated', resp);
                        this.quotationNumber = resp?.codQuotation || this.quotationNumber || resp?._id || '';
                        this.isDisabled = true;
                        this.onSubmitExit();
                    },
                    async (error: any) => {
                        this.isSaving = false;
                        console.error(error);
                        if (error?.status === 424) {
                            // El backend revalida disponibilidad real (contra
                            // contratos) al editar fechas/mobiliario, para no
                            // dejar guardar algo que ya no hay y tener
                            // problemas con el cliente después.
                            await this.confirmDialog.alert('No se pudo actualizar la cotización: el mobiliario seleccionado no tiene disponibilidad suficiente para las fechas indicadas.');
                            this.updateFormStock({
                                installDate: this.form.value.installDate,
                                pickupDate: this.form.value.pickupDate,
                            } as Quotation);
                        }
                    }
                );
            } else {
                // Create
                this.quotationService.saveQuotation(payload, headers).subscribe(
                    (resp) => {
                        this.isSaving = false;
                        console.log('Quotation saved', resp);
                        if (resp?._id) {
                            this.form.patchValue({ _id: resp._id });
                        }
                        this.quotationNumber = resp?.codQuotation || resp?._id || '';
                        this.isDisabled = true;
                        this.printQuotation(true);
                    },
                    (error: any) => {
                        this.isSaving = false;
                        console.error(error);
                    }
                );
            }
        } else if (!this.form.valid) {
            console.log('Form invalid', this.form);
            Object.keys(this.form.controls).forEach(key => {
                const controlErrors = this.form.get(key)?.errors;
                if (controlErrors != null) {
                    console.log('Key control: ' + key + ', keyError: ' + JSON.stringify(controlErrors));
                }
            });
            this.form.markAllAsTouched();
        }
    }

    onEdit(item: Quotation) {
        this.searchStock(); // Initialize listener for dates
        this.condicion = true;
        this.mostrarBotones = true;
        this.currentQuotation = item;
        // If converted, disable editing
        this.isDisabled = (item.status === 'CONVERTED');
        this.quotationNumber = item.codQuotation || item._id || '';

        // Fill main form
        this.form.patchValue({
            _id: item._id, // Patch ID
            createDate: item.createDate ? item.createDate.substring(0, 10) : '',
            installDate: this.formatDateForInput(item.installDate),
            eventDate: this.formatDateForInput(item.eventDate),
            pickupDate: this.formatDateForInput(item.pickupDate),
            address: item.address,
            district: item.district,
            comment: item.comment,
            amount: item.amount,
            customer: item.customer
        });

        // Fill Customer details
        if (item.customer) {
            this.customerName = item.customer.name;
            this.documentNumber = item.customer.documentNumber;
        }
        this.onCustomerChange(item.customer);

        // Fill Accessories
        this.arrayAccessory.clear();
        if (item.listAccessories) {
            item.listAccessories.forEach((acc: any) => {
                this.arrayAccessory.push(
                    this.formBuilder.group({
                        id: acc.id || acc._id,
                        description: acc.description,
                        color: acc.color,
                        design: acc.design,
                        high: acc.high,
                        width: acc.width,
                        large: acc.large,
                        diameter: acc.diameter,
                        bottom: acc.bottom,
                        stock: acc.stock,
                        price: acc.price,
                        amount: new FormControl(acc.amount, [
                            Validators.required,
                            Validators.min(1),
                            Validators.max(acc.stock)
                        ]),
                        imageUrl: acc.imageUrl || '',
                    })
                );
            });
        }

        this.sumarValores();
    }

    // El input datetime-local manda su valor tal cual se escribió (sin
    // offset de huso horario) y el payload de guardado lo envía literal
    // (ver onSubmitAdd: `payload = { ...form.value }`), así que el backend
    // termina guardando esos mismos dígitos con un sufijo "Z" pegado, no
    // una conversión real a UTC. Por eso, para reabrir sin correr la
    // fecha/hora, hay que leer esos dígitos tal cual — CUALQUIER conversión
    // de huso horario acá (como hacía la versión anterior, restando el
    // offset del NAVEGADOR) desalinea el dato porque el navegador y el
    // servidor pueden estar en husos distintos.
    private formatDateForInput(dateStr: string): string {
        if (!dateStr) return '';
        return dateStr.slice(0, 16);
    }

    // Convert to Contract
    async convertToContract(quotation: Quotation) {
        if (this.convertingId === quotation._id) return;
        const confirmado = await this.confirmDialog.confirm(
            '¿Desea crear un contrato a partir de esta cotización?',
            'Generar Contrato'
        );
        if (!confirmado) return;

        this.convertingId = quotation._id;

        // 1. Pre-validate stock
        this.verifyStockAvailability(quotation).subscribe({
            next: async (isValid) => {
            if (!isValid) {
                this.convertingId = null;
                // Esperar a que cierren el aviso ANTES de tocar el form: si
                // no se espera, el modal queda abierto tapando la pantalla
                // mientras el form ya cambió debajo (un alert() nativo del
                // navegador sí bloqueaba hasta cerrarlo; este modal no).
                await this.confirmDialog.alert('No se pudo generar el contrato porque el stock de algunos productos es insuficiente.');
                this.onEdit(quotation);
                this.updateFormStock(quotation);
                return;
            }

            const headers = new HttpHeaders().set(
                'Authorization',
                'Bearer ' + this.authenticationToken.myValue
            );

            const payload = {
                quotationId: quotation._id
            };

            this.contractService.savecontractbyquotation(payload, headers).subscribe(
                async (resp: any) => {
                    this.convertingId = null;
                    // Esperar a que cierren el aviso ANTES de navegar: si no
                    // se espera, el modal queda huérfano sobre la pantalla
                    // del contrato (la ruta ya cambió, pero el modal sigue
                    // abierto) y bloquea cualquier clic ahí.
                    await this.confirmDialog.alert('Contrato creado exitosamente: ' + resp.codContract);

                    // Force status update to 'Por Pagar' to ensure stock is deducted
                    if (resp._id) {
                        const contractPayload = {
                            _id: resp._id,
                            status: 'Por Pagar',
                            onAccount: [] // Ensure structure validity if needed
                        };
                        this.contractService.updateContract(contractPayload, headers).subscribe(
                            () => console.log('Contract status set to Por Pagar'),
                            err => console.error('Error setting contract status', err)
                        );
                    }

                    // Manually update quotation status to persist.
                    // OJO: no mandar el objeto completo de "quotation" (incluye
                    // codQuotation/numberQuotation/userCreate): el backend los
                    // rechaza con 400 porque QuotationDto los marca @IsEmpty()
                    // en el PUT. Antes esto hacía que el 400 se tragara en
                    // silencio y la cotización NUNCA quedara CONVERTED de verdad.
                    const updatePayload = {
                        _id: quotation._id,
                        createDate: quotation.createDate,
                        installDate: quotation.installDate,
                        eventDate: quotation.eventDate,
                        pickupDate: quotation.pickupDate,
                        amount: quotation.amount,
                        address: quotation.address,
                        district: quotation.district,
                        comment: quotation.comment,
                        customer: quotation.customer,
                        listAccessories: quotation.listAccessories,
                        status: 'CONVERTED'
                    };

                    // Al terminar, redirigir al contrato recién creado en su
                    // propio módulo (en vez de quedarse en la cotización).
                    this.quotationService.updateQuotation(updatePayload, headers).subscribe(
                        () => {
                            quotation.status = 'CONVERTED';
                            this.route.navigate(['/dashboard/contract'], { queryParams: { open: resp._id } });
                        },
                        (err) => {
                            console.error('Error updating quotation status', err);
                            // Aunque falle marcar la cotización, el contrato ya existe: igual redirigimos.
                            this.route.navigate(['/dashboard/contract'], { queryParams: { open: resp._id } });
                        }
                    );
                },
                async (error) => {
                    this.convertingId = null;
                    console.error('Error converting to contract', error);
                    await this.confirmDialog.alert('No se pudo generar el contrato. Verifique el stock disponible.');
                    this.onEdit(quotation);
                    this.updateFormStock(quotation);
                }
            );
            },
            error: () => {
                this.convertingId = null;
            }
        });
    }

    // Helper to update form visual usage
    updateFormStock(quotation: Quotation) {
        // Fetch fresh stock for the quotation dates
        const item = quotation;
        const installDate = item.installDate ? item.installDate.substring(0, 10) : '';
        const pickupDate = item.pickupDate ? item.pickupDate.substring(0, 10) : '';

        if (!installDate || !pickupDate) return;

        this.accessoryService.listStockAccessory(
            new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue),
            { installDate, pickupDate }
        ).subscribe((freshAccessories: Accessory[]) => {
            // Update each item in the form with fresh stock
            const controls = this.arrayAccessory.controls;
            controls.forEach((control) => {
                const id = control.get('id')?.value;
                const freshItem = freshAccessories.find((x: any) => x._id === id || x.id === id);

                if (freshItem) {
                    control.get('stock')?.setValue(freshItem.stock);
                    const amountControl = control.get('amount');
                    if (amountControl) {
                        amountControl.clearValidators();
                        amountControl.setValidators([Validators.required, Validators.min(1), Validators.max(freshItem.stock)]);
                        amountControl.updateValueAndValidity();
                    }
                } else {
                    control.get('stock')?.setValue(0);
                    const amountControl = control.get('amount');
                    if (amountControl) {
                        amountControl.setValidators([Validators.max(0)]);
                        amountControl.updateValueAndValidity();
                    }
                }
            });
            this.form.updateValueAndValidity();
            this.confirmDialog.alert('El stock ha sido actualizado. Por favor verifique los productos marcados en rojo.');
        });
    }

    validateStockAvailability(quotation: Quotation) {
        this.verifyStockAvailability(quotation).subscribe();
    }

    verifyStockAvailability(quotation: Quotation): Observable<boolean> {
        return new Observable<boolean>((observer) => {
            const item = quotation;
            const installDate = item.installDate ? item.installDate.substring(0, 10) : '';
            const pickupDate = item.pickupDate ? item.pickupDate.substring(0, 10) : '';

            if (!installDate || !pickupDate) {
                observer.next(false);
                observer.complete();
                return;
            }

            this.accessoryService.listStockAccessory(
                new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue),
                { installDate, pickupDate }
            ).subscribe((freshAccessories: Accessory[]) => {
                let isValid = true;
                const controls = this.arrayAccessory.controls;

                // We need to map the form controls to check if they exceed stock
                // Assuming the form is loaded? 
                // Wait, if I am in list view and click "Convert", the form might be empty or filled with something else!
                // ERROR: convertToContract takes "quotation" (the item from list), NOT the form state.
                // However, validateStockAvailability assumes this.arrayAccessory is populated.
                // onEdit populates the form.
                // So if I click convert from list, I must LOAD it into form first?
                // OR I check against the quotation.listAccessories data.

                // If I am just checking logic for conversion:
                // I should compare freshAccessories vs quotation.listAccessories.

                const quotationItems = quotation.listAccessories;
                let hasStockIssues = false;

                quotationItems.forEach((qItem: any) => {
                    const freshItem = freshAccessories.find((x: any) => x._id === (qItem.id || qItem._id) || x.id === (qItem.id || qItem._id));
                    if (freshItem) {
                        if (qItem.amount > freshItem.stock) {
                            hasStockIssues = true;
                        }
                    } else {
                        // Item likely deleted or 0 stock
                        hasStockIssues = true;
                    }
                });

                if (hasStockIssues) {
                    // Update UI if we are going to show details
                    // But we might be in list view.
                    // The flow should be:
                    // 1. Check stock.
                    // 2. If valid -> convert.
                    // 3. If invalid -> details -> load form -> validate (show red).
                    // So returning boolean is enough.
                    observer.next(false);
                } else {
                    observer.next(true);
                }
                observer.complete();
            }, (err) => {
                console.error(err);
                observer.next(false);
                observer.complete();
            });
        });
    }

    // ==========================
    // Item Management (Accessories)
    // ==========================

    onAddItem(itemSelected: any) {
        if (itemSelected) {
            // Check if already exists
            if (this.arrayValuesAccessory.find((x: any) => x.id === itemSelected._id || x._id === itemSelected._id || x.id === itemSelected.id)) {
                this.form.get('searchAccessory')?.patchValue([]);
                return;
            }

            this.arrayAccessory.push(
                this.formBuilder.group({
                    id: new FormControl(itemSelected._id || itemSelected.id),
                    description: itemSelected.description,
                    color: itemSelected.color,
                    design: itemSelected.design,
                    high: itemSelected.high,
                    width: itemSelected.width,
                    large: itemSelected.large,
                    diameter: itemSelected.diameter,
                    bottom: itemSelected.bottom,
                    stock: itemSelected.stock,
                    price: new FormControl(itemSelected.price),
                    amount: new FormControl(1, [
                        Validators.required,
                        Validators.min(1),
                        Validators.max(itemSelected.stock)
                    ]),
                    imageUrl: itemSelected.imageUrl || '',
                })
            );
        }
        this.form.get('searchAccessory')?.patchValue([]);
        this.sumarValores();
    }

    openAvailability(item: any) {
        // El "stock" de esta fila es el techo disponible para las fechas de
        // ESTA cotización, no el stock total del mobiliario (mismo caso que
        // en Contrato) — hay que pedirlo aparte para que el resumen del
        // modal (disponible/reservado) salga bien calculado.
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
            '¿Desea eliminar este mobiliario de la cotización?',
            'Eliminar Mobiliario'
        );
        if (!confirmado) {
            return;
        }
        this.arrayAccessory.removeAt(index);
        this.sumarValores();
    }

    sumarValores() {
        this.total = this.arrayValuesAccessory.reduce((acc, item) => acc + (item.price * item.amount), 0);
        this.form.get('amount')?.setValue(this.total);
    }

    // ==========================
    // Customers
    // ==========================

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
        const id = item?._id || item?.id;
        return !!id && this.pendingCustomerIds.has(id);
    }

    onAddCustomer(item: any) {
        if (item) {
            this.customerName = item.name;
            this.documentNumber = item.documentNumber;
            this.phone = item.phone;
        }
        this.onCustomerChange(item);
    }

    // 👇 Se dispara al elegir cliente (o al cargar una cotización existente
    // para editar). Solo informa: nunca bloquea guardar.
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
            next: (result) => {
                this.loadingPendingBalance = false;
                this.pendingBalance = result;
            },
            error: () => {
                this.loadingPendingBalance = false;
                this.pendingBalance = null;
            },
        });
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
                    this.onAddCustomer(match);
                });
            },
            () => {
                // modal cerrado sin guardar: no hacer nada
            }
        );
    }

    // ==========================
    // Utils
    // ==========================
    finDate() {
        const fecha = new Date();
        // Format YYYY-MM-DD
        const iso = fecha.toISOString().substring(0, 10);
        this.fechaActual = iso;
        this.form.controls['createDate'].setValue(iso);
    }

    limpiarForm() {
        this.form.reset();
        this.form.setControl('listAccessories', this.formBuilder.array([]));
        this.total = 0;
        this.customerName = '';
        this.documentNumber = '';
        this.phone = '';
        this.quotationNumber = '';
        this.pendingBalance = null;
        this.showPendingDetail = false;
    }

    printQuotation(exitAfter: boolean) {
        setTimeout(() => {
            window.print();
            if (exitAfter) {
                this.onSubmitExit();
            }
        }, 100);
    }

    // ==========================
    // Envío por WhatsApp
    // ==========================

    // Siempre pregunta antes de enviar: muestra el celular guardado (si hay)
    // para confirmarlo o cambiarlo, porque suele quedar desactualizado.
    sendToWhatsapp(quotation: Quotation, promptModal: any) {
        if (!quotation) return;
        this.whatsappTargetQuotation = quotation;
        this.whatsappMatchedCustomer = null;
        this.whatsappPhoneInput = '';
        this.whatsappSaveToCustomer = true;

        const headers = new HttpHeaders().set(
            'Authorization',
            'Bearer ' + this.authenticationToken.myValue
        );
        this.customerService.listCustomer(headers).subscribe({
            next: (customers: any[]) => {
                const match = (customers || []).find(
                    (c) => c.documentNumber === quotation.customer?.documentNumber
                );
                this.whatsappMatchedCustomer = match || null;
                this.whatsappPhoneInput = (match?.phone || '').toString();
                this.modalService.open(promptModal, { centered: true });
            },
            error: () => {
                // Si falla la consulta del cliente, igual dejamos escribir el número a mano.
                this.modalService.open(promptModal, { centered: true });
            }
        });
    }

    confirmWhatsappPhone(modal: any) {
        const digits = this.whatsappPhoneInput.replace(/\D/g, '');
        if (!digits || !this.whatsappTargetQuotation) {
            return;
        }

        const existingDigits = (this.whatsappMatchedCustomer?.phone || '').toString().replace(/\D/g, '');
        const numeroNuevo = digits !== existingDigits;

        if (this.whatsappSaveToCustomer && this.whatsappMatchedCustomer && numeroNuevo) {
            const headers = new HttpHeaders().set(
                'Authorization',
                'Bearer ' + this.authenticationToken.myValue
            );
            const payload = {
                _id: this.whatsappMatchedCustomer._id,
                name: this.whatsappMatchedCustomer.name,
                documentNumber: this.whatsappMatchedCustomer.documentNumber,
                address: this.whatsappMatchedCustomer.address,
                phone: digits,
                status: true
            };
            this.customerService.updateCustomer(payload, headers).subscribe({
                next: () => {},
                error: (err) => console.error('No se pudo actualizar el celular del cliente', err)
            });
        }

        this.openWhatsapp(digits, this.whatsappTargetQuotation);
        modal.close();
    }

    private openWhatsapp(rawDigits: string, quotation: Quotation) {
        // Números guardados en Perú son locales (9 dígitos); wa.me necesita
        // el código de país. Si ya viene con código, se respeta tal cual.
        let digits = rawDigits;
        if (digits.length === 9) {
            digits = '51' + digits;
        }
        const message = this.buildWhatsappMessage(quotation);
        const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }

    private buildWhatsappMessage(quotation: Quotation): string {
        const cliente = quotation.customer?.name || '';
        const codigo = quotation.codQuotation || '';
        const fechaEvento = this.formatDateSafe(quotation.eventDate);
        const monto = quotation.amount != null ? `S/ ${quotation.amount}` : '';

        return `Hola ${cliente}, te compartimos tu cotización ${codigo} de Vintage Party.\n`
            + `Fecha del evento: ${fechaEvento}\n`
            + `Monto: ${monto}\n`
            + `¡Gracias por tu preferencia!`;
    }

    // Evita el bug de zona horaria (no usa Date/toLocaleDateString sobre un
    // string de solo-fecha, que en Perú corre el día para atrás).
    private formatDateSafe(dateStr?: string): string {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.substring(0, 10).split('-');
        return `${d}/${m}/${y}`;
    }

    // ==========================
    // PDF real (para compartir o descargar)
    // ==========================

    // Captura la vista de impresión como imagen, la manda al backend para
    // armar el PDF (nada se guarda ahí), y en el celular lo pasa directo al
    // "Compartir" nativo (donde WhatsApp aparece como opción con el archivo
    // real adjunto). En computadora, lo descarga.
    async downloadOrSharePdf(quotation: Quotation) {
        if (!quotation || this.isGeneratingPdf) return;

        this.isGeneratingPdf = true;
        this.isCapturingPdf = true;
        // Espera un tick para que Angular aplique la clase que hace visible
        // la vista de impresión antes de capturarla.
        await new Promise((resolve) => setTimeout(resolve, 50));

        let imageDataUrl: string;
        try {
            const element = this.pagePrintRef?.nativeElement;
            if (!element) {
                return;
            }
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, width: 1000, windowWidth: 1000 });
            imageDataUrl = canvas.toDataURL('image/png');
        } finally {
            this.isCapturingPdf = false;
        }

        const headers = new HttpHeaders().set(
            'Authorization',
            'Bearer ' + this.authenticationToken.myValue
        );

        this.quotationService.generatePdf(imageDataUrl, headers).subscribe({
            next: async (pdfBlob: Blob) => {
                this.isGeneratingPdf = false;
                const fileName = `Cotizacion-${quotation.codQuotation || quotation._id}.pdf`;
                const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

                const nav = navigator as any;
                if (nav.canShare && nav.canShare({ files: [file] })) {
                    try {
                        await nav.share({
                            files: [file],
                            title: 'Cotización Vintage Party',
                            text: this.buildWhatsappMessage(quotation),
                        });
                    } catch (err) {
                        // Usuario canceló el "Compartir"; no es un error real.
                    }
                } else {
                    const url = URL.createObjectURL(pdfBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    a.click();
                    URL.revokeObjectURL(url);
                }
            },
            error: () => {
                this.isGeneratingPdf = false;
                this.confirmDialog.alert('No se pudo generar el PDF. Intente nuevamente.');
            }
        });
    }

}
