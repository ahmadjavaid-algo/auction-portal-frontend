import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NeedAccess } from './need-access';

describe('NeedAccess', () => {
  let component: NeedAccess;
  let fixture: ComponentFixture<NeedAccess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NeedAccess]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NeedAccess);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
