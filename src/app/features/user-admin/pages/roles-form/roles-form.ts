import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { Role } from '../../../../models/role.model';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type RoleFormResult =
  | { action: 'create'; payload: Role }
  | { action: 'edit';   payload: Role };

@Component({
  selector: 'app-roles-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule
  ],
  templateUrl: './roles-form.html',
  styleUrls: ['./roles-form.scss']
})
export class RolesForm implements OnInit {
  form!: FormGroup;
  mode: Mode;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RolesForm, RoleFormResult>,
    private auth: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: { mode: Mode; initialData?: Role | null }
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      roleId: [0],
      roleName: ['', [Validators.required, Validators.maxLength(100)]],
      roleCode: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['']
    });

    if (this.mode === 'edit' && this.data.initialData) {
      const r = this.data.initialData;
      this.form.patchValue({
        roleId: r.roleId,
        roleName: r.roleName ?? '',
        roleCode: r.roleCode ?? '',
        description: r.description ?? ''
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: Role = {
      roleId: v.roleId,
      roleName: v.roleName?.trim(),
      roleCode: v.roleCode?.trim(),
      description: v.description?.trim() || null,

      // audit fields (align with your BaseModel usage in UsersForm)
      createdById: this.mode === 'create' ? currentUserId : null,
      createdDate: null,
      modifiedById: currentUserId ?? null,
      modifiedDate: null
      // active is handled via separate Activate endpoint, so omit here
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
