import { HttpHeaders } from '@angular/common/http';
import { Component, OnInit,ElementRef,ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service';
import { ContractService } from '../Servicios/contract.service';
import * as dateFns from 'date-fns';

import * as XLSX from 'xlsx';

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
  district: string;
  hourIni: string;
  hourFin: string;
  comment: string;
  listAccessories:[];
  onAccount:[];
  customer:{name:string,documentNumber:string,phone:string};
  userCreate:{userName:string};
  isSelected: boolean;
  isSelectedPickup: boolean;
}


@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {
  @ViewChild('table') table!: ElementRef; // Obtén una referencia a la tabla HTML
  week: Date[] = [];
  contract: Contract[];
   constructor(private route: Router,
     private authenticationToken: AuthenticationToken,
     private contractService: ContractService){
       this.contract = [];
   }

   public nombresDias: string[] = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo"
  ];

  public nombresMeses: string[] = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre"
  ];

  // Function to toggle the isSelected property
  toggleHighlight(contract:Contract) {
  contract.isSelected = !contract.isSelected;
  }

  exportToExcel(): void {
    const tableToExport = this.table.nativeElement;
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(tableToExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
    
    // Guarda el archivo Excel
    XLSX.writeFile(wb, 'Programacion.xlsx');
  }

  ngOnInit(): void {
    const currentDate = new Date();
    this.week = this.calculateWeek(currentDate);
    console.log("semansa : " , this.week)
    this.findContract();
  }

  calculateWeek(currentDate: Date): Date[] {
    const startOfWeek = dateFns.startOfWeek(currentDate);
    const week = [startOfWeek];

    for (let i = 1; i < 7; i++) {
      const nextDay = dateFns.addDays(startOfWeek, i);
      week.push(nextDay);
    }

    return week;
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

     getContractsForDay(day: Date): Contract[] {
      return this.contract.filter((contract) => {
        const installDate = new Date(contract.installDate);
        return (
          installDate.getDate() === day.getDate() -1 &&
          installDate.getMonth() === day.getMonth() &&
          installDate.getFullYear() === day.getFullYear()
        );
      });
    }

    getContractsPikupDateForDay(day: Date): Contract[] {
      return this.contract.filter((contract) => {
        const pikcupDate = new Date(contract.pickupDate);
        return (
          pikcupDate.getDate() === day.getDate() -1 &&
          pikcupDate.getMonth() === day.getMonth() &&
          pikcupDate.getFullYear() === day.getFullYear()
        );
      });
    }


    onOptionChange(id:string,isSelected:boolean){
      var payload = {
        _id : id,
        isSelected : isSelected,
        onAccount: []
        //pickupDate: this.form.controls['pickupDate'].value
      };
      console.log('payload '+payload);
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
      
    }

    onOptionChangePickup(id:string,isSelectedPickup:boolean){
      var payload = {
        _id : id,
        isSelectedPickup : isSelectedPickup,
        onAccount: []
        //pickupDate: this.form.controls['pickupDate'].value
      };
      console.log('payload '+payload);
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
      
    }

}
