import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BiddersLogin } from './bidders-login';

describe('BiddersLogin', () => {
  let component: BiddersLogin;
  let fixture: ComponentFixture<BiddersLogin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiddersLogin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BiddersLogin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
