import { HttpHeaders } from '@angular/common/http';
import { Component, EventEmitter, Output } from '@angular/core';
import { AccessoryService } from '../Servicios/accessory.service';
import { Router } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service'
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';

interface Accesory {
  description: string;
  color: string;
  design: string;
  large: string;
  bottom: string;
  high: string;
  stock:number;
  price:number;
  width:number;
}

interface Item {
  description: string;
  amount: string;
}

@Component({
  selector: 'app-accessory',
  templateUrl: './accessory.component.html',
  styleUrls: ['./accessory.component.css']
})
export class AccessoryComponent {  
  form: FormGroup;
  @Output() customEvent = new EventEmitter<any>();
  constructor(private accessoryService:AccessoryService,
    private authenticationToken:AuthenticationToken, 
    private route: Router,
    private formBuilder: FormBuilder) 
  {
    this.accesorys = [];
    this.form = this.formBuilder.group({
      items: this.formBuilder.array([])
    })
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
  price=0;
  width='';
  items=[];
  accesorys:Accesory[];

  get arrayAccessory(): FormArray {
    return this.form.controls['items'] as FormArray
  }

  get arrayValuesAccessory(): any[] {
    return this.arrayAccessory.value as any[]
  }

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
          this.route.navigate(['/app-login']);
        }else{
          console.log('error desconocido en el login');
        }
      });
  }

  onSubmitAdd(){
    this.condicion=true;
  }

  onSubmitExit(){
    this.description='';
        this.color='';
        this.design='';
        this.large='';
        this.high='';
        this.bottom='';
        this.stock='';
        this.width='';
        this.price=0;
        this.items=[];
        this.onDeleteItemAll();
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
    console.log('items',this.arrayAccessory.value);
    var payload = {
      description : this.description,
      color : this.color,
      design : this.design,
      large : this.large,
      high : this.high,
      bottom : this.bottom,
      stock : this.stock,
      items : this.arrayAccessory.value,
      price:this.price,
      width:this.width,
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
        this.width='';
        this.price=0;
        this.items=[];
        this.onDeleteItemAll();
        this.condicion=false;
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

  onAddItem(element: string){
    

      this.arrayAccessory
        .push(
          this.formBuilder.group({
            description: "",
            amount: element
          })
        );
        console.log('arreglo de accesorios ' ,this.arrayAccessory.value);
    

    this.form.get('searchAccessory')?.patchValue([]);
  }

  onDeleteItemAll() {
    for (let i = 0; i < this.arrayAccessory.length; i++) {
      this.arrayAccessory.removeAt(i);
    }

  }

  onDeleteItem(index: number) {
    this.arrayAccessory.removeAt(index);
  }

  

}
