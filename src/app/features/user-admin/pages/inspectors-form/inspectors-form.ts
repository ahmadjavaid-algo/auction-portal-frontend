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

import { Inspector } from '../../../../models/inspector.model';
import { Role } from '../../../../models/role.model';
import { RolesService } from '../../../../services/roles.service';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type InspectorFormResult =
  | { action: 'create'; payload: Inspector }
  | { action: 'edit';   payload: Inspector };

@Component({
  selector: 'app-inspectors-form',
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
  templateUrl: './inspectors-form.html',
  styleUrl: './inspectors-form.scss'
})
export class InspectorsForm implements OnInit {
  form!: FormGroup;
  mode: Mode;



  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<InspectorsForm, InspectorFormResult>,
    private auth: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: { mode: Mode; initialData?: Inspector | null }
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
    } else {
      this.form.get('passwordHash')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.form.get('passwordHash')?.updateValueAndValidity();
    }

    
  }



  onSubmit(): void {
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: Inspector = {
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
