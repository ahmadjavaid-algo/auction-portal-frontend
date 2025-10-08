import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryImagesform } from './inventory-imagesform';

describe('InventoryImagesform', () => {
  let component: InventoryImagesform;
  let fixture: ComponentFixture<InventoryImagesform>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryImagesform]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryImagesform);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
