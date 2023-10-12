import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AccessoryComponent } from '../accessory/accessory.component';
import { ContractComponent } from '../contract/contract.component';
import { CustomerComponent } from '../customer/customer.component';
import { CalendarComponent } from '../calendar/calendar.component';
import { CalendarV2Component } from '../calendar-v2/calendar-v2.component';
import { DashboardComponent } from './dashboard.component';

const routes: Routes = [
  {
    path: '', component: DashboardComponent, children: [
      { path: 'customer', component: CustomerComponent },
      { path: 'accessory', component: AccessoryComponent },
      { path: 'contract', component: ContractComponent },
      { path: 'calendar', component: CalendarComponent },
      { path: 'calendar-v2', component: CalendarV2Component }
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class DashboardRoutingModule { }
