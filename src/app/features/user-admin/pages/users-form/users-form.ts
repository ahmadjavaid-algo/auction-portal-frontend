import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { User } from '../../../../models/user.model';
import { Role } from '../../../../models/role.model';
import { RolesService } from '../../../../services/roles.service';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type UserFormResult =
  | { action: 'create'; payload: User }
  | { action: 'edit';   payload: User };

@Component({
  selector: 'app-users-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatSlideToggleModule,
    MatDialogModule
  ],
  templateUrl: './users-form.html',
  styleUrls: ['./users-form.scss']
})
export class UsersForm implements OnInit {
  form!: FormGroup;
  mode: Mode;

  roles: Role[] = [];
  rolesLoading = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UsersForm, UserFormResult>,
    private rolesSvc: RolesService,
    private auth: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: { mode: Mode; initialData?: User | null }
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      userId: [0],
      userName: ['', [Validators.required, Validators.maxLength(100)]],
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: [''],

      identificationNumber: [''],
      address1: [''],
      postalCode: [''],

      email: ['', [Validators.required, Validators.email]],
      emailConfirmed: [false],
      phoneNumber: [''],

    
      roleIds: [[] as number[]],

    
      passwordHash: [''],
      active: [true]
    });

   
    if (this.mode === 'edit' && this.data.initialData) {
      const u = this.data.initialData;
      this.form.patchValue({
        userId: u.userId,
        userName: u.userName,
        firstName: u.firstName,
        lastName: u.lastName ?? '',
        identificationNumber: u.identificationNumber ?? '',
        address1: u.address1 ?? '',
        postalCode: u.postalCode ?? '',
        email: u.email,
        emailConfirmed: u.emailConfirmed ?? false,
        phoneNumber: u.phoneNumber ?? ''
      });

     
      const fromServer: number[] = Array.isArray(u.roleId) ? u.roleId : [];
      this.form.patchValue({ roleIds: fromServer }, { emitEvent: false });
    } else {
      this.form.get('passwordHash')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.form.get('passwordHash')?.updateValueAndValidity();
    }

    this.loadRoles();
  }

  private loadRoles(): void {
    this.rolesLoading = true;
    this.rolesSvc.getList().subscribe({
      next: (list) => {
        this.roles = [...list].sort((a, b) => a.roleName.localeCompare(b.roleName));
        
        const selected = (this.form.value.roleIds as number[]) ?? [];
        const validSelection = selected.filter(id => this.roles.some(r => r.roleId === id));
        if (validSelection.length !== selected.length) {
          this.form.patchValue({ roleIds: validSelection }, { emitEvent: false });
        }
      },
      error: () => { this.roles = []; },
      complete: () => { this.rolesLoading = false; }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;
    const selectedRoleIds: number[] = Array.isArray(v.roleIds) ? v.roleIds : [];

    const payload: User = {
      userId: v.userId,
      userName: v.userName?.trim(),
      firstName: v.firstName?.trim(),
      lastName: v.lastName?.trim() || null,
      identificationNumber: v.identificationNumber?.trim() || null,
      address1: v.address1?.trim() || null,
      postalCode: v.postalCode?.trim() || null,
      email: v.email?.trim(),
      emailConfirmed: !!v.emailConfirmed,
      passwordHash: v.passwordHash || null,   
      securityStamp: null,
      phoneNumber: v.phoneNumber?.trim() || null,
      loginDate: null,
      code: null,

      
      roleId: selectedRoleIds,

      createdById: this.mode === 'create' ? currentUserId : null,
      createdDate: null,
      modifiedById: currentUserId ?? null,
      modifiedDate: null
    };

    
    if (this.mode === 'edit' && !payload.passwordHash) {
      delete (payload as any).passwordHash;
    }

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
