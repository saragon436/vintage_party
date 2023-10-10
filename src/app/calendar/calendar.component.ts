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
    this.findContract();
  }

  calculateWeek(currentDate: Date): Date[] {
    const startOfWeek = dateFns.startOfWeek(currentDate);
    const week = [startOfWeek];

    for (let i = 1; i < 8; i++) {
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
    
    getDNIForContract(contractCode: string): string {
      // Implementa la lógica para obtener el DNI correspondiente al código de contrato
      // Puedes buscar en tus contratos y devolver el DNI adecuado
      const matchingContract = this.contract.find((contract) => {
        return contract.codContract === contractCode;
      });
  
      return matchingContract && matchingContract.customer ? matchingContract.customer.documentNumber : '';
    }
  
    getCommentForContract(contractCode: string): string {
      // Implementa la lógica para obtener el comentario correspondiente al código de contrato
      // Puedes buscar en tus contratos y devolver el comentario adecuado
      const matchingContract = this.contract.find((contract) => {
        return contract.codContract === contractCode;
      });
  
      return matchingContract ? matchingContract.comment : '';
    }
  

}
