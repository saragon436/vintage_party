import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { AuthenticationService } from './Servicios/authentication.service';
import { AuthenticationToken } from './Servicios/autentication-token.service';
import { AccessoryService } from './Servicios/accessory.service';
import { CustomerService } from './Servicios/customer.service';
import { LoginComponent } from './login/login.component';
import { CustomerComponent } from './customer/customer.component';
import { FormsModule,ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module'
import { DashboardModule } from './dashboard/dashboard.module';
import { CommonModule } from '@angular/common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { WeeklyWorkComponent } from './kardex/weekly-work/weekly-work.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    CustomerComponent,
    WeeklyWorkComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
    DashboardModule,
    CommonModule,
    NgbModule
  ],
  providers: [AuthenticationService,AuthenticationToken,AccessoryService,CustomerService],
  bootstrap: [AppComponent]
})
export class AppModule { }
