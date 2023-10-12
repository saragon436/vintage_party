import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarV2Component } from './calendar-v2.component';

describe('CalendarV2Component', () => {
  let component: CalendarV2Component;
  let fixture: ComponentFixture<CalendarV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CalendarV2Component ]
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
