import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuctionsList } from './auctions-list';

describe('AuctionsList', () => {
  let component: AuctionsList;
  let fixture: ComponentFixture<AuctionsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuctionsList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuctionsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
