import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';

import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

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
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule
  ],
  templateUrl: './inspection-form.html',
  styleUrls: ['./inspection-form.scss']
})
export class InspectionForm implements OnInit {
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
      inspectionTypeName: ['', [Validators.required, Validators.maxLength(200)]],
      weightage: [null, [Validators.required, Validators.min(0)]]
      // add Validators.max(100) here later if you enforce 0–100
    });

    if (this.mode === 'edit' && this.data.initialData) {
      const r = this.data.initialData;
      this.form.patchValue({
        inspectionTypeId: r.inspectionTypeId,
        inspectionTypeName: r.inspectionTypeName ?? '',
        weightage: r.weightage ?? null
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: InspectionType = {
      inspectionTypeId: v.inspectionTypeId,
      inspectionTypeName: (v.inspectionTypeName ?? '').trim(),
      weightage: Number(v.weightage),

      // BaseModel fields
      createdById: this.mode === 'create' ? currentUserId : null,
      createdDate: null,
      modifiedById: currentUserId ?? null,
      modifiedDate: null,
      active:
        this.mode === 'create'
          ? true
          : this.data.initialData?.active ?? true
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
}
