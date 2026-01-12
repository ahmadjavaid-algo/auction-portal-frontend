import { Component, Inject, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl
} from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';

import { Category } from '../../../../models/category.model';
import { Year } from '../../../../models/year.model';
import { YearsService } from '../../../../services/years.service';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type CategoryFormResult =
  | { action: 'create'; payload: Category }
  | { action: 'edit'; payload: Category };

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
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltip
  ],
  templateUrl: './categories-form.html',
  styleUrls: ['./categories-form.scss']
})
export class CategoriesForm implements OnInit, AfterViewInit {
  form!: FormGroup;
  mode: Mode;

  years: Year[] = [];
  yearsLoading = false;

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
      yearId: [null, [Validators.required]],
      categoryName: ['', [Validators.required, Validators.maxLength(120), this.noWhitespaceValidator]]
    });

    if (this.mode === 'edit' && this.data.initialData) {
      const c = this.data.initialData;
      this.form.patchValue({
        categoryId: c.categoryId,
        yearId: c.yearId ?? null,
        categoryName: c.categoryName ?? ''
      });
    }

    this.loadYears();
  }

  ngAfterViewInit(): void {
    // Add staggered reveal animation to form fields (same as UsersForm)
    setTimeout(() => {
      const fields = document.querySelectorAll('.form-field');
      fields.forEach((field, index) => {
        (field as HTMLElement).style.animationDelay = `${index * 0.05}s`;
        field.classList.add('field-reveal');
      });
    }, 100);
  }

  private noWhitespaceValidator(control: AbstractControl): { [key: string]: any } | null {
    const isWhitespace = (control.value || '').trim().length === 0;
    return !isWhitespace ? null : { whitespace: true };
  }

  private loadYears(): void {
    this.yearsLoading = true;

    this.yearsSvc.getList().subscribe({
      next: (list) => {
        this.years = [...(list ?? [])].sort((a, b) => (a.yearName ?? '').localeCompare(b.yearName ?? ''));

        // Ensure selected yearId is valid
        const selected = this.form.value.yearId;
        if (selected != null && !this.years.some(y => y.yearId === selected)) {
          this.form.patchValue({ yearId: null }, { emitEvent: false });
        }

        this.yearsLoading = false;
      },
      error: () => {
        this.years = [];
        this.yearsLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: Category = {
      categoryId: v.categoryId,
      categoryName: v.categoryName?.trim(),
      yearId: v.yearId,

      createdById: this.mode === 'create' ? currentUserId : null,
      createdDate: null,
      modifiedById: currentUserId ?? null,
      modifiedDate: null
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

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit Category' : 'Create New Category';
  }

  get submitButtonText(): string {
    return this.mode === 'edit' ? 'Update Category' : 'Create Category';
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.hasError('required')) return 'This field is required';
    if (control.hasError('maxlength')) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `Must not exceed ${maxLength} characters`;
    }
    if (control.hasError('whitespace')) return 'Cannot be only whitespace';

    return 'Invalid value';
  }
}
