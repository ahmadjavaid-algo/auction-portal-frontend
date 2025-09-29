import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryauctionsList } from './inventoryauctions-list';

describe('InventoryauctionsList', () => {
  let component: InventoryauctionsList;
  let fixture: ComponentFixture<InventoryauctionsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryauctionsList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryauctionsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
