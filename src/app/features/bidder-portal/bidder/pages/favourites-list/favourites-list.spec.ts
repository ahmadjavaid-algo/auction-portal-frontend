import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FavouritesList } from './favourites-list';

describe('FavouritesList', () => {
  let component: FavouritesList;
  let fixture: ComponentFixture<FavouritesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FavouritesList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FavouritesList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
