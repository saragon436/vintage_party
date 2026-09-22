import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { CalendarV2Component } from './calendar-v2.component';
import { AuthenticationToken } from '../Servicios/autentication-token.service';

describe('CalendarV2Component', () => {
  let component: CalendarV2Component;
  let fixture: ComponentFixture<CalendarV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterTestingModule, HttpClientTestingModule],
      declarations: [ CalendarV2Component ],
      providers: [AuthenticationToken],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
