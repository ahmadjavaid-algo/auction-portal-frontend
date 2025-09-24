import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';

import { Year } from '../../../../models/year.model';
import { Model } from '../../../../models/model.model';
import { ModelsService } from '../../../../services/models.service';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type YearFormResult =
  | { action: 'create'; payload: Year }
  | { action: 'edit';   payload: Year };

@Component({
  selector: 'app-years-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule
  ],
  templateUrl: './years-form.html',
  styleUrls: ['./years-form.scss']
})
export class YearsForm implements OnInit {
  form!: FormGroup;
  mode: Mode;

  models: Model[] = [];        // dropdown source
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
    // lowerCamel controls (keep template in sync!)
    this.form = this.fb.group({
      yearId:   [0],
      modelId:  [null, Validators.required],
      yearName: ['', [Validators.required, Validators.maxLength(50)]],
    });

    // preload dropdown
    this.fetchModels();

    // edit case: seed values
    if (this.mode === 'edit' && this.data.initialData) {
      const r = this.data.initialData;
      this.form.patchValue({
        yearId:   r.yearId,
        modelId:  (r as any).modelId ?? r['modelId'], // tolerate different casings
        yearName: r.yearName ?? '',
      });
    }
  }

  private fetchModels(): void {
    this.loadingModels = true;
    this.modelsSvc.getList().subscribe({
      next: (list) => { this.models = list ?? []; this.loadingModels = false; },
      error: () => { this.loadingModels = false; }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: Year = {
      yearId:   v.yearId,
      modelId:  v.modelId,
      yearName: (v.yearName ?? '').trim(),
      createdById: this.mode === 'create' ? currentUserId : null,
      createdDate: null,
      modifiedById: currentUserId ?? null,
      modifiedDate: null,
      // active handled by separate Activate endpoint
    };

    this.dialogRef.close(
      this.mode === 'create'
        ? { action: 'create', payload }
        : { action: 'edit',   payload }
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
