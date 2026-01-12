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

import { Year } from '../../../../models/year.model';
import { Model } from '../../../../models/model.model';
import { ModelsService } from '../../../../services/models.service';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type YearFormResult =
  | { action: 'create'; payload: Year }
  | { action: 'edit'; payload: Year };

@Component({
  selector: 'app-years-form',
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
  templateUrl: './years-form.html',
  styleUrls: ['./years-form.scss']
})
export class YearsForm implements OnInit, AfterViewInit {
  form!: FormGroup;
  mode: Mode;

  models: Model[] = [];
  loadingModels = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<YearsForm, YearFormResult>,
    private modelsSvc: ModelsService,
    private auth: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: { mode: Mode; initialData?: Year | null }
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      yearId: [0],
      modelId: [null, [Validators.required]],
      yearName: ['', [Validators.required, Validators.maxLength(50), this.noWhitespaceValidator]]
    });

    if (this.mode === 'edit' && this.data.initialData) {
      const y = this.data.initialData;
      this.form.patchValue({
        yearId: y.yearId,
        // keep your defensive mapping
        modelId: (y as any).modelId ?? (y as any)['modelId'] ?? null,
        yearName: y.yearName ?? ''
      });
    }

    this.fetchModels();
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

  private fetchModels(): void {
    this.loadingModels = true;

    this.modelsSvc.getList().subscribe({
      next: (list) => {
        this.models = [...(list ?? [])].sort((a, b) =>
          (a.modelName ?? '').localeCompare(b.modelName ?? '')
        );

        // Ensure selection is valid
        const selected = this.form.value.modelId;
        if (selected != null && !this.models.some(m => m.modelId === selected)) {
          this.form.patchValue({ modelId: null }, { emitEvent: false });
        }

        this.loadingModels = false;
      },
      error: () => {
        this.models = [];
        this.loadingModels = false;
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

    const payload: Year = {
      yearId: v.yearId,
      modelId: v.modelId,
      yearName: v.yearName?.trim(),

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
    return this.mode === 'edit' ? 'Edit Year' : 'Create New Year';
  }

  get submitButtonText(): string {
    return this.mode === 'edit' ? 'Update Year' : 'Create Year';
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
