import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YearsForm } from './years-form';

describe('YearsForm', () => {
  let component: YearsForm;
  let fixture: ComponentFixture<YearsForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YearsForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(YearsForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
