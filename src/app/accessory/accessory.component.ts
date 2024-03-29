import { HttpHeaders } from '@angular/common/http';
import { Component, EventEmitter, Output } from '@angular/core';
import { AccessoryService } from '../Servicios/accessory.service';
import { Router } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service'
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import {NgbModal, ModalDismissReasons} from '@ng-bootstrap/ng-bootstrap';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
interface Accesory {
  _id: string;
  description: string;
  color: string;
  design: string;
  large: string;
  bottom: string;
  high: string;
  stock:number;
  price:number;
  width:string;
  diameter:string;
  items:[];
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
  title = 'appBootstrap';
    
  closeResult: string = '';
  constructor(private accessoryService:AccessoryService,
    private authenticationToken:AuthenticationToken, 
    private route: Router,
    private formBuilder: FormBuilder,
    private modalService: NgbModal) 
  {
    this.accesorys = [];
    this.form = this.formBuilder.group({
      items: this.formBuilder.array([])
    })
   }
  _id='';
  condicion=false;
  diameter='';
  description = '';
  color = '';
  design = '';
  large = '';
  high = '';
  bottom = '';
  stock = 0;
  status = true;
  descripcionItem = '';
  amountItem = 0;
  price=0;
  width='';
  items=[];
  accesorys:Accesory[];
  mostrarBotones=true;
  idItemDelete='';
  isactive=false;

  get arrayAccessory(): FormArray {
    return this.form.controls['items'] as FormArray
  }

  get arrayValuesAccessory(): any[] {
    return this.arrayAccessory.value as any[]
  }

  open(content:any,valor:string) {
    this.idItemDelete=valor;
    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'}).result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  } 

  exportToExcel(): void {
    let listExport: any[] = [];
    this.accesorys.forEach((item: any) => {
      listExport.push({
        "Id": item._id,
        "Descripcion": item.description,
        "Color": item.color,
        "Diseño": item.design,
        "Largo": item.large,
        "Profundidad": item.bottom,
        "Alto": item.high,
        "Ancho": item.width,
        "Diametro": item.diameter, // O ajusta según el valor específico que necesites
        "Stock": item.stock, // O ajusta según el valor específico que necesites
        "Precio": item.price
      });
    });
    const headers = ['Id','Descripcion','Color',"Diseño","Largo",'Profundidad','Alto','Ancho','Diametro','Stock','Precio'];

    const worksheet = XLSX.utils.json_to_sheet(listExport);
    XLSX.utils.sheet_add_json(worksheet, listExport, { header: headers, skipHeader: true, origin: 'A2'});

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    FileSaver.saveAs(excelBlob, 'Mobiliarios.xlsx');
  
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

  deleteAccesosry(){
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken '+this.authenticationToken)
    this.accessoryService.deleteAccessory( headers,this.idItemDelete).subscribe(
      (accesorys) => {
        console.log("eliminar accesorios ",accesorys);
         this.accesorys=accesorys;
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
    this.onDeleteItemAll();
    this.condicion=true;
    this.mostrarBotones=true;
    this.isactive=false;
  }

  onSubmitExit(){
    this.description='';
        this.color='';
        this.design='';
        this.large='';
        this.high='';
        this.bottom='';
        this.stock=0;
        this.width='';
        this.price=0;
        this.items=[];
        this.diameter='';
        this.onDeleteItemAll();
    this.condicion=false;
  } 

  onSubmit(){
    if(this.isactive==false){
      this.isactive=true;
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
        diameter:this.diameter,
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
          this.stock=0;
          this.width='';
          this.price=0;
          this.items=[];
          this.onDeleteItemAll();
          this.condicion=false;
          this.mostrarBotones=true;
          this.diameter='';
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
  }

  findAccesoryById(valor:string){
    
    this.items=[];
    this.onDeleteItemAll();
    this.arrayAccessory.clear();
    console.log("this.arrayAccessory ",[this.arrayAccessory.value]);
    this.accesorys.forEach((response)=>{
      if(response._id==valor){
        this._id=response._id;
        this.description=response.description;
        this.color=response.color;
        this.design=response.design;
        this.large=response.large;
        this.high=response.high;
        this.bottom=response.bottom;
        this.stock=response.stock;
        this.width=response.width;
        this.price=response.price;
        this.diameter=response.diameter;
        response.items.forEach((res:any)=>{
          this.arrayAccessory.push(
            this.formBuilder.group({
              description: res.description,
              amount: res.amount
            })
            );
        })
        
        console.log("response.items ",response)
      }
    })
    this.condicion=true;
    this.mostrarBotones=false;
  }

  onUpdate(){
    var payload = {
      _id : this._id,
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
      diameter:this.diameter,
      status: true
    };
    console.log('payload '+payload);
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken '+this.authenticationToken)
    this.accessoryService.updateAccessory(payload, headers).subscribe(
      (data: any) => {
        console.log('ejemplo de actualizar')
        this.onDeleteItemAll();
        this.ngOnInit();
        this.description='';
        this.color='';
        this.design='';
        this.large='';
        this.high='';
        this.bottom='';
        this.stock=0;
        this.width='';
        this.price=0;
        this.items=[];
        this.diameter='';
        
        this.condicion=false;
        this.mostrarBotones=true;
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
    console.log("this.arrayAccessory.length eliminar", this.arrayAccessory.length);
    console.log("this.arrayAccessory eliminar", [this.arrayAccessory.value]);
  }

  onDeleteItem(index: number) {
    this.arrayAccessory.removeAt(index);
  }

  

}
