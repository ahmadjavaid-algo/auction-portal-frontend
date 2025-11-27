import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorsList } from './inspectors-list';

describe('InspectorsList', () => {
  let component: InspectorsList;
  let fixture: ComponentFixture<InspectorsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorsList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectorsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
