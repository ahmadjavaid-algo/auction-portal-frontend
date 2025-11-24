import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddToInventoryDialog } from './add-to-inventory.dialog';

describe('AddToInventoryDialog', () => {
  let component: AddToInventoryDialog;
  let fixture: ComponentFixture<AddToInventoryDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddToInventoryDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddToInventoryDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
