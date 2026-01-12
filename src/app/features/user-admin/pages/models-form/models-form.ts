import { Component, Inject, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl
} from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';

import { Model } from '../../../../models/model.model';
import { Make } from '../../../../models/make.model';
import { MakesService } from '../../../../services/makes.service';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type ModelFormResult =
  | { action: 'create'; payload: Model }
  | { action: 'edit'; payload: Model };

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
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltip
  ],
  templateUrl: './models-form.html',
  styleUrls: ['./models-form.scss']
})
export class ModelsForm implements OnInit, AfterViewInit {
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
      makeId: [null, [Validators.required]],
      modelName: ['', [Validators.required, Validators.maxLength(100), this.noWhitespaceValidator]]
    });

    // Patch for edit
    if (this.mode === 'edit' && this.data.initialData) {
      const m = this.data.initialData as any;

      this.form.patchValue({
        modelId: m.modelId,
        modelName: m.modelName ?? '',
        // your current code uses (r as any).makeId — keep same behavior
        makeId: m.makeId ?? null
      });
    }

    this.loadMakes();
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

  private loadMakes(): void {
    this.loadingMakes = true;

    this.makesSvc.getList().subscribe({
      next: (list) => {
        this.makes = [...(list ?? [])].sort((a, b) => (a.makeName ?? '').localeCompare(b.makeName ?? ''));

        // ensure selected makeId is valid if editing / data changed
        const selected = this.form.value.makeId;
        if (selected != null && !this.makes.some(x => x.makeId === selected)) {
          this.form.patchValue({ makeId: null }, { emitEvent: false });
        }

        this.loadingMakes = false;
      },
      error: () => {
        this.makes = [];
        this.loadingMakes = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: Model = {
      modelId: v.modelId,
      modelName: v.modelName?.trim(),
      makeId: v.makeId,

      createdById: this.mode === 'create' ? currentUserId : null,
      createdDate: null,
      modifiedById: currentUserId ?? null,
      modifiedDate: null
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

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit Model' : 'Create New Model';
  }

  get submitButtonText(): string {
    return this.mode === 'edit' ? 'Update Model' : 'Create Model';
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.hasError('required')) return 'This field is required';
    if (control.hasError('maxlength')) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `Must not exceed ${maxLength} characters`;
    }
    if (control.hasError('whitespace')) return 'Cannot be only whitespace';

    return 'Invalid value';
  }
}
