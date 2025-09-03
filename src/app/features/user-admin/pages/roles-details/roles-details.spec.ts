import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RolesDetails } from './roles-details';

describe('RolesDetails', () => {
  let component: RolesDetails;
  let fixture: ComponentFixture<RolesDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RolesDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
