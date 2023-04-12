import { HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { debounceTime, distinctUntilChanged, map, Observable, Subject, takeUntil } from 'rxjs';
import { CustomerService } from '../Servicios/customer.service';
import { Router } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
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
  createdDate:string;
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
  comment: string;
  listAccessories:[];
  onAccount:[];
  customer:{name:string,documentNumber:string,phone:string};
  userCreate:{userName:string};
}

@Component({
  selector: 'app-contract',
  templateUrl: './contract.component.html',
  styleUrls: ['./contract.component.css']
})
export class ContractComponent {
  fechaActual: string="";
  fechaCreacion: string="";
  contract:Contract[];
  contract2:Contract[];
  form: FormGroup;
  customer$: Observable<Customer[]>;
  accessory$: Observable<Accessory[]>;
  public unsubscribe: Subject<void>;
  total=0;
  totalOnAccount=0;
  totalBalance=0;
  onAccount=0;
  customerName="";
  numberContract="";
  cliente: any;
  idItemDelete='';
  closeResult: string = '';
  searchValue:string = '';
  selectedCustomer = { documentNumber: '12345', name: 'John Doe' };
  phone='';
  documentNumber="";
  constructor(
    private modalService: NgbModal,
    private customerService: CustomerService,
    private accessoryService: AccessoryService,
    private contractService: ContractService,
    private authenticationToken: AuthenticationToken,
    private route: Router,
    private formBuilder: FormBuilder) {      
      this.contract = [];
      this.contract2 = [];
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
        createDate: new FormControl('', Validators.required),
        installDate: new FormControl('', Validators.required),
        eventDate: new FormControl('', Validators.required),
        pickupDate: new FormControl('', Validators.required),
        address: new FormControl('', Validators.required),
        //createDate: new FormControl('', Validators.required),
        amount: new FormControl(0, Validators.required),
        comment: new FormControl('', Validators.required),
        price: new FormControl(0, Validators.required),
        listAccessories: this.formBuilder.array([]),
        onAccount: this.formBuilder.array([])
      });
  }
  condicion=false;
  mostrarBotones=false;
  codUser='';
  openModal() {
    this.modalService.open(CustomerComponent, { centered: true });
  }

  exportToExcel(): void {
    let listExport: any[] = [];
    this.contract.forEach((item: any) => {
      listExport = [ ...listExport, ...item.listAccessories.map( (ele: any) => {
        return {
          "Contrato": item.codContract,
          "F Creacion": item.createDate,
          "F Instalacion": item.installDate,
          "F Evento": item.eventDate,
          "F Recojo": item.pickupDate,
          "Descripcion": ele.description,
          "Cantidad": ele.amount,
          "Precio": ele.price
        };
      }), { "Cantidad": "Total", "Precio": item.amount } ]
    });

    const headers = ['Contrato','F Creacion','F Instalacion','F Evento','F Recojo','Descripcion','Cantidad', "Precio"];

    const worksheet = XLSX.utils.json_to_sheet(listExport);
    XLSX.utils.sheet_add_json(worksheet, listExport, { header: headers, skipHeader: true, origin: 'A2'});

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
      createDate: new FormControl('', Validators.required),
      pickupDate: new FormControl('', Validators.required),
      amount: new FormControl(0, Validators.required),
      comment: new FormControl('', Validators.required),
      address: new FormControl('', Validators.required),
      price: new FormControl(0, Validators.required),
      listAccessories: this.formBuilder.array([]),
      onAccount: this.formBuilder.array([])
    });
    this.totalBalance=0;
  }

  ngOnInit() {
    this.findClient();
    // if(this.mostrarBotones==true){
    //   this.searchStock();
    // }
    this.searchStock();
    this.findContract();
  }

  finDate(){
    const fecha = new Date();
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear().toString();
    this.fechaActual = `${anio}-${mes}-${dia}`;
    this.form.controls['createDate'].setValue(this.fechaActual);
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
        console.log('this.arrayAccessory.controls.length ' ,this.arrayAccessory.controls.length);
        console.log('this.arrayAccessory.controls ' ,this.arrayAccessory.controls);
    }

    this.form.get('searchAccessory')?.patchValue([]);
    this.sumarValores();
    this.sumarValoresOnAccount();
  }

  onAddCustomer(element: NgSelectComponent) {

    const itemSelected = element.selectedValues[0] as Customer;
    if (itemSelected) {
      this.customerName=itemSelected?.name;
    }
    console.log("this.customerName ",this.customerName);
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
    this.form.get('amount')?.setValue(this.total);
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
    this.finDate();
    this.condicion=true;
    this.mostrarBotones=true;
  }

  open(content:any,valor:string) {
    this.idItemDelete=valor;
    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'}).result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  } 

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return  `with: ${reason}`;
    }
  }

  startTimer() {
    setTimeout(() => {
      window.print();
          this.findContract();
          this.limpiar();
          this.findClient();
          this.searchStock();
          //this.finDate();
      this.condicion=false;
    }, 100); // 1000 milisegundos = 1 segundo
  }

  onSave() {

    if (this.form.valid) {
      const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
      const values = {...this.form.value}
      console.log('values ',values);
      this.contractService.saveContract(values, headers).subscribe(
        (resp) => { 
          this.numberContract=resp.codContract;
          console.log('this.numberContract', this.numberContract);
          this.codUser=this.authenticationToken.user;
          this.customerName=resp.customer.name;
          this.phone=resp.customer.phone;
          this.documentNumber=resp.customer.documentNumber;
          //window.print();
          this.startTimer();
          //this.findContract();
          //this.limpiar();
          //this.findClient();
          //this.searchStock();
          //this.finDate();
          //this.condicion=false;
         
          console.log('RESPUESTAs', resp);
        }
      )
    }
    console.log(222)
  }

  printDocument(){
    window.print();
  }

  findContract(){
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken '+this.authenticationToken)
    this.contractService
    .listContract( headers)
    .subscribe(
      (contract) => {
          this.contract=contract;
          console.log("contract ",this.contract)
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

    findAccesoryById(valor:string){
      //this.items=[];
      console.log("valor ",valor);
      // this.arrayAccessory.clear();
      console.log("this.arrayAccessory ",[this.arrayAccessory.value]);
      this.contract.forEach((response)=>{
        if(response._id==valor){
          console.log("response ",response)
          //this.form.controls.get('customer')?.setValue(response.customer);
          this.form.controls['customer'].setValue(response.customer.documentNumber +' '+response.customer.name);
          this.numberContract=response.codContract;
          this.form.controls['address'].setValue(response.address);
          this.form.controls['comment'].setValue(response.comment);
          this.form.controls['installDate'].setValue(response.installDate.slice(0,10));
          this.form.controls['eventDate'].setValue(response.eventDate.slice(0,10));
          this.form.controls['pickupDate'].setValue(response.pickupDate.slice(0,10));
          this.form.controls['createDate']?.setValue(response.createDate.slice(0,10));
          this.fechaCreacion=response.createDate.slice(0,10);
          //this.fechaActual=response.createDate.slice(0,10);
          this.customerName=response.customer.name;
          this.phone=response.customer.phone;
          this.documentNumber=response.customer.documentNumber;
          this.codUser=response?.userCreate?.userName;
          response.listAccessories.forEach((res:any)=>{
            this.arrayAccessory
            .push(
              this.formBuilder.group({
                id: res._id,
                description: res.description,
                color:res.color,
                design:res.design,
                large:res.large,
                bottom:res.bottom,
                high:res.high,
                amount: res.amount,
                stock: res.stock,
                price: res.price,
                items: res.items
              })
            );
          })
          response.onAccount.forEach((res:any)=>{
            this.arrayOnAccount
            .push(
              this.formBuilder.group({
                amount: res.amount,
                number: res.number,
                createdDate: response.installDate.slice(0,10)
              })
            );
          })
          console.log("response.arrayAccessory ",this.arrayAccessory.value)
          console.log("response.listAccesories ",response.listAccessories)
          console.log('this.arrayAccessory.controls.length ' ,this.arrayAccessory.controls);
          console.log('this.arrayOnAccount ' ,this.arrayOnAccount);
        }
      })
      this.sumarValores();
      this.sumarValoresOnAccount();
      this.condicion=true;
      //this.printDocument();
      this.mostrarBotones=false;
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
            //this.arrayAccessory.clear();
            const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
            this.accessory$ = this.accessoryService.listStockAccessory(headers, { "installDate": value.installDate, "pickupDate": value.pickupDate });
          }
        }
      );
  }

  deleteContract(){
    var payload = {
      _id : this.idItemDelete,
      onAccount:[],
      status:'Anulado'
    };
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken '+this.authenticationToken)
    this.contractService.updateContract(payload, headers).subscribe(
      (data:any) => {
        console.log("eliminar accesorios ",data);
         this.ngOnInit();
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

  onSubmitExit(){

    this.findContract();
    this.limpiar();
    this.findClient();
    this.searchStock();
    //this.finDate();

    this.condicion=false;
    
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  imprimir(valor:string){

  }
}
