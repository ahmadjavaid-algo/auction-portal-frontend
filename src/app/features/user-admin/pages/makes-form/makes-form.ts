import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { Make } from '../../../../models/make.model';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type MakeFormResult =
  | { action: 'create'; payload: Make }
  | { action: 'edit';   payload: Make };

@Component({
  selector: 'app-makes-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './makes-form.html',
  styleUrls: ['./makes-form.scss']
})
export class MakesForm implements OnInit {
  form!: FormGroup;
  mode: Mode;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<MakesForm, MakeFormResult>,
    private auth: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: { mode: Mode; initialData?: Make | null }
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    
    this.form = this.fb.group({
      makeId: [0],
      makeName: ['', [Validators.required, Validators.maxLength(100)]]
    });

    if (this.mode === 'edit' && this.data.initialData) {
      const r = this.data.initialData;
      this.form.patchValue({
        makeId: r.makeId,
        makeName: r.makeName ?? ''
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: Make = {
      makeId: v.makeId,
      makeName: (v.makeName ?? '').trim(),
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
}
