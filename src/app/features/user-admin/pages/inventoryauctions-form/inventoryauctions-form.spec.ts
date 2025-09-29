import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryauctionsForm } from './inventoryauctions-form';

describe('InventoryauctionsForm', () => {
  let component: InventoryauctionsForm;
  let fixture: ComponentFixture<InventoryauctionsForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryauctionsForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryauctionsForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
