import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DashboardComponent } from './dashboard.component';
import { DashboardHomeComponent } from './dashboard-home/dashboard-home.component';
import { ContractComponent } from '../contract/contract.component';
import { AccessoryComponent } from '../accessory/accessory.component';
import { AccessoryAvailabilityComponent } from '../accessory/accessory-availability/accessory-availability.component';
import { CalendarComponent } from '../calendar/calendar.component';
import { CalendarV2Component } from '../calendar-v2/calendar-v2.component';
import { QuotationComponent } from '../quotation/quotation.component';
import { DistrictHeatmapComponent } from './district-heatmap/district-heatmap.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { CommonModule } from '@angular/common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';

// 👉 IMPORTAR DRAG & DROP
import { DragDropModule } from '@angular/cdk/drag-drop';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [
    DashboardComponent,
    DashboardHomeComponent,
    ContractComponent,
    AccessoryComponent,
    AccessoryAvailabilityComponent,
    CalendarComponent,
    CalendarV2Component,
    QuotationComponent,
    DistrictHeatmapComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    DashboardRoutingModule,
    NgbModule,
    NgSelectModule,

    // 👉 AGREGAR AQUÍ
    DragDropModule,
    SharedModule
  ],
  providers: [],
  bootstrap: []
})
export class DashboardModule { }
