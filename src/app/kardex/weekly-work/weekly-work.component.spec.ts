import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { WeeklyWorkComponent } from './weekly-work.component';
import { AuthenticationToken } from '../../Servicios/autentication-token.service';

describe('WeeklyWorkComponent', () => {
  let component: WeeklyWorkComponent;
  let fixture: ComponentFixture<WeeklyWorkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterTestingModule, HttpClientTestingModule],
      declarations: [ WeeklyWorkComponent ],
      providers: [AuthenticationToken],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeeklyWorkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
