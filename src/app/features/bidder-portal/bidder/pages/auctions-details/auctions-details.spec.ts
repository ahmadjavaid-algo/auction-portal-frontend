import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuctionsDetails } from './auctions-details';

describe('AuctionsDetails', () => {
  let component: AuctionsDetails;
  let fixture: ComponentFixture<AuctionsDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuctionsDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuctionsDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
