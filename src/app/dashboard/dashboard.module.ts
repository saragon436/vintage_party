import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DashboardComponent } from './dashboard.component';
import { ContractComponent } from '../contract/contract.component';
import { AccessoryComponent } from '../accessory/accessory.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [
    DashboardComponent,
    ContractComponent,
    AccessoryComponent
  ],
  imports: [
    CommonModule,    
    FormsModule,
    HttpClientModule,
    DashboardRoutingModule
  ],
  providers: [],
  bootstrap: []
})
export class DashboardModule { }
