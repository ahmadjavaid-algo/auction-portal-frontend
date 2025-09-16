import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BiddersSignup } from './bidders-signup';

describe('BiddersSignup', () => {
  let component: BiddersSignup;
  let fixture: ComponentFixture<BiddersSignup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiddersSignup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BiddersSignup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
