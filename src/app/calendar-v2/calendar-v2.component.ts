import { HttpHeaders } from '@angular/common/http';
import { Component, OnInit,ElementRef,ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service';
import { ContractService } from '../Servicios/contract.service';
import * as dateFns from 'date-fns';

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
  selector: 'app-calendar-v2',
  templateUrl: './calendar-v2.component.html',
  styleUrls: ['./calendar-v2.component.css']
})
export class CalendarV2Component {

  selectedDate: Date = new Date(); // Inicializa con la fecha actual por defecto
  @ViewChild('table') table!: ElementRef; // Obtén una referencia a la tabla HTML
  week: Date[] = [];
  weeks: Date[][] = [];
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



  ngOnInit(): void {
    const currentDate = new Date();
    this.week = this.calculateWeek(currentDate);
    console.log("semansa : " , this.week)
    this.findContract();
    this.updateCalendar();
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
  
    filterContracts(): void {
      // Filtra los contratos para el mes y año seleccionados
      const filteredContracts = this.contract.filter((contract) => {
        const installDate = new Date(contract.installDate);
        return (
          installDate.getMonth() === this.selectedDate.getMonth() &&
          installDate.getFullYear() === this.selectedDate.getFullYear()
        );
      });
    
      // Haz algo con los contratos filtrados (por ejemplo, asignarlos a una propiedad del componente)
      //this.filteredContracts = filteredContracts;
    }

    previousMonth() {
      this.selectedDate = dateFns.subMonths(this.selectedDate, 1);
      this.updateCalendar();
    }
    
    nextMonth() {
      this.selectedDate = dateFns.addMonths(this.selectedDate, 1);
      this.updateCalendar();
    }
    
    updateCalendar() {
      this.weeks = this.calculateMonth(this.selectedDate);
    }

    // calculateMonth(selectedDate: Date): Date[][] {
    //   const startOfMonth = dateFns.startOfMonth(selectedDate);
    //   const endOfMonth = dateFns.endOfMonth(selectedDate);
    
    //   const weeks: Date[][] = [];
    //   let currentWeek: Date[] = [];
    //   let currentDate = startOfMonth;
    
    //   while (currentDate <= endOfMonth) {
    //     if (currentWeek.length === 7) {
    //       weeks.push(currentWeek);
    //       currentWeek = [];
    //     }
    //     currentWeek.push(currentDate);
    //     currentDate = dateFns.addDays(currentDate, 1);
    //   }
    
    //   if (currentWeek.length > 0) {
    //     weeks.push(currentWeek);
    //   }
    
    //   return weeks;
    // }

    calculateMonth(selectedDate: Date): Date[][] {
      const startOfMonth = dateFns.startOfMonth(selectedDate);
      const endOfMonth = dateFns.endOfMonth(selectedDate);
    
      const firstDayOfMonth = dateFns.getDay(startOfMonth); // Obtén el día de la semana del primer día del mes (0: domingo, 1: lunes, ..., 6: sábado)
    
      const weeks: Date[][] = [];
      let currentWeek: Date[] = [];
      let currentDate = dateFns.subDays(startOfMonth, firstDayOfMonth); // Resta días para alinear con el domingo
    
      while (currentDate <= endOfMonth) {
        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
        currentWeek.push(currentDate);
        currentDate = dateFns.addDays(currentDate, 1);
      }
    
      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
      }
    
      return weeks;
    }
    
}
