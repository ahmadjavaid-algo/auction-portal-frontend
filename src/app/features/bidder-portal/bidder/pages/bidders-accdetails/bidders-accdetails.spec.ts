import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BiddersAccdetails } from './bidders-accdetails';

describe('BiddersAccdetails', () => {
  let component: BiddersAccdetails;
  let fixture: ComponentFixture<BiddersAccdetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiddersAccdetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BiddersAccdetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
