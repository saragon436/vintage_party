import { HttpHeaders } from '@angular/common/http';
import { Component, OnInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service';
import { ContractService } from '../Servicios/contract.service';
import { addDays, subDays, startOfWeek,getDay ,endOfWeek, addWeeks, subWeeks, isTuesday } from 'date-fns';

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
  hourIniPickup: string;
  hourFinPickup: string;
  mobility: string;
  mobilityPickup: string;
  order: number;
  orderPickup: number;
  comment: string;
  listAccessories: [];
  onAccount: [];
  customer: { name: string, documentNumber: string, phone: string };
  userCreate: { userName: string };
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
    private cd: ChangeDetectorRef,
    private authenticationToken: AuthenticationToken,
    private contractService: ContractService) {
    this.contract = [];
  }

  public nombresDias: string[] = [
    
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
    "Lunes"
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
  toggleHighlight(contract: Contract) {
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
    console.log("semansa : ", this.week)
    this.findContract();
  }

  // calculateWeek(currentDate: Date): Date[] {
  //   const startOfWeek = dateFns.startOfWeek(currentDate);
  //   const week = [startOfWeek];

  //   for (let i = 1; i < 7; i++) {
  //     const nextDay = dateFns.addDays(startOfWeek, i);
  //     week.push(nextDay);
  //   }

  //   return week;
  // }

   calculateWeek(currentDate: Date): Date[] {
    // Encontrar el martes anterior al currentDate
    let startOfWeek: Date = currentDate;
    while (!isTuesday(startOfWeek)) { // Comprobamos si es martes
      startOfWeek = addDays(startOfWeek, -1);
    }
  
    const week: Date[] = [startOfWeek];
  
    for (let i = 1; i < 7; i++) {
      const nextDay: Date = addDays(startOfWeek, i);
      week.push(nextDay);
    }
  
    return week;
  }

  calculateNextWeek(startDate: Date): Date[] {
    const lastDayOfWeek = this.calculateWeek(startDate)[6]; // Obtén el último día de la semana calculada
  
    const nextWeek: Date[] = [];
    for (let i = 1; i <= 7; i++) {
      const nextDay = new Date(lastDayOfWeek);
      nextDay.setDate(lastDayOfWeek.getDate() + i);
      nextWeek.push(nextDay);
    }
  
    return nextWeek;
  }

  calcularNext() {
    if (this.week && this.week.length > 0) {
      // Obtén el último día de la semana actual
      const lastDayOfWeek = this.week[this.week.length - 1];
      
      // Calcula la fecha de inicio de la próxima semana
      const nextWeekStartDate = new Date(lastDayOfWeek);
      nextWeekStartDate.setDate(lastDayOfWeek.getDate() + 1); // Avanzar un día
      
      // Calcula la próxima semana
      this.week = this.calculateWeek(nextWeekStartDate);
    } else {
      // Si this.week no está definido, calcula la semana actual
      const currentDate = new Date();
      this.week = this.calculateWeek(currentDate);
    }
  }

  calcularbefore() {
    if (this.week && this.week.length > 0) {
      // Obtén el primer día de la semana actual
      const firstDayOfWeek = this.week[0];
      
      // Calcula la fecha de inicio de la semana anterior
      const previousWeekStartDate = new Date(firstDayOfWeek);
      previousWeekStartDate.setDate(firstDayOfWeek.getDate() - 7); // Retroceder una semana
      
      // Calcula la semana anterior
      this.week = this.calculateWeek(previousWeekStartDate);
    } else {
      // Si this.week no está definido, calcula la semana actual
      const currentDate = new Date();
      this.week = this.calculateWeek(currentDate);
    }
  }

  findContract() {
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken ' + this.authenticationToken)
    this.contractService
      .listContract(headers)
      .subscribe(
        (contract) => {
          this.contract = contract;
          console.log("contract ", this.contract)
        },
        (error) => {

          if (error.status === 401) {

            console.log('usuario o claves incorrectos');
            this.route.navigate(['/app-login']);
          } else {
            console.log('error desconocido en el login');
          }
        });
  }

  //  getContractsForDay(day: Date): Contract[] {
  //   return this.contract.filter((contract) => {
  //     const installDate = new Date(contract.installDate);
  //     return (
  //       installDate.getDate() === day.getDate() -1 &&
  //       installDate.getMonth() === day.getMonth() &&
  //       installDate.getFullYear() === day.getFullYear()
  //     );
  //   });
  // }

  // getContractsForDay(day: Date): Contract[] {
  //   const contractsForDay = this.contract.filter((contract) => {
  //     const installDate = new Date(contract.installDate);
  //     return (
  //       installDate.getDate() === day.getDate() - 1 &&
  //       installDate.getMonth() === day.getMonth() &&
  //       installDate.getFullYear() === day.getFullYear()
  //     );
  //   });

  //   // Asignar un valor por defecto a 'order' si es null o undefined
  //   contractsForDay.forEach((contract, index) => {
  //     if (contract.order == null) {
  //       contract.order = index + 1;
  //     }
  //   });

  //   return contractsForDay;
  // }

  getContractsForDay(day: Date): Contract[] {
    const contractsForDay = this.contract.filter((contract) => {
      const installDate = new Date(contract.installDate);
      return (
        installDate.getDate() === day.getDate() - 1 &&
        installDate.getMonth() === day.getMonth() &&
        installDate.getFullYear() === day.getFullYear()
      );
    });

    // Asignar un valor por defecto a 'order' si es null o undefined
    contractsForDay.forEach((contract, index) => {
      if (contract.order == null) {
        contract.order = index + 1;
      }
    });

    // Ordenar los contratos por 'order' en orden ascendente
    contractsForDay.sort((a, b) => a.order - b.order);

    return contractsForDay;
  }


  getContractsPikupDateForDay(day: Date): Contract[] {
    const contractsForDay = this.contract.filter((contract) => {
      const installDate = new Date(contract.pickupDate);
      return (
        installDate.getDate() === day.getDate() - 1 &&
        installDate.getMonth() === day.getMonth() &&
        installDate.getFullYear() === day.getFullYear()
      );
    });

    // Asignar un valor por defecto a 'order' si es null o undefined
    contractsForDay.forEach((contract, index) => {
      if (contract.orderPickup == null) {
        contract.orderPickup = index + 1;
      }
    });

    // Ordenar los contratos por 'order' en orden ascendente
    contractsForDay.sort((a, b) => a.orderPickup - b.orderPickup);

    return contractsForDay;
  }

  getBothcontract(day:Date): Contract[]{
    const contractsForDay = this.getContractsForDay(day);
    const contractsForDayPickup = this.getContractsPikupDateForDay(day);
    const combinedContracts = contractsForDay.concat(contractsForDayPickup);
    console.log("arreglo unificado : ",combinedContracts)
    return combinedContracts;
  }

  // getContractsPikupDateForDay(day: Date): Contract[] {
  //   return this.contract.filter((contract) => {
  //     const pikcupDate = new Date(contract.pickupDate);
  //     return (
  //       pikcupDate.getDate() === day.getDate() -1 &&
  //       pikcupDate.getMonth() === day.getMonth() &&
  //       pikcupDate.getFullYear() === day.getFullYear()
  //     );
  //   });
  // }


  onOptionChange(id: string, isSelected: boolean) {
    var payload = {
      _id: id,
      isSelected: isSelected,
      onAccount: []
      //pickupDate: this.form.controls['pickupDate'].value
    };
    console.log('payload ' + payload);
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken ' + this.authenticationToken)
    this.contractService.updateContract(payload, headers).subscribe(
      (data: any) => {
        console.log('ejemplo de cambiar estado')
        this.findContract();
      },
      (error) => {

        if (error.status === 401) {

          console.log('usuario o claves incorrectos');
          this.route.navigate(['/app-login']);
        } else {
          console.log('error desconocido en el login');
        }
      });

  }

  onOptionChangePickup(id: string, isSelectedPickup: boolean) {
    var payload = {
      _id: id,
      isSelectedPickup: isSelectedPickup,
      onAccount: []
      //pickupDate: this.form.controls['pickupDate'].value
    };
    console.log('payload ' + payload);
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken ' + this.authenticationToken)
    this.contractService.updateContract(payload, headers).subscribe(
      (data: any) => {
        console.log('ejemplo de cambiar estado')
        this.findContract();
      },
      (error) => {

        if (error.status === 401) {

          console.log('usuario o claves incorrectos');
          this.route.navigate(['/app-login']);
        } else {
          console.log('error desconocido en el login');
        }
      });

  }

  onOptionChangeMobility(id: string, mobility: string) {
    var payload = {
      _id: id,
      mobility: mobility,
      onAccount: []
      //pickupDate: this.form.controls['pickupDate'].value
    };
    console.log('payload ' + payload);

    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken ' + this.authenticationToken)
    this.contractService.updateContract(payload, headers).subscribe(
      (data: any) => {
        console.log('ejemplo de cambiar estado')
        this.findContract();
      },
      (error) => {

        if (error.status === 401) {

          console.log('usuario o claves incorrectos');
          this.route.navigate(['/app-login']);
        } else {
          console.log('error desconocido en el login');
        }
      });


  }

  onOptionChangeMobilityPickup(id: string, mobilityPickup: string) {
    var payload = {
      _id: id,
      mobilityPickup: mobilityPickup,
      onAccount: []
      //pickupDate: this.form.controls['pickupDate'].value
    };
    console.log('payload ' + payload);

    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    console.log('this.authenticationToken ' + this.authenticationToken)
    this.contractService.updateContract(payload, headers).subscribe(
      (data: any) => {
        console.log('ejemplo de cambiar estado')
        this.findContract();
      },
      (error) => {

        if (error.status === 401) {

          console.log('usuario o claves incorrectos');
          this.route.navigate(['/app-login']);
        } else {
          console.log('error desconocido en el login');
        }
      });


  }

  moveRowUp(day: Date, contract: Contract) {
    if (contract.order > 1) {
      const contractsForDay = this.getContractsForDay(day);
      const currentIndex = contractsForDay.findIndex((c) => c._id === contract._id);
      const previousIndex = contractsForDay.findIndex((c) => c.order === contract.order - 1);

      contract.order--;
      contractsForDay[previousIndex].order++;

      // Reordena la matriz en función del nuevo índice de orden
      contractsForDay.sort((a, b) => a.order - b.order);
      //this.onOptionChangeOrder(contract._id,contract.order);
    }
  }

  moveRowDown(day: Date, contract: Contract) {
    const contractsForDay = this.getContractsForDay(day);
    if (contract.order < contractsForDay.length) {
      const currentIndex = contractsForDay.findIndex((c) => c._id === contract._id);
      const nextIndex = contractsForDay.findIndex((c) => c.order === contract.order + 1);

      contract.order++;
      contractsForDay[nextIndex].order--;

      // Reordena la matriz en función del nuevo índice de orden
      contractsForDay.sort((a, b) => a.order - b.order);
      //this.onOptionChangeOrder(contract._id,contract.order);
    }
  }

  // moveRowUp(day: Date, index: number) {
  //   if (index > 0) {
  //     const contracts = this.getBothcontract(day);
  //     const temp = contracts[index];
  //     contracts[index] = contracts[index - 1];
  //     contracts[index - 1] = temp;
  //   }
  // }
  
  // moveRowDown(day: Date, index: number) {
  //   const contracts = this.getBothcontract(day);
  //   if (index < contracts.length - 1) {
  //     const temp = contracts[index];
  //     contracts[index] = contracts[index + 1];
  //     contracts[index + 1] = temp;
  //   }
  // }
  

  moveRowUpPickup(day: Date, contract: Contract) {
    if (contract.orderPickup > 1) {
      const contractsForDay = this.getContractsPikupDateForDay(day);
      const currentIndex = contractsForDay.findIndex((c) => c._id === contract._id);
      const previousIndex = contractsForDay.findIndex((c) => c.orderPickup === contract.orderPickup - 1);

      contract.orderPickup--;
      contractsForDay[previousIndex].orderPickup++;

      // Reordena la matriz en función del nuevo índice de orden
      contractsForDay.sort((a, b) => a.orderPickup - b.orderPickup);
      //this.onOptionChangeOrderPikcup(contract._id,contract.orderPickup);
    }
  }

  moveRowDownPickup(day: Date, contract: Contract) {
    const contractsForDay = this.getContractsPikupDateForDay(day);
    if (contract.orderPickup < contractsForDay.length) {
      const currentIndex = contractsForDay.findIndex((c) => c._id === contract._id);
      const nextIndex = contractsForDay.findIndex((c) => c.orderPickup === contract.orderPickup + 1);

      contract.orderPickup++;
      contractsForDay[nextIndex].orderPickup--;

      // Reordena la matriz en función del nuevo índice de orden
      contractsForDay.sort((a, b) => a.orderPickup - b.orderPickup);
      //this.onOptionChangeOrderPikcup(contract._id,contract.orderPickup);
    }
  }

  // onOptionChangeOrder(id:string,order:number){
  //   var payload = {
  //     _id : id,
  //     order : order,
  //     onAccount: []
  //     //pickupDate: this.form.controls['pickupDate'].value
  //   };
  //   console.log('payload '+payload);

  //     const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
  //     //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
  //     console.log('this.authenticationToken '+this.authenticationToken)
  //     this.contractService.updateContract(payload, headers).subscribe(
  //       (data: any) => {
  //         console.log('ejemplo de cambiar estado')
  //         this.findContract();
  //       },
  //       (error) => {

  //         if( error.status === 401){

  //           console.log('usuario o claves incorrectos');
  //           this.route.navigate(['/app-login']);
  //         }else{
  //           console.log('error desconocido en el login');
  //         }
  //       });


  // }

  // Modifica la firma de la función para aceptar la lista de contratos
  onOptionChangeOrder(contracts: Contract[]) {
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
  
    // Recorre el arreglo de contratos
    for (const contract of contracts) {
      const payload = {
        _id: contract._id,
        order: contract.order,
        onAccount: [],
      };
  
      this.contractService.updateContract(payload, headers).subscribe(
        (data: any) => {
          console.log(`Orden actualizada para el contrato con _id: ${contract._id}`);
          // Puedes manejar más lógica si es necesario
        },
        (error) => {
          if (error.status === 401) {
            console.log('Credenciales incorrectas');
            this.route.navigate(['/app-login']);
          } else {
            console.log('Error desconocido en el login');
          }
        }
      );
    }
  }
  

  onOptionChangeOrderPickup(contracts: Contract[]) {
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
  
    // Recorre el arreglo de contratos
    for (const contract of contracts) {
      const payload = {
        _id: contract._id,
        orderPickup: contract.orderPickup,
        onAccount: [],
      };
  
      this.contractService.updateContract(payload, headers).subscribe(
        (data: any) => {
          console.log(`Orden actualizada para el contrato con _id: ${contract._id}`);
          // Puedes manejar más lógica si es necesario
        },
        (error) => {
          if (error.status === 401) {
            console.log('Credenciales incorrectas');
            this.route.navigate(['/app-login']);
          } else {
            console.log('Error desconocido en el login');
          }
        }
      );
    }
  }

  saveHour(id: string, hourIni: string) {
    // Recorre el arreglo de contratos

    var payload = {
        _id: id,
        hourIni: hourIni,
        onAccount: [],
      };
  
      const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
      //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
      console.log('this.authenticationToken ' + this.authenticationToken)
      this.contractService.updateContract(payload, headers).subscribe(
        (data: any) => {
          console.log('ejemplo de cambiar estado')
          this.findContract();
        },
        (error) => {
  
          if (error.status === 401) {
  
            console.log('usuario o claves incorrectos');
            this.route.navigate(['/app-login']);
          } else {
            console.log('error desconocido en el login');
          }
        });
    
  }

  saveHourFin(id: string, hourFin: string) {
    // Recorre el arreglo de contratos
    var payload = {
        _id: id,
        hourFin: hourFin,
        onAccount: [],
      };
      console.log('payload ' + payload);
  
      const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
      //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
      console.log('this.authenticationToken ' + this.authenticationToken)
      this.contractService.updateContract(payload, headers).subscribe(
        (data: any) => {
          console.log('ejemplo de cambiar estado')
          this.findContract();
        },
        (error) => {
  
          if (error.status === 401) {
  
            console.log('usuario o claves incorrectos');
            this.route.navigate(['/app-login']);
          } else {
            console.log('error desconocido en el login');
          }
        });
  
  }

  saveHourPickup(id: string, hourIniPickup: string) {
    // Recorre el arreglo de contratos

    var payload = {
        _id: id,
        hourIniPickup: hourIniPickup,
        onAccount: [],
      };
  
      const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
      //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
      console.log('this.authenticationToken ' + this.authenticationToken)
      this.contractService.updateContract(payload, headers).subscribe(
        (data: any) => {
          console.log('ejemplo de cambiar estado')
          this.findContract();
        },
        (error) => {
  
          if (error.status === 401) {
  
            console.log('usuario o claves incorrectos');
            this.route.navigate(['/app-login']);
          } else {
            console.log('error desconocido en el login');
          }
        });
    
  }

  saveHourFinPickup(id: string, hourFinPickup: string) {
    // Recorre el arreglo de contratos
    var payload = {
        _id: id,
        hourFinPickup: hourFinPickup,
        onAccount: [],
      };
      console.log('payload ' + payload);
  
      const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
      //const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
      console.log('this.authenticationToken ' + this.authenticationToken)
      this.contractService.updateContract(payload, headers).subscribe(
        (data: any) => {
          console.log('ejemplo de cambiar estado')
          this.findContract();
        },
        (error) => {
  
          if (error.status === 401) {
  
            console.log('usuario o claves incorrectos');
            this.route.navigate(['/app-login']);
          } else {
            console.log('error desconocido en el login');
          }
        });
  
  }

}
