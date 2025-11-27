import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';

import { InspectionCheckpoint } from '../../../../models/inspectioncheckpoint.model';
import { InspectionType } from '../../../../models/inspectiontype.model';

import { InspectionTypesService } from '../../../../services/inspectiontypes.service';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type InspectionCheckpointsFormResult =
  | { action: 'create'; payload: InspectionCheckpoint }
  | { action: 'edit';   payload: InspectionCheckpoint };

@Component({
  selector: 'app-inspectioncheckpoints-form',
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
  templateUrl: './inspectioncheckpoints-form.html',
  styleUrls: ['./inspectioncheckpoints-form.scss']
})
export class InspectioncheckpointsForm implements OnInit {
  form!: FormGroup;
  mode: Mode;

  inspectionTypes: InspectionType[] = [];
  loadingInspectionTypes = false;

  // ✅ Fixed set of allowed input types
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
      inspectionCheckpointName: ['', [Validators.required, Validators.maxLength(200)]],
      inputType: ['', [Validators.required]]
    });

    // Load Inspection Types for dropdown
    this.loadingInspectionTypes = true;
    this.inspectionTypesSvc.getList().subscribe({
      next: (list) => (this.inspectionTypes = list ?? []),
      error: () => (this.inspectionTypes = []),
      complete: () => (this.loadingInspectionTypes = false)
    });

    // Edit mode patch
    if (this.mode === 'edit' && this.data.initialData) {
      const r = this.data.initialData;
      this.form.patchValue({
        inspectionCheckpointId:
          (r as any).inspectionCheckpointId ??
          (r as any).inspectioncheckpointId ??
          0,
        inspectionTypeId: r.inspectionTypeId ?? this.data?.presetInspectionTypeId ?? null,
        inspectionCheckpointName: r.inspectionCheckpointName ?? '',
        inputType: r.inputType ?? ''
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: InspectionCheckpoint = {
      inspectionCheckpointId: v.inspectionCheckpointId,
      inspectionTypeId: v.inspectionTypeId,
      inspectionCheckpointName: (v.inspectionCheckpointName ?? '').trim(),
      inputType: (v.inputType ?? '').trim(),   // will be 'Number' | 'Text' | 'Image'

      // Optional display field
      inspectionTypeName: this.data.initialData?.inspectionTypeName ?? null,

      // Audit fields (server can overwrite if it wants)
      createdById:
        this.mode === 'create'
          ? currentUserId
          : this.data.initialData?.createdById ?? null,
      createdDate: this.data.initialData?.createdDate ?? null,
      modifiedById: currentUserId ?? this.data.initialData?.modifiedById ?? null,
      modifiedDate: null,

      active:
        this.mode === 'create'
          ? true
          : this.data.initialData?.active ?? true
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

  inspectionTypeLabel(t: any): string {
    return t?.inspectionTypeName
      ? `${t.inspectionTypeName} (#${t.inspectionTypeId})`
      : `Type #${t?.inspectionTypeId}`;
  }
}
