import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Auctionbid } from './auctionbid';

describe('Auctionbid', () => {
  let component: Auctionbid;
  let fixture: ComponentFixture<Auctionbid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Auctionbid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Auctionbid);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
