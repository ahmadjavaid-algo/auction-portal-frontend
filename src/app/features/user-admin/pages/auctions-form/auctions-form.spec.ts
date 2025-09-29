import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuctionsForm } from './auctions-form';

describe('AuctionsForm', () => {
  let component: AuctionsForm;
  let fixture: ComponentFixture<AuctionsForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuctionsForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuctionsForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
