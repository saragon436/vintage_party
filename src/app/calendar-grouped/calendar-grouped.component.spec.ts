import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarGroupedComponent } from './calendar-grouped.component';

describe('CalendarGroupedComponent', () => {
  let component: CalendarGroupedComponent;
  let fixture: ComponentFixture<CalendarGroupedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CalendarGroupedComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarGroupedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
