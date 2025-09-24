import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MakesModelsYearsCategoriesList } from './makes-models-years-categories-list';

describe('MakesModelsYearsCategoriesList', () => {
  let component: MakesModelsYearsCategoriesList;
  let fixture: ComponentFixture<MakesModelsYearsCategoriesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MakesModelsYearsCategoriesList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MakesModelsYearsCategoriesList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
