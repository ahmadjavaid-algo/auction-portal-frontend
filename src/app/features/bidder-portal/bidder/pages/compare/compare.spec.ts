import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Compare } from './compare';

describe('Compare', () => {
  let component: Compare;
  let fixture: ComponentFixture<Compare>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Compare]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Compare);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
