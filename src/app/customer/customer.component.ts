import { Component, EventEmitter, Input, Optional, Output, resolveForwardRef  } from '@angular/core';
import { CustomerService } from '../Servicios/customer.service';
import { Router } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service'
import { HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {NgbActiveModal, NgbModal, ModalDismissReasons} from '@ng-bootstrap/ng-bootstrap';
import { ConfirmDialogService } from '../shared/confirm-dialog/confirm-dialog.service';
import { CustomerHistoryComponent } from './customer-history/customer-history.component';

interface Customer {
  _id: string
  name: string;
  documentNumber: string;
  address: string;
  phone: string;
}

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css']
})
export class CustomerComponent {
  customer:Customer[];
  title = 'appBootstrap';

  // 👇 cuando se abre en modal desde Contrato/Cotización para dar de alta
  // un cliente al vuelo (buscador sin resultados), este input trae el
  // texto ya escrito para no hacer que el usuario lo vuelva a tipear.
  @Input() quickAddName?: string;

  closeResult: string = '';
  @Output() customEvent = new EventEmitter<any>();
  constructor(private customerService:CustomerService,private authenticationToken:AuthenticationToken, private route: Router,private modalService: NgbModal,private confirmDialog: ConfirmDialogService, @Optional() public activeModal: NgbActiveModal)
  {
    this.customer = [];
  }
  _id="";
  condicion=false;
  mostrarBotones=true;
  name='';
  documentNumber='';
  address='';
  phone='';
  idItemDelete='';
  isSubmitting=false;
  searchValue='';
  ngOnInit() {
    if (this.activeModal && this.quickAddName) {
      // Modo alta rápida: saltar el listado e ir directo al formulario.
      this.condicion = true;
      this.mostrarBotones = true;
      this.name = this.quickAddName;
      return;
    }
    this.findCustomer();
  }

  closeQuickAdd() {
    this.activeModal?.dismiss('Cross click');
  }

  onGlobalSearch(): void {
    this.findCustomer();
  }

  clearGlobalSearch(): void {
    this.searchValue = '';
    this.findCustomer();
  }

  findCustomer(){
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken '+this.authenticationToken)
    this.customerService.listCustomer( headers, this.searchValue).subscribe(
      (customer) => {
         this.customer=customer;
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

  findCustomerById(valor:string){
    this.customer.forEach((response)=>{
      if(response.documentNumber==valor){
        this._id=response._id;
        this.documentNumber=response.documentNumber;
        this.name=response.name;
        this.address=response.address;
        this.phone=response.phone;
      }
    })
    this.condicion=true;
    this.mostrarBotones=false;
  }

  deleteAccesosry(){
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken '+this.authenticationToken)
    this.customerService.deleteCustomer(this.idItemDelete, headers).subscribe(
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

  onSubmitAdd(){
    this.condicion=true;
    this.mostrarBotones=true;
  }

  onSubmit(){
    if(this.isSubmitting){
      return;
    }
    this.isSubmitting=true;
    var payload = {
      name : this.name,
      documentNumber : this.documentNumber,
      address : this.address,
      phone: this.phone,
      status:true
    };
    console.log('payload '+payload);
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken '+this.authenticationToken)
    this.customerService.addCustomer(payload, headers).subscribe(
      (data: any) => {
        this.isSubmitting=false;
        if (this.activeModal) {
          // Modo alta rápida: devolver el cliente recién creado a quien
          // abrió el modal (Contrato/Cotización) para seleccionarlo ahí.
          this.activeModal.close(data);
          return;
        }
        this.findCustomer();
        this.name='';
        this.documentNumber='';
        this.address='';
        this.phone='';
        this.condicion=false;
        this.mostrarBotones=true;
      },
      (error) => {
        this.isSubmitting=false;
        if( error.status === 401){

          console.log('usuario o claves incorrectos');

        }else{
          console.log('error desconocido en el login');
        }
      });

  }

  async updateCustomer(){
    if(this.isSubmitting){
      return;
    }
    const confirmado = await this.confirmDialog.confirm(
      '¿Desea actualizar los datos de este cliente?',
      'Actualizar Cliente'
    );
    if(!confirmado){
      return;
    }
    this.isSubmitting=true;
    var payload = {
      _id: this._id,
      name : this.name,
      documentNumber : this.documentNumber,
      address : this.address,
      phone: this.phone,
      status:true
    };
    console.log('payload '+payload);
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken '+this.authenticationToken)
    this.customerService.updateCustomer(payload, headers).subscribe(
      (data: any) => {
        this.isSubmitting=false;
        console.log('ejemplo de update')
        this.ngOnInit();
        this.name='';
        this.documentNumber='';
        this.address='';
        this.phone='';
        this.condicion=false;
        this.mostrarBotones=true;
      },
      (error) => {
        this.isSubmitting=false;
        if( error.status === 401){

          console.log('usuario o claves incorrectos');

        }else{
          console.log('error desconocido en el login');
        }
      });

  }

  onSubmitExit(){
    if (this.activeModal) {
      this.activeModal.dismiss('Cross click');
      return;
    }
    this.name='';
    this.documentNumber='';
    this.address='';
    this.phone='';
    this.condicion=false;
    this.mostrarBotones=true;
    this.condicion=false;
  }

  verSeguimiento(item: Customer) {
    const modalRef = this.modalService.open(CustomerHistoryComponent, {
      size: 'xl',
      scrollable: true,
      centered: true,
    });
    modalRef.componentInstance.customer = item;
  }

  open(content:any,valor:string) {
    this.idItemDelete=valor;
    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title', centered: true}).result.then((result) => {
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
}
