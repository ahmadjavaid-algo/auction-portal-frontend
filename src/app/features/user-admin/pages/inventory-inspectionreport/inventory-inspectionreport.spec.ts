import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryInspectionreport } from './inventory-inspectionreport';

describe('InventoryInspectionreport', () => {
  let component: InventoryInspectionreport;
  let fixture: ComponentFixture<InventoryInspectionreport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryInspectionreport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryInspectionreport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
