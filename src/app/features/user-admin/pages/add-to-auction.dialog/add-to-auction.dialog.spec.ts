import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddToAuctionDialog } from './add-to-auction.dialog';

describe('AddToAuctionDialog', () => {
  let component: AddToAuctionDialog;
  let fixture: ComponentFixture<AddToAuctionDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddToAuctionDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddToAuctionDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
