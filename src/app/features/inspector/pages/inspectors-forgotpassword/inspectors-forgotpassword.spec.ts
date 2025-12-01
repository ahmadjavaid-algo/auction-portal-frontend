import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorsForgotpassword } from './inspectors-forgotpassword';

describe('InspectorsForgotpassword', () => {
  let component: InspectorsForgotpassword;
  let fixture: ComponentFixture<InspectorsForgotpassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorsForgotpassword]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectorsForgotpassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
