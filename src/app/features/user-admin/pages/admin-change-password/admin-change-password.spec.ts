import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminChangePassword } from './admin-change-password';

describe('AdminChangePassword', () => {
  let component: AdminChangePassword;
  let fixture: ComponentFixture<AdminChangePassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminChangePassword]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminChangePassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
