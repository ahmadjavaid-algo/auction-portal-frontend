import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailsForm } from './emails-form';

describe('EmailsForm', () => {
  let component: EmailsForm;
  let fixture: ComponentFixture<EmailsForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailsForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmailsForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
