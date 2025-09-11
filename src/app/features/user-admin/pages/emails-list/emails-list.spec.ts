import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailsList } from './emails-list';

describe('EmailsList', () => {
  let component: EmailsList;
  let fixture: ComponentFixture<EmailsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailsList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmailsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
