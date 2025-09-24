import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryList } from './inventory-list';

describe('InventoryList', () => {
  let component: InventoryList;
  let fixture: ComponentFixture<InventoryList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
