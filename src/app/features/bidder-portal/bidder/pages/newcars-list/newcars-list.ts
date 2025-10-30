import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-newcars-list',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './newcars-list.html',
  styleUrl: './newcars-list.scss'
})
export class NewcarsList {

}
