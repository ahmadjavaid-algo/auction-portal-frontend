import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { Category } from '../../../../models/category.model';
import { Year } from '../../../../models/year.model';
import { YearsService } from '../../../../services/years.service';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type CategoryFormResult =
  | { action: 'create'; payload: Category }
  | { action: 'edit';   payload: Category };

@Component({
  selector: 'app-categories-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule
  ],
  templateUrl: './categories-form.html',
  styleUrls: ['./categories-form.scss']
})
export class CategoriesForm implements OnInit {
  form!: FormGroup;
  mode: Mode;

  /** Dropdown source */
  years: Year[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CategoriesForm, CategoryFormResult>,
    private yearsSvc: YearsService,
    private auth: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: { mode: Mode; initialData?: Category | null }
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      categoryId: [0],
      yearId: [null, Validators.required],
      categoryName: ['', [Validators.required, Validators.maxLength(120)]]
    });

    this.loadYears();

    if (this.mode === 'edit' && this.data.initialData) {
      const r = this.data.initialData;
      this.form.patchValue({
        categoryId: r.categoryId,
        yearId: r.yearId ?? null,
        categoryName: r.categoryName ?? ''
      });
    }
  }

  private loadYears(): void {
    this.yearsSvc.getList().subscribe({
      next: (list) => this.years = list ?? [],
      error: () => { /* keep quiet; dropdown will be empty if it fails */ }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: Category = {
      categoryId: v.categoryId,
      categoryName: (v.categoryName ?? '').trim(),
      yearId: v.yearId,

      createdById: this.mode === 'create' ? currentUserId : null,
      createdDate: null,
      modifiedById: currentUserId ?? null,
      modifiedDate: null
      // active handled via separate Activate endpoint
    };

    this.dialogRef.close(
      this.mode === 'create'
        ? { action: 'create', payload }
        : { action: 'edit', payload }
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
