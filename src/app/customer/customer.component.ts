import { Component, EventEmitter, Output, resolveForwardRef  } from '@angular/core';
import { CustomerService } from '../Servicios/customer.service';
import { Router } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service'
import { HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';

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

  @Output() customEvent = new EventEmitter<any>();
  constructor(private customerService:CustomerService,private authenticationToken:AuthenticationToken, private route: Router) 
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
}
