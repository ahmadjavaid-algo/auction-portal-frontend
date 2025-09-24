import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductsDetails } from './products-details';

describe('ProductsDetails', () => {
  let component: ProductsDetails;
  let fixture: ComponentFixture<ProductsDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductsDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
