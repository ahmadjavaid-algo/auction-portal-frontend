import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectionDetails } from './inspection-details';

describe('InspectionDetails', () => {
  let component: InspectionDetails;
  let fixture: ComponentFixture<InspectionDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectionDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectionDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
