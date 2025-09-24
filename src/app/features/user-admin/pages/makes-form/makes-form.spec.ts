import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MakesForm } from './makes-form';

describe('MakesForm', () => {
  let component: MakesForm;
  let fixture: ComponentFixture<MakesForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MakesForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MakesForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
