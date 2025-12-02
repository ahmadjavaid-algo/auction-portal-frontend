import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Inspections } from './inspections';

describe('Inspections', () => {
  let component: Inspections;
  let fixture: ComponentFixture<Inspections>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Inspections]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Inspections);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
