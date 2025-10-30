import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewcarsList } from './newcars-list';

describe('NewcarsList', () => {
  let component: NewcarsList;
  let fixture: ComponentFixture<NewcarsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewcarsList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewcarsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
