import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectionList } from './inspection-list';

describe('InspectionList', () => {
  let component: InspectionList;
  let fixture: ComponentFixture<InspectionList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectionList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectionList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
