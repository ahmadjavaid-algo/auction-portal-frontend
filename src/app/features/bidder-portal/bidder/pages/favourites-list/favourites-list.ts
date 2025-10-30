import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-favourites-list',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './favourites-list.html',
  styleUrl: './favourites-list.scss'
})
export class FavouritesList {

}
