import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AccessoryComponent } from '../accessory/accessory.component';
import { ContractComponent } from '../contract/contract.component';
import { CustomerComponent } from '../customer/customer.component';
import { CalendarComponent } from '../calendar/calendar.component';
import { CalendarV2Component } from '../calendar-v2/calendar-v2.component';
import { DashboardComponent } from './dashboard.component';
import { WeeklyWorkComponent } from '../kardex/weekly-work/weekly-work.component';
import { CalendarGroupedComponent } from '../calendar-grouped/calendar-grouped.component';
import { QuotationComponent } from '../quotation/quotation.component';


const routes: Routes = [
  {
    path: '', component: DashboardComponent, children: [
      { path: 'customer', component: CustomerComponent },
      { path: 'accessory', component: AccessoryComponent },
      { path: 'contract', component: ContractComponent },
      { path: 'calendar', component: CalendarComponent },
      { path: 'calendar-v2', component: CalendarV2Component },
      { path: 'weekly-work', component: WeeklyWorkComponent },  // 👈 NUEVO
      { path: 'calendar-grouped', component: CalendarGroupedComponent },
      { path: 'quotation', component: QuotationComponent }  // 👈 NUEVO
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class DashboardRoutingModule { }
