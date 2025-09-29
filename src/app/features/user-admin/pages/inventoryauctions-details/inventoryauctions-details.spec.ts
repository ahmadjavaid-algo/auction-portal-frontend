import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryauctionsDetails } from './inventoryauctions-details';

describe('InventoryauctionsDetails', () => {
  let component: InventoryauctionsDetails;
  let fixture: ComponentFixture<InventoryauctionsDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryauctionsDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryauctionsDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
