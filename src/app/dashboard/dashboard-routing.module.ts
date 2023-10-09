import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AccessoryComponent } from '../accessory/accessory.component';
import { ContractComponent } from '../contract/contract.component';
import { CustomerComponent } from '../customer/customer.component';
import { CalendarComponent } from '../calendar/calendar.component';
import { DashboardComponent } from './dashboard.component';

const routes: Routes = [
  {
    path: '', component: DashboardComponent, children: [
      { path: 'customer', component: CustomerComponent },
      { path: 'accessory', component: AccessoryComponent },
      { path: 'contract', component: ContractComponent },
      { path: 'calendar', component: CalendarComponent }
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class DashboardRoutingModule { }
