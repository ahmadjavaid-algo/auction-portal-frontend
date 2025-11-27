import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorsDetails } from './inspectors-details';

describe('InspectorsDetails', () => {
  let component: InspectorsDetails;
  let fixture: ComponentFixture<InspectorsDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorsDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectorsDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
