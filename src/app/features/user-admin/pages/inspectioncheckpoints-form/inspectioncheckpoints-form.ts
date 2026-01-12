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
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';

import { InspectionCheckpoint } from '../../../../models/inspectioncheckpoint.model';
import { InspectionType } from '../../../../models/inspectiontype.model';

import { InspectionTypesService } from '../../../../services/inspectiontypes.service';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type InspectionCheckpointsFormResult =
  | { action: 'create'; payload: InspectionCheckpoint }
  | { action: 'edit'; payload: InspectionCheckpoint };

@Component({
  selector: 'app-inspectioncheckpoints-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatTooltip
  ],
  templateUrl: './inspectioncheckpoints-form.html',
  styleUrls: ['./inspectioncheckpoints-form.scss']
})
export class InspectioncheckpointsForm implements OnInit, AfterViewInit {
  form!: FormGroup;
  mode: Mode;

  inspectionTypes: InspectionType[] = [];
  loadingInspectionTypes = false;

  inputTypeOptions: string[] = ['Number', 'Text', 'Image'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<InspectioncheckpointsForm, InspectionCheckpointsFormResult>,
    private auth: AuthService,
    private inspectionTypesSvc: InspectionTypesService,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      mode: Mode;
      initialData?: InspectionCheckpoint | null;
      presetInspectionTypeId?: number | null;
    }
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      inspectionCheckpointId: [0],
      inspectionTypeId: [this.data?.presetInspectionTypeId ?? null, Validators.required],
      inspectionCheckpointName: ['', [Validators.required, Validators.maxLength(200), this.noWhitespaceValidator]],
      inputType: ['', [Validators.required]],
      active: [true]
    });

    this.loadInspectionTypes();

    if (this.mode === 'edit' && this.data.initialData) {
      const r = this.data.initialData;

      this.form.patchValue({
        inspectionCheckpointId:
          (r as any).inspectionCheckpointId ??
          (r as any).inspectioncheckpointId ??
          0,
        inspectionTypeId: r.inspectionTypeId ?? this.data?.presetInspectionTypeId ?? null,
        inspectionCheckpointName: r.inspectionCheckpointName ?? '',
        inputType: r.inputType ?? '',
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

  private loadInspectionTypes(): void {
    this.loadingInspectionTypes = true;
    this.inspectionTypesSvc.getList().subscribe({
      next: (list) => (this.inspectionTypes = list ?? []),
      error: () => (this.inspectionTypes = []),
      complete: () => (this.loadingInspectionTypes = false)
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: InspectionCheckpoint = {
      inspectionCheckpointId: v.inspectionCheckpointId,
      inspectionTypeId: v.inspectionTypeId,
      inspectionCheckpointName: (v.inspectionCheckpointName ?? '').trim(),
      inputType: (v.inputType ?? '').trim(),

      inspectionTypeName: this.data.initialData?.inspectionTypeName ?? null,

      createdById:
        this.mode === 'create'
          ? currentUserId
          : this.data.initialData?.createdById ?? null,
      createdDate: this.data.initialData?.createdDate ?? null,
      modifiedById: currentUserId ?? null,
      modifiedDate: null,

      active: !!v.active
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
    return this.mode === 'edit' ? 'Edit Inspection Checkpoint' : 'Add New Inspection Checkpoint';
  }

  get submitButtonText(): string {
    return this.mode === 'edit' ? 'Update Checkpoint' : 'Create Checkpoint';
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

  inspectionTypeLabel(t: any): string {
    return t?.inspectionTypeName
      ? `${t.inspectionTypeName} (#${t.inspectionTypeId})`
      : `Type #${t?.inspectionTypeId}`;
  }
}
