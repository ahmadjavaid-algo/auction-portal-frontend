import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorsResetpassword } from './inspectors-resetpassword';

describe('InspectorsResetpassword', () => {
  let component: InspectorsResetpassword;
  let fixture: ComponentFixture<InspectorsResetpassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorsResetpassword]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectorsResetpassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
