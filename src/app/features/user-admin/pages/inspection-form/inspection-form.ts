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
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';

import { InspectionType } from '../../../../models/inspectiontype.model';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type InspectionFormResult =
  | { action: 'create'; payload: InspectionType }
  | { action: 'edit'; payload: InspectionType };

@Component({
  selector: 'app-inspection-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatTooltip
  ],
  templateUrl: './inspection-form.html',
  styleUrls: ['./inspection-form.scss']
})
export class InspectionForm implements OnInit, AfterViewInit {
  form!: FormGroup;
  mode: Mode;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<InspectionForm, InspectionFormResult>,
    private auth: AuthService,
    @Inject(MAT_DIALOG_DATA)
    public data: { mode: Mode; initialData?: InspectionType | null }
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      inspectionTypeId: [0],
      inspectionTypeName: ['', [Validators.required, Validators.maxLength(200), this.noWhitespaceValidator]],
      weightage: [null, [Validators.required, Validators.min(0)]],
      active: [true]
    });

    if (this.mode === 'edit' && this.data.initialData) {
      const r = this.data.initialData;
      this.form.patchValue({
        inspectionTypeId: r.inspectionTypeId ?? 0,
        inspectionTypeName: r.inspectionTypeName ?? '',
        weightage: r.weightage ?? null,
        active: r.active ?? true
      });
    }
  }

  ngAfterViewInit(): void {
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

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: InspectionType = {
      inspectionTypeId: v.inspectionTypeId,
      inspectionTypeName: (v.inspectionTypeName ?? '').trim(),
      weightage: Number(v.weightage),

      createdById: this.mode === 'create' ? currentUserId : (this.data.initialData?.createdById ?? null),
      createdDate: this.data.initialData?.createdDate ?? null,
      modifiedById: currentUserId ?? null,
      modifiedDate: null,

      active: !!v.active
    } as InspectionType;

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
    return this.mode === 'edit' ? 'Edit Inspection Type' : 'Create New Inspection Type';
  }

  get submitButtonText(): string {
    return this.mode === 'edit' ? 'Update Inspection Type' : 'Create Inspection Type';
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.hasError('required')) return 'This field is required';
    if (control.hasError('min')) return 'Must be ≥ 0';
    if (control.hasError('maxlength')) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `Must not exceed ${maxLength} characters`;
    }
    if (control.hasError('whitespace')) return 'Cannot be only whitespace';

    return 'Invalid value';
  }
}
