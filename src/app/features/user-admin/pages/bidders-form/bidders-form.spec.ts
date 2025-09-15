import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BiddersForm } from './bidders-form';

describe('BiddersForm', () => {
  let component: BiddersForm;
  let fixture: ComponentFixture<BiddersForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiddersForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BiddersForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
