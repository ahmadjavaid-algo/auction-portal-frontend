import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BidderChangePassword } from './bidder-change-password';

describe('BidderChangePassword', () => {
  let component: BidderChangePassword;
  let fixture: ComponentFixture<BidderChangePassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BidderChangePassword]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BidderChangePassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
