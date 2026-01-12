import { Component, Inject, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';

import { Email } from '../../../../models/email.model';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type EmailFormResult =
  | { action: 'create'; payload: Email }
  | { action: 'edit';   payload: Email };

@Component({
  selector: 'app-emails-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltip
  ],
  templateUrl: './emails-form.html',
  styleUrls: ['./emails-form.scss']
})
export class EmailsForm implements OnInit, AfterViewInit {
  form!: FormGroup;
  mode: Mode;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EmailsForm, EmailFormResult>,
    private auth: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: { mode: Mode; initialData?: Email | null }
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      emailId: [0],

      emailCode: ['', [Validators.required, Validators.maxLength(100), this.noWhitespaceValidator]],
      emailSubject: ['', [Validators.required, Validators.maxLength(400), this.noWhitespaceValidator]],

      emailTo: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
      emailFrom: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],

      emailBody: ['', [Validators.required, this.noWhitespaceValidator]],
      active: [true]
    });

    if (this.mode === 'edit' && this.data.initialData) {
      const e = this.data.initialData;
      this.form.patchValue({
        emailId: e.emailId,
        emailCode: (e.emailCode ?? '').trim(),
        emailSubject: (e.emailSubject ?? '').trim(),
        emailTo: (e.emailTo ?? '').trim(),
        emailFrom: (e.emailFrom ?? '').trim(),
        emailBody: e.emailBody ?? '',
        active: e.active ?? true
      });
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

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: Email = {
      emailId: v.emailId,
      emailCode: v.emailCode?.trim() || null,
      emailSubject: v.emailSubject?.trim() || null,
      emailBody: v.emailBody,
      emailTo: v.emailTo?.trim() || null,
      emailFrom: v.emailFrom?.trim() || null,

      active: !!v.active,

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

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit Email' : 'Create New Email';
  }

  get submitButtonText(): string {
    return this.mode === 'edit' ? 'Update Email' : 'Create Email';
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.hasError('required')) return 'This field is required';
    if (control.hasError('email')) return 'Please enter a valid email address';
    if (control.hasError('maxlength')) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `Must not exceed ${maxLength} characters`;
    }
    if (control.hasError('whitespace')) return 'Cannot be only whitespace';

    return 'Invalid value';
  }
}
