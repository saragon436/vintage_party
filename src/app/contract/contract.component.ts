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
  width: string;
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
  operacion_1="";
  A_cuenta_1=0;
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
  _idContrat="";
  A_cuenta_fecha_1="";
  selectStatus="";
  A_cuenta_2=0;
  isDisabled=false;
  listarDetalle=false;

  openModal() {
    this.modalService.open(CustomerComponent, { centered: true });
  }

  exportToExcel(): void {
    let listExport: any[] = [];
    this.contract.forEach((item: any) => {
      listExport = [ ...listExport, ...item.listAccessories.map( (ele: any) => {
        return {
          "Contrato": item.codContract,
          "Cliente": item.customer.name,
          "Direccion":item.address,
          "Mes Contrato": item.createDate.slice(5,7),
          "F Creacion": item.createDate.slice(0,10),
          "F Instalacion": item.installDate.slice(0,10),
          "F Evento": item.eventDate.slice(0,10),
          "F Recojo": item.pickupDate.slice(0,10),
          "Descripcion": ele.description + " " + ele.design + " Largo= " +ele.large+ " Fondo= " +ele.bottom+ " Alto= " +ele.high+ " ",
          "Cantidad": ele.amount,
          "Precio": ele.price,
          "Total":ele.amount*ele.price,
          "Comentario":item.comment,
          "Estado":item.status
        };
      }), { "Contrato": item.codContract,"Cliente": item.customer.name,"Mes Contrato": item.createDate.slice(5,7),"F Creacion": item.createDate.slice(0,10),"Precio": "Total", "Total": item.amount,"Estado":item.status } ]
    });

    const headers = ['Contrato','Cliente',"Direccion","Mes Contrato",'F Creacion','F Instalacion','F Evento','F Recojo','Descripcion','Cantidad', "Precio", "Total","Comentario","Estado"];

    const worksheet = XLSX.utils.json_to_sheet(listExport);
    XLSX.utils.sheet_add_json(worksheet, listExport, { header: headers, skipHeader: true, origin: 'A2'});

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    FileSaver.saveAs(excelBlob, 'data.xlsx');
  
  }

  exportToExcelAccount(): void {
    let listExport: any[] = [];
    this.contract.forEach((item: any) => {
      listExport = [ ...listExport, ...item.onAccount.map( (ele: any) => {
        return {
          "Contrato": item.codContract,
          "Cliente": item.customer.name,
          "Mes Contrato": item.createDate.slice(5,7),
          "F Creacion": item.createDate.slice(0,10),
          "F Instalacion": item.installDate.slice(0,10),
          "F Evento": item.eventDate.slice(0,10),
          "F Recojo": item.pickupDate.slice(0,10),
          "Cantidad": ele.amount,
          "Fecha Pago": ele.createdDate.slice(0,10),
          "# Comprobante":ele.number,
          "Estado":item.status
        };
      }), { "Contrato": item.codContract,"Cliente": item.customer.name,"Mes Contrato": item.createDate.slice(5,7),"F Creacion": item.createDate.slice(0,10),"F Recojo": "Total", "Cantidad": item.amount,"Estado":item.status } ]
    });

    const headers = ['Contrato','Cliente',"Mes Contrato",'F Creacion','F Instalacion','F Evento','F Recojo','Cantidad','Fecha Pago', "# Comprobante","Estado"];

    const worksheet = XLSX.utils.json_to_sheet(listExport);
    XLSX.utils.sheet_add_json(worksheet, listExport, { header: headers, skipHeader: true, origin: 'A2'});

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    FileSaver.saveAs(excelBlob, 'vintageAcuenta.xlsx');
  
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
    this._idContrat="";
    this.fechaCreacion="";
    this.numberContract="";
          //this.fechaActual=response.createDate.slice(0,10);
    this.customerName="";
    this.phone="";
    this.documentNumber="";
    //this.codUser="";
    this.selectStatus="";
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
            width: itemSelected?.width,
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
    this.isDisabled=false;
    this.listarDetalle=false;
    this.codUser=this.authenticationToken.user;
  }

  openAcount(content:any) {
    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'}).result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
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

  addAcount(){
    
    
    var saldo=(this.A_cuenta_2-this.A_cuenta_1);
    if(saldo==0){
      console.log("entro a la condicional");
      this.selectStatus='Pagado';
    }

    console.log("this.totalBalance ",this.totalBalance)
    console.log("this.selectStatus ",this.selectStatus)
    var payload = {
      _id : this._idContrat,
      onAccount : [{amount: parseInt(this.A_cuenta_1.toString()),number:this.operacion_1,createdDate:this.A_cuenta_fecha_1}],
      //pickupDate: this.form.controls['pickupDate'].value
      status: this.selectStatus
    };
    console.log('payload '+payload);
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken '+this.authenticationToken)
    this.contractService.updateContract(payload, headers).subscribe(
      (data: any) => {
        this._idContrat='';
        this.A_cuenta_1=0;
        this.A_cuenta_fecha_1='';
        this.operacion_1='';
        this.A_cuenta_2=0;
        console.log('ejemplo de actualizar')
        this.onSubmitExit();
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
    if (this.form.valid &&  this.isDisabled==false) {
      const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
      const values = {...this.form.value}
      console.log('values ',values);
      this.contractService.saveContract(values, headers).subscribe(
        (resp) => { 
          this.isDisabled=true;
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
    this.listarDetalle=false;
    setTimeout(() => {
      
    window.print();
    }, 200);
  }

  printDocumentDetalle(){
    this.listarDetalle=true;
    setTimeout(() => {
      
    window.print();
    }, 200);
    
  }

  onOptionChange(id:string,status:string){
    var payload = {
      _id : id,
      status : status,
      onAccount: []
      //pickupDate: this.form.controls['pickupDate'].value
    };
    console.log('payload '+payload);
    if(status!="Anulado"){
      const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
      //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
      console.log('this.authenticationToken '+this.authenticationToken)
      this.contractService.updateContract(payload, headers).subscribe(
        (data: any) => {
          console.log('ejemplo de cambiar estado')
          this.findContract();
        },
        (error) => {
          
          if( error.status === 401){
          
            console.log('usuario o claves incorrectos');
            this.route.navigate(['/app-login']);
          }else{
            console.log('error desconocido en el login');
          }
        });
    }else{

    }
    
  }

  findContract(){
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken '+this.authenticationToken)
    this.contractService
    .listContract(headers)
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
          this._idContrat=valor;
          this.idItemDelete=valor;
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
          this.selectStatus=response.status;
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
                width:res.width,
                amount: res.amount,
                stock: res.stock,
                price: res.price,
                items: [res.items]
                //items: {description:res.items.description,amount:res.items.amount}
              })
            );
          })
          response.onAccount.forEach((res:any)=>{
            this.arrayOnAccount
            .push(
              this.formBuilder.group({
                amount: res.amount,
                number: res.number,
                createdDate: res.createdDate.slice(0,10)
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
      this.A_cuenta_2=this.totalBalance;
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
          console.log('error desconocido en el eliminar');
        }
      });
  }

  onSubmitExit(){

    this.findContract();
    this.limpiar();
    this.findClient();
    this.searchStock();
    //this.finDate();
    this._idContrat='';
    this.A_cuenta_1=0;
    this.A_cuenta_fecha_1='';
    this.operacion_1='';
    this.condicion=false;
    this.A_cuenta_2=0;
    this.listarDetalle=false;
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  imprimir(valor:string){

  }
}
