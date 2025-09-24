import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModelsForm } from './models-form';

describe('ModelsForm', () => {
  let component: ModelsForm;
  let fixture: ComponentFixture<ModelsForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModelsForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModelsForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
