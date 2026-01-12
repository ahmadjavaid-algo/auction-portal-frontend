// inspectors-form.ts
import { Component, Inject, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';

import { Inspector } from '../../../../models/inspector.model';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type InspectorFormResult =
  | { action: 'create'; payload: Inspector }
  | { action: 'edit'; payload: Inspector };

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
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltip
  ],
  templateUrl: './inspectors-form.html',
  styleUrls: ['./inspectors-form.scss']
})
export class InspectorsForm implements OnInit, AfterViewInit {
  form!: FormGroup;
  mode: Mode;

  // Password visibility toggle (same as UsersForm)
  passwordVisible = false;

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

      userName: ['', [Validators.required, Validators.maxLength(100), this.noWhitespaceValidator]],
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.maxLength(100)]],

      identificationNumber: ['', [Validators.maxLength(50)]],
      address1: ['', [Validators.maxLength(200)]],
      postalCode: ['', [Validators.maxLength(20)]],

      email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
      emailConfirmed: [false],
      phoneNumber: ['', [Validators.maxLength(20)]],

      passwordHash: [''],
      active: [true]
    });

    if (this.mode === 'edit' && this.data.initialData) {
      const u = this.data.initialData;

      this.form.patchValue({
        userId: u.userId,
        userName: (u as any).userName ?? '', // if your Inspector model uses different field names, adjust here
        firstName: (u as any).firstName ?? '',
        lastName: (u as any).lastName ?? '',
        identificationNumber: (u as any).identificationNumber ?? '',
        address1: (u as any).address1 ?? '',
        postalCode: (u as any).postalCode ?? '',
        email: (u as any).email ?? '',
        emailConfirmed: !!(u as any).emailConfirmed,
        phoneNumber: (u as any).phoneNumber ?? '',
        active: (u as any).active ?? true
      });
    } else {
      this.form.get('passwordHash')?.setValidators([
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(100)
      ]);
      this.form.get('passwordHash')?.updateValueAndValidity();
    }
  }

  ngAfterViewInit(): void {
    // Add staggered reveal animation to form fields (same as UsersForm)
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

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

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
      active: !!v.active,

      createdById: this.mode === 'create' ? currentUserId : null,
      createdDate: null,
      modifiedById: currentUserId ?? null,
      modifiedDate: null
    } as Inspector;

    // If edit and password is blank, do not send it
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

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit Inspector' : 'Create New Inspector';
  }

  get submitButtonText(): string {
    return this.mode === 'edit' ? 'Update Inspector' : 'Create Inspector';
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.hasError('required')) return 'This field is required';
    if (control.hasError('email')) return 'Please enter a valid email address';
    if (control.hasError('minlength')) {
      const minLength = control.errors['minlength'].requiredLength;
      return `Must be at least ${minLength} characters`;
    }
    if (control.hasError('maxlength')) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `Must not exceed ${maxLength} characters`;
    }
    if (control.hasError('whitespace')) return 'Cannot be only whitespace';

    return 'Invalid value';
  }
}
