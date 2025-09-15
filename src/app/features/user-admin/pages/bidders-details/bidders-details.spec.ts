import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BiddersDetails } from './bidders-details';

describe('BiddersDetails', () => {
  let component: BiddersDetails;
  let fixture: ComponentFixture<BiddersDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiddersDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BiddersDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
