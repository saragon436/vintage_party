import { HttpHeaders } from '@angular/common/http';
import { Component, EventEmitter, Output } from '@angular/core';
import { AccessoryService } from '../Servicios/accessory.service';
import { Router } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service'
import { CommonModule } from '@angular/common';

interface Accesory {
  description: string;
  color: string;
  design: string;
  large: string;
  bottom: string;
  high: string;
  stock:number;
}

@Component({
  selector: 'app-accessory',
  templateUrl: './accessory.component.html',
  styleUrls: ['./accessory.component.css']
})
export class AccessoryComponent {  
  
  @Output() customEvent = new EventEmitter<any>();
  constructor(private accessoryService:AccessoryService,private authenticationToken:AuthenticationToken, private route: Router) 
  {
    this.accesorys = [];
   }
  condicion=false;
  description = '';
  color = '';
  design = '';
  large = '';
  high = '';
  bottom = '';
  stock = '';
  status = true;
  descripcionItem = '';
  amountItem = 0;
  items = [{description:'df',amount:1}];
  accesorys:Accesory[];

  ngOnInit() {
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken '+this.authenticationToken)
    this.accessoryService.listAccessory( headers).subscribe(
      (accesorys) => {
         this.accesorys=accesorys;
      },
      (error) => {
        
        if( error.status === 401){
        
          console.log('usuario o claves incorrectos');
  
        }else{
          console.log('error desconocido en el login');
        }
      });
  }

  onSubmitAdd(){
    this.condicion=true;
  }

  onSubmitExit(){
    
    this.condicion=false;
  } 

  onSubmit(){
    console.log('descripcion: ', this.description);
    console.log('color: ', this.color);
    console.log('diseño: ', this.design);
    console.log('largo: ', this.large);
    console.log('alto: ', this.high);
    console.log('fondo: ', this.bottom);
    console.log('stock: ', this.stock);

    var payload = {
      description : this.description,
      color : this.color,
      design : this.design,
      large : this.large,
      high : this.high,
      bottom : this.bottom,
      stock : this.stock,
      items : this.items,
      status: true
    };
    console.log('payload '+payload);
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken '+this.authenticationToken)
    this.accessoryService.addAccessory(payload, headers).subscribe(
      (data: any) => {
        console.log('ejemplo de guardar')
        this.ngOnInit();
        this.description='';
        this.color='';
        this.design='';
        this.large='';
        this.high='';
        this.bottom='';
        this.stock='';
        this.items=[];
        this.condicion=false;
      },
      (error) => {
        
        if( error.status === 401){
        
          console.log('usuario o claves incorrectos');
  
        }else{
          console.log('error desconocido en el login');
        }
      });
  }
}
