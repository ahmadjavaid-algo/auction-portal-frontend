import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';

import { Model } from '../../../../models/model.model';
import { Make } from '../../../../models/make.model';
import { MakesService } from '../../../../services/makes.service';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type ModelFormResult =
  | { action: 'create'; payload: Model }
  | { action: 'edit';   payload: Model };

@Component({
  selector: 'app-models-form',
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
  templateUrl: './models-form.html',
  styleUrls: ['./models-form.scss']
})
export class ModelsForm implements OnInit {
  form!: FormGroup;
  mode: Mode;

  
  makes: Make[] = [];
  loadingMakes = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ModelsForm, ModelFormResult>,
    private auth: AuthService,
    private makesSvc: MakesService,
    @Inject(MAT_DIALOG_DATA) public data: { mode: Mode; initialData?: Model | null }
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    
    this.form = this.fb.group({
      modelId: [0],
      makeId: [null, Validators.required],
      modelName: ['', [Validators.required, Validators.maxLength(100)]]
    });

    
    this.loadingMakes = true;
    this.makesSvc.getList().subscribe({
      next: (list) => (this.makes = list ?? []),
      error: () => (this.makes = []),
      complete: () => (this.loadingMakes = false)
    });

    
    if (this.mode === 'edit' && this.data.initialData) {
      const r = this.data.initialData;
      this.form.patchValue({
        modelId: r.modelId,
        modelName: r.modelName ?? '',
        makeId: (r as any).makeId ?? null 
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: Model = {
      modelId: v.modelId,
      modelName: (v.modelName ?? '').trim(),
      makeId: v.makeId,

      
      createdById: this.mode === 'create' ? currentUserId : null,
      createdDate: null,
      modifiedById: currentUserId ?? null,
      modifiedDate: null,
      
    } as Model;

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
