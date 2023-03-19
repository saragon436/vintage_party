import { HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { debounceTime, distinctUntilChanged, map, Observable, Subject, takeUntil } from 'rxjs';
import { CustomerService } from '../Servicios/customer.service';
import { Router } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CustomerComponent } from '../customer/customer.component';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AccessoryService } from '../Servicios/accessory.service';
import { ContractService } from '../Servicios/contract.service';
import { NgSelectComponent } from '@ng-select/ng-select/public-api';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

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
  stock: number;
  price:number;
  items?: any[]
  status: boolean;
}

interface onAccount{
  number:string;
  amount:number;
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
  status: boolean;
  listAccessories:[];
}

@Component({
  selector: 'app-contract',
  templateUrl: './contract.component.html',
  styleUrls: ['./contract.component.css']
})
export class ContractComponent {
  fechaActual: string="";
  contract:Contract[];
  form: FormGroup;
  customer$: Observable<Customer[]>;
  accessory$: Observable<Accessory[]>;
  public unsubscribe: Subject<void>;
  total=0;
  totalOnAccount=0;
  totalBalance=0;
  onAccount=0;
  constructor(
    private modalService: NgbModal,
    private customerService: CustomerService,
    private accessoryService: AccessoryService,
    private contractService: ContractService,
    private authenticationToken: AuthenticationToken,
    private route: Router,
    private formBuilder: FormBuilder) {      
      this.contract = [];
      this.unsubscribe = new Subject();
      this.customer$ = new Observable<Customer[]>;
      this.accessory$ = new Observable<Accessory[]>;
      this.form = this.formBuilder.group({
        search: new FormControl(''),
        searchAccessory: new FormControl(''),
        customer: new FormControl('', Validators.required),
        //number: new FormControl('', Validators.required),
        onAccountvalues: new FormControl(0, Validators.required),
        saldo: new FormControl(0, Validators.required),
        createDate: new FormControl(new Date(), Validators.required),
        installDate: new FormControl('', Validators.required),
        eventDate: new FormControl('', Validators.required),
        pickupDate: new FormControl('', Validators.required),
        //createDate: new FormControl('', Validators.required),
        amount: new FormControl(0, Validators.required),
        comment: new FormControl('', Validators.required),
        price: new FormControl(0, Validators.required),
        listAccessories: this.formBuilder.array([]),
        onAccount: this.formBuilder.array([])
      });
  }
  condicion=false;
  openModal() {
    this.modalService.open(CustomerComponent, { centered: true });
  }

  exportToExcel(): void {
    this.contract.forEach(item => {
      Object.assign(item, item.listAccessories);
      
    });

    const headers = ['createDate','installDate','eventDate','pickupDate','amount','onAccount','listAccessories'];
    headers.forEach((header, index) => {
      headers[index] = header.toString();
      // O usando la plantilla literal de ES6:
      // headers[index] = `${header}`;
    });

    const worksheet = XLSX.utils.json_to_sheet(this.contract);
    XLSX.utils.sheet_add_json(worksheet, this.contract, { header: headers, skipHeader: true, origin: 'A2'});

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    FileSaver.saveAs(excelBlob, 'data.xlsx');
  
  }

  limpiar(){
    //this.contract = [];
    //this.unsubscribe = new Subject();
    this.customer$ = new Observable<Customer[]>;
    this.accessory$ = new Observable<Accessory[]>;
    this.form = this.formBuilder.group({
      search: new FormControl(''),
      searchAccessory: new FormControl(''),
      customer: new FormControl('', Validators.required),
      //number: new FormControl('', Validators.required),
      onAccountvalues: new FormControl(0, Validators.required),
      saldo: new FormControl(0, Validators.required),
      installDate: new FormControl('', Validators.required),
      eventDate: new FormControl('', Validators.required),
      pickupDate: new FormControl('', Validators.required),
      amount: new FormControl(0, Validators.required),
      comment: new FormControl('', Validators.required),
      price: new FormControl(0, Validators.required),
      listAccessories: this.formBuilder.array([]),
      onAccount: this.formBuilder.array([])
    });
  }

  ngOnInit() {
    const fecha = new Date();
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear().toString();
    this.fechaActual = `${anio}-${mes}-${dia}`;
    this.findClient();
    this.searchStock();
    this.findContract();
  }

  findClient(){
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    console.log('this.authenticationToken ' + this.authenticationToken)
    this.customer$ = this.customerService.listCustomer(headers);
  }

  get arrayAccessory(): FormArray {
    return this.form.controls['listAccessories'] as FormArray
  }

  get arrayValuesAccessory(): any[] {
    return this.arrayAccessory.value as any[]
  }

  get arrayOnAccount(): FormArray {
    return this.form.controls['onAccount'] as FormArray
  }

  get arrayValuesOnAccount(): any[] {
    return this.arrayOnAccount.value as any[]
  }

  onAddItem(element: NgSelectComponent) {

    const itemSelected = element.selectedValues[0] as Accessory;
    if (itemSelected) {

      if (this.arrayValuesAccessory.find(x => x.id === itemSelected._id)) {

        this.form.get('searchAccessory')?.patchValue([]);
        return;
      }

      this.arrayAccessory
        .push(
          this.formBuilder.group({
            id: new FormControl(itemSelected?._id),
            description: itemSelected?.description,
            color:itemSelected?.color,
            design:itemSelected?.design,
            large:itemSelected?.large,
            bottom:itemSelected?.bottom,
            high:itemSelected?.high,
            amount: new FormControl(1, [Validators.required, Validators.max(itemSelected?.stock || 0), Validators.min(1)]),
            stock: new FormControl(itemSelected?.stock),
            price: new FormControl(itemSelected?.price),
            items: [itemSelected?.items]
          })
        );
        console.log('arreglo de accesorios ' ,this.arrayAccessory.value);
    }

    this.form.get('searchAccessory')?.patchValue([]);
    this.sumarValores();
    this.sumarValoresOnAccount();
  }

  onAddItemOnAccount(element: number) {
      this.arrayOnAccount
        .push(
          this.formBuilder.group({
            number: "",
            amount: element
          })
        );
        console.log('arreglo de en cuenta ' ,this.arrayOnAccount.value);
        this.onAccount=0;
        this.sumarValoresOnAccount();
  }

  sumarValores() {
    this.total = this.arrayValuesAccessory.reduce(( sum, item ) => sum + ((item.price * item.amount)), 0)
    this.sumarValoresOnAccount();
  }

  sumarValoresOnAccount() {    
    this.totalOnAccount = this.arrayValuesOnAccount.reduce(( sum, item ) => sum +  item.amount, 0)    
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

  onSubmitAdd(){
    this.condicion=true;
  }

  onSave() {

    if (this.form.valid) {
      const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
      const values = {...this.form.value}
      console.log('values ',values);
      this.contractService.saveContract(values, headers).subscribe(
        (resp) => {
          window.print();
          this.findContract();
          this.limpiar();
          this.findClient();
          this.searchStock();
          this.condicion=false;
          console.log('RESPUESTAs', resp);
        }
      )
    }
    console.log(222)
  }

  findContract(){
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken '+this.authenticationToken)
    this.contractService.listContract( headers).subscribe(
      (contract) => {
         this.contract=contract;
      },
      (error) => {
        
        if( error.status === 401){
        
          console.log('usuario o claves incorrectos');
          this.route.navigate(['/app-login']);
        }else{
          console.log('error desconocido en el login');
        }
      });
    }

  searchStock() {
    this.form.valueChanges
      .pipe(
        takeUntil(this.unsubscribe),
        debounceTime(50),
        distinctUntilChanged((prev, curr) => prev.installDate === curr.installDate && prev.pickupDate === curr.pickupDate)
      )
      .subscribe(
        (value) => {
          if (value.installDate !== '' && value.pickupDate !== '' && value.installDate <= value.pickupDate) {
            this.arrayAccessory.clear();
            const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
            this.accessory$ = this.accessoryService.listStockAccessory(headers, { "installDate": value.installDate, "pickupDate": value.pickupDate });
          }
        }
      );
  }

  onSubmitExit(){

    this.limpiar();

    this.condicion=false;
    
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }
}
