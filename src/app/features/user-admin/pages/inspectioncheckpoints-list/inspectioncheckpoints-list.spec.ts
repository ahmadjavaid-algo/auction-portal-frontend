import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectioncheckpointsList } from './inspectioncheckpoints-list';

describe('InspectioncheckpointsList', () => {
  let component: InspectioncheckpointsList;
  let fixture: ComponentFixture<InspectioncheckpointsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectioncheckpointsList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectioncheckpointsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
