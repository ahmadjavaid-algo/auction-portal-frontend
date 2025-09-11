import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailsDetails } from './emails-details';

describe('EmailsDetails', () => {
  let component: EmailsDetails;
  let fixture: ComponentFixture<EmailsDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailsDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmailsDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
