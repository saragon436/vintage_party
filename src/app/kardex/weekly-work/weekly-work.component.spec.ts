import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeeklyWorkComponent } from './weekly-work.component';

describe('WeeklyWorkComponent', () => {
  let component: WeeklyWorkComponent;
  let fixture: ComponentFixture<WeeklyWorkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WeeklyWorkComponent ]
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
