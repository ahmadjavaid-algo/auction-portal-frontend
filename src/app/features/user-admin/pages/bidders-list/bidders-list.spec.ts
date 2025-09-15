import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BiddersList } from './bidders-list';

describe('BiddersList', () => {
  let component: BiddersList;
  let fixture: ComponentFixture<BiddersList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiddersList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BiddersList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
