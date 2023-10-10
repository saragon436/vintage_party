import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { FormsModule,ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DashboardComponent } from './dashboard.component';
import { ContractComponent } from '../contract/contract.component';
import { AccessoryComponent } from '../accessory/accessory.component';
import { CalendarComponent } from '../calendar/calendar.component';
import { CalendarV2Component } from '../calendar-v2/calendar-v2.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { CommonModule } from '@angular/common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';


@NgModule({
  declarations: [
    DashboardComponent,
    ContractComponent,
    AccessoryComponent,
    CalendarComponent,
    CalendarV2Component
  ],
  imports: [
    CommonModule,    
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    DashboardRoutingModule,
    NgbModule,
    NgSelectModule
  ],
  providers: [],
  bootstrap: []
})
export class DashboardModule { }
