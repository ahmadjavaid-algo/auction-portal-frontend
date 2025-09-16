import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsersResetpassword } from './users-resetpassword';

describe('UsersResetpassword', () => {
  let component: UsersResetpassword;
  let fixture: ComponentFixture<UsersResetpassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersResetpassword]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsersResetpassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
