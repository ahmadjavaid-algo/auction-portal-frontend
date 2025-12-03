import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorChangePassword } from './inspector-change-password';

describe('InspectorChangePassword', () => {
  let component: InspectorChangePassword;
  let fixture: ComponentFixture<InspectorChangePassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorChangePassword]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectorChangePassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
