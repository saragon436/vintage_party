import { HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { debounceTime, distinctUntilChanged, map, Observable } from 'rxjs';
import { CustomerService } from '../Servicios/customer.service';
import { Router } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CustomerComponent } from '../customer/customer.component';

interface Customer {
  name: string;
  documentNumber: string;
  address: string;
  phone: string;
}

@Component({
  selector: 'app-contract',
  templateUrl: './contract.component.html',
  styleUrls: ['./contract.component.css']
})
export class ContractComponent {  
  
  constructor(private modalService: NgbModal,private customerService:CustomerService,private authenticationToken:AuthenticationToken, private route: Router) 
  {
    this.customer = [];
  }
  customer:Customer[];

  openModal() {
    this.modalService.open(CustomerComponent, { centered: true });
  }
  
  ngOnInit() {
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    console.log('this.authenticationToken '+this.authenticationToken)
    this.customerService.listCustomer( headers).subscribe(
      (customer) => {
         this.customer=customer;
         console.log('customer '+this.customer);
      },
      (error) => {
        
        if( error.status === 401){
        
          console.log('usuario o claves incorrectos');
  
        }else{
          console.log('error desconocido en el login');
        }
      });
  }
  
  model: any;
  search = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 2 ? []
        : Object.values(this.customer).filter(v => v.name.indexOf(term.toLowerCase()) > -1).slice(0, 10))
    );


}
