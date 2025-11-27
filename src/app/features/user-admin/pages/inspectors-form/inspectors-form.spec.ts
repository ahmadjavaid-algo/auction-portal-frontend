import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorsForm } from './inspectors-form';

describe('InspectorsForm', () => {
  let component: InspectorsForm;
  let fixture: ComponentFixture<InspectorsForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorsForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectorsForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
