import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorsLogin } from './inspectors-login';

describe('InspectorsLogin', () => {
  let component: InspectorsLogin;
  let fixture: ComponentFixture<InspectorsLogin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorsLogin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectorsLogin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
