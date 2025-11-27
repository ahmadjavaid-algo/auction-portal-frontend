import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectioncheckpointsDetails } from './inspectioncheckpoints-details';

describe('InspectioncheckpointsDetails', () => {
  let component: InspectioncheckpointsDetails;
  let fixture: ComponentFixture<InspectioncheckpointsDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectioncheckpointsDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectioncheckpointsDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
