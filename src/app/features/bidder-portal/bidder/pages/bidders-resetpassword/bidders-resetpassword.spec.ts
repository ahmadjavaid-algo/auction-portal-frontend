import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BiddersResetpassword } from './bidders-resetpassword';

describe('BiddersResetpassword', () => {
  let component: BiddersResetpassword;
  let fixture: ComponentFixture<BiddersResetpassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiddersResetpassword]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BiddersResetpassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
