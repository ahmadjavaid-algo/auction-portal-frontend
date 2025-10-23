import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllauctionsDetails } from './allauctions-details';

describe('AllauctionsDetails', () => {
  let component: AllauctionsDetails;
  let fixture: ComponentFixture<AllauctionsDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllauctionsDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllauctionsDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
