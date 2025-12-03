import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorsAccdetails } from './inspectors-accdetails';

describe('InspectorsAccdetails', () => {
  let component: InspectorsAccdetails;
  let fixture: ComponentFixture<InspectorsAccdetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorsAccdetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectorsAccdetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
