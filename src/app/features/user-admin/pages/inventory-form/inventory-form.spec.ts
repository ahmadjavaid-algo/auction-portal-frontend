import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryForm } from './inventory-form';

describe('InventoryForm', () => {
  let component: InventoryForm;
  let fixture: ComponentFixture<InventoryForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
