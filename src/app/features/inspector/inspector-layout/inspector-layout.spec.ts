import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorLayout } from './inspector-layout';

describe('InspectorLayout', () => {
  let component: InspectorLayout;
  let fixture: ComponentFixture<InspectorLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorLayout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectorLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
