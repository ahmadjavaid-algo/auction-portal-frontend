import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectioncheckpointsForm } from './inspectioncheckpoints-form';

describe('InspectioncheckpointsForm', () => {
  let component: InspectioncheckpointsForm;
  let fixture: ComponentFixture<InspectioncheckpointsForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectioncheckpointsForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectioncheckpointsForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
