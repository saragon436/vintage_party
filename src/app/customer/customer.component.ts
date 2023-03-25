import { Component, EventEmitter, Output, resolveForwardRef  } from '@angular/core';
import { CustomerService } from '../Servicios/customer.service';
import { Router } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service'
import { HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {NgbModal, ModalDismissReasons} from '@ng-bootstrap/ng-bootstrap';

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
    
  closeResult: string = '';
  @Output() customEvent = new EventEmitter<any>();
  constructor(private customerService:CustomerService,private authenticationToken:AuthenticationToken, private route: Router,private modalService: NgbModal) 
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
  ngOnInit() {
    this.findCustomer();
  }

  findCustomer(){
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken '+this.authenticationToken)
    this.customerService.listCustomer( headers).subscribe(
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
        console.log('ejemplo de guardar')
        this.ngOnInit();
        this.name='';
        this.documentNumber='';
        this.address='';
        this.phone='';
        this.condicion=false;
        this.mostrarBotones=true;
      },
      (error) => {
        
        if( error.status === 401){
        
          console.log('usuario o claves incorrectos');
  
        }else{
          console.log('error desconocido en el login');
        }
      });
  
  }

  updateCustomer(){
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
        
        if( error.status === 401){
        
          console.log('usuario o claves incorrectos');
  
        }else{
          console.log('error desconocido en el login');
        }
      });
  
  }

  onSubmitExit(){
    this.name='';
    this.documentNumber='';
    this.address='';
    this.phone='';
    this.condicion=false;
    this.mostrarBotones=true;
    this.condicion=false;
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
}
