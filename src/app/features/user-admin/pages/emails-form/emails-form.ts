import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

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
    MatDialogModule
  ],
  templateUrl: './emails-form.html',
  styleUrls: ['./emails-form.scss']
})
export class EmailsForm implements OnInit {
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
      emailCode: ['', [Validators.required, Validators.maxLength(100)]],
      emailSubject: ['', [Validators.required, Validators.maxLength(400)]],
      emailTo: ['', [Validators.required, Validators.email]],
      emailFrom: ['', [Validators.required, Validators.email]],
      emailBody: ['', [Validators.required]],
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

  onSubmit(): void {
    if (this.form.invalid) return;

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
}
