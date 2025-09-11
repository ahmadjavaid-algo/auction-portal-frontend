import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsersForgotpassword } from './users-forgotpassword';

describe('UsersForgotpassword', () => {
  let component: UsersForgotpassword;
  let fixture: ComponentFixture<UsersForgotpassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersForgotpassword]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsersForgotpassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
