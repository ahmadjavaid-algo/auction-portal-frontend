import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RolesClaims } from './roles-claims';

describe('RolesClaims', () => {
  let component: RolesClaims;
  let fixture: ComponentFixture<RolesClaims>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesClaims]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RolesClaims);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
