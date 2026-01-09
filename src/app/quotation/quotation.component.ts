import { HttpHeaders } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import {
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { Observable, Subject, map, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
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

    customerName = '';
    documentNumber = '';
    phone = '';
    selectedCustomer: any = {};

    listaDistritos = distritosLima;

    total = 0;
    quotationNumber = '';
    public unsubscribe: Subject<void> = new Subject();

    constructor(
        private modalService: NgbModal,
        private customerService: CustomerService,
        private accessoryService: AccessoryService,
        private quotationService: QuotationService,
        private contractService: ContractService,
        private authenticationToken: AuthenticationToken,
        private route: Router,
        private formBuilder: FormBuilder
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

    loadQuotations() {
        const headers = new HttpHeaders().set(
            'Authorization',
            'Bearer ' + this.authenticationToken.myValue
        );

        this.quotationService.listQuotation(headers).subscribe(
            (quotationsData) => {
                this.quotations = quotationsData.reverse();
                this.listTitle = `Listado de Cotizaciones (${this.quotations.length})`;
            },
            (error) => {
                console.error('Error loading quotations', error);
                if (error.status === 401) {
                    this.route.navigate(['/app-login']);
                }
            }
        );
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
        this.loadQuotations();
    }

    onSave() {
        if (this.form.valid) {
            const headers = new HttpHeaders().set(
                'Authorization',
                'Bearer ' + this.authenticationToken.myValue
            );

            const result = this.form.value;
            const payload = {
                ...result,
                customer: result.customer
            };

            if (result._id) {
                // Update
                this.quotationService.updateQuotation(payload, headers).subscribe(
                    (resp) => {
                        console.log('Quotation updated', resp);
                        this.quotationNumber = resp?.codQuotation || this.quotationNumber || resp?._id || '';
                        this.isDisabled = true;
                        this.onSubmitExit();
                    },
                    (error: any) => console.error(error)
                );
            } else {
                // Create
                this.quotationService.saveQuotation(payload, headers).subscribe(
                    (resp) => {
                        console.log('Quotation saved', resp);
                        if (resp?._id) {
                            this.form.patchValue({ _id: resp._id });
                        }
                        this.quotationNumber = resp?.codQuotation || resp?._id || '';
                        this.isDisabled = true;
                        this.printQuotation(true);
                    },
                    (error: any) => console.error(error)
                );
            }
        } else {
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
                        ])
                    })
                );
            });
        }

        this.sumarValores();
    }

    private formatDateForInput(dateStr: string): string {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        // Adjust for timezone offset to keep the local time as represented in the UTC string
        // The user sees "next day" meaning UTC 2023-01-02T01:00 -> Local 2023-01-01T20:00.
        // If we want to DISPLAY what was saved (2023-01-02T01:00 UTC), in local time inputs...
        // Actually, if backend saves pure UTC and frontend sends local...
        // If I send "2023-01-01T10:00", backend (Node/Mongo) might save "2023-01-01T15:00Z" (Peru +5? No, -5).
        // 10:00 Local -> 15:00 UTC.
        // When reading back 15:00 UTC... new Date("...15:00Z") in browser gives 10:00 Local.
        // So standard new Date() SHOULD work.
        // However, if the user says "next day", maybe they mean the backend SAVED it as "2023-01-01" (midnight) but Timezone shift makes it "2023-01-01T00:00Z" -> "2022-12-31T19:00" Local?
        // Or if they saved "2023-01-01" and it comes back as "2023-01-01T00:00:00Z", in Peru (-5) that is ... PREVIOUS day?
        // User says "sale la fecha del dia SIGUIENTE".
        // This means 2023-01-01 became 2023-01-02.
        // This implies the date stored is 00:00:00 NEXT day?
        // Or maybe they stored 2023-01-01T19:00 (Local) -> 2023-01-02T00:00Z.
        // And when I display it with simple substring of UTC string... I see 2023-01-02.
        // Correct fix: Convert to LOCAL ISO string.
        const tzOffset = date.getTimezoneOffset() * 60000; // in ms
        const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
        return localISOTime;
    }

    // Convert to Contract
    convertToContract(quotation: Quotation) {
        if (!confirm('¿Desea crear un contrato a partir de esta cotización?')) return;

        // 1. Pre-validate stock
        this.verifyStockAvailability(quotation).subscribe((isValid) => {
            if (!isValid) {
                alert('No se pudo generar el contrato porque el stock de algunos productos es insuficiente.');
                this.onEdit(quotation);
                // We call the OLD logic (or similar) to update the FORM which is now loaded
                // We need to re-implement the form updating logic since I replaced validateStockAvailability.
                // Actually, verifyStockAvailability operates on checking pure data.
                // I need a way to UPDATE the form.

                // I'll call a new method restoreStockOnForm(quotation) which does what validateStockAvailability used to do.
                // Or I can copy the logic into a method 'updateFormStock'.
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
                (resp: any) => {
                    alert('Contrato creado exitosamente: ' + resp.codContract);

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

                    // Manually update quotation status to persist
                    const updatePayload = {
                        ...quotation,
                        status: 'CONVERTED'
                    };

                    this.quotationService.updateQuotation(updatePayload, headers).subscribe(
                        () => {
                            quotation.status = 'CONVERTED';
                            this.loadQuotations();
                        },
                        (err) => {
                            console.error('Error updating quotation status', err);
                            // Even if update fails, we might want to refresh.
                            this.loadQuotations();
                        }
                    );
                },
                (error) => {
                    console.error('Error converting to contract', error);
                    alert('No se pudo generar el contrato. Verifique el stock disponible.');
                    this.onEdit(quotation);
                    this.updateFormStock(quotation);
                }
            );
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
            alert('El stock ha sido actualizado. Por favor verifique los productos marcados en rojo.');
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
                })
            );
        }
        this.form.get('searchAccessory')?.patchValue([]);
        this.sumarValores();
    }

    onDeleteItem(index: number) {
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
    onAddCustomer(item: any) {
        if (item) {
            this.customerName = item.name;
            this.documentNumber = item.documentNumber;
            this.phone = item.phone;
        }
    }

    openModalCustomer() {
        this.modalService.open(CustomerComponent, { centered: true });
        // Logic to refresh customer list?
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
    }

    printQuotation(exitAfter: boolean) {
        setTimeout(() => {
            window.print();
            if (exitAfter) {
                this.onSubmitExit();
            }
        }, 100);
    }

}
