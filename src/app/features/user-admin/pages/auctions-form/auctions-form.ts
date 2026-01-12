import { Component, Inject, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';

import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { Auction } from '../../../../models/auction.model';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type AuctionsFormResult =
  | { action: 'create'; payload: Auction }
  | { action: 'edit'; payload: Auction };

@Component({
  selector: 'app-auctions-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,

    MatDatepickerModule,
    MatNativeDateModule,

    MatProgressSpinnerModule,
    MatTooltip
  ],
  templateUrl: './auctions-form.html',
  styleUrls: ['./auctions-form.scss']
})
export class AuctionsForm implements OnInit, AfterViewInit {
  form!: FormGroup;
  mode: Mode;

  computedStatusLabel: string | null = null;
  rangeInvalid$!: Observable<boolean>;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AuctionsForm, AuctionsFormResult>,
    private auth: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: { mode: Mode; initialData?: Auction | null }
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    this.form = this.fb.group(
      {
        auctionId: [0],

        auctionName: ['', [Validators.required, Validators.maxLength(200), this.noWhitespaceValidator]],

        startDate: [null as Date | null, Validators.required],
        startTime: ['', Validators.required],

        endDate: [null as Date | null, Validators.required],
        endTime: ['', Validators.required],

        bidIncrement: [null, [Validators.required, Validators.min(0)]]
      },
      { validators: this.dateRangeValidator }
    );

    this.rangeInvalid$ = this.form.valueChanges.pipe(
      startWith(this.form.value),
      map(() => !!this.form.errors?.['range'])
    );

    if (this.mode === 'edit' && this.data.initialData) {
      const r = this.data.initialData;

      const s = this.fromIso(r.startDateTime);
      const e = this.fromIso(r.endDateTime);

      this.form.patchValue({
        auctionId: r.auctionId,
        auctionName: r.auctionName ?? '',

        startDate: s.date,
        startTime: s.time,

        endDate: e.date,
        endTime: e.time,

        bidIncrement: r.bidIncrement ?? null
      });

      const code = r.auctionStatusCode ?? '';
      const name = r.auctionStatusName ?? '';
      this.computedStatusLabel =
        (name && code) ? `${name} (${code})` :
        (name || code) ? (name || code) : null;
    }
  }

  ngAfterViewInit(): void {
    // Same staggered reveal as UsersForm
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
    return isWhitespace ? { whitespace: true } : null;
  }

  private dateRangeValidator = (group: AbstractControl): ValidationErrors | null => {
    const sd = group.get('startDate')?.value as Date | null;
    const st = group.get('startTime')?.value as string | null;
    const ed = group.get('endDate')?.value as Date | null;
    const et = group.get('endTime')?.value as string | null;

    if (!sd || !st || !ed || !et) return null;

    const start = this.toDate(sd, st);
    const end = this.toDate(ed, et);

    return end.getTime() >= start.getTime() ? null : { range: true };
  };

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: Auction = {
      auctionId: v.auctionId,
      auctionName: (v.auctionName ?? '').trim(),

      startDateTime: this.composeIso(v.startDate, v.startTime),
      endDateTime: this.composeIso(v.endDate, v.endTime),

      bidIncrement: Number(v.bidIncrement),

      auctionStatusCode: null,
      auctionStatusName: null,

      createdById: this.mode === 'create' ? currentUserId : null,
      createdDate: null,
      modifiedById: currentUserId ?? null,
      modifiedDate: null,
      active: true
    } as Auction;

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
    return this.mode === 'edit' ? 'Edit Auction' : 'Create New Auction';
  }

  get submitButtonText(): string {
    return this.mode === 'edit' ? 'Update Auction' : 'Create Auction';
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.hasError('required')) return 'This field is required';
    if (control.hasError('min')) return 'Must be ≥ 0';
    if (control.hasError('maxlength')) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `Must not exceed ${maxLength} characters`;
    }
    if (control.hasError('whitespace')) return 'Cannot be only whitespace';

    return 'Invalid value';
  }

  // ---- date helpers (same logic you had) ----
  private composeIso(d: Date, time: string): string {
    const dt = this.toDate(d, time);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  }

  private toDate(d: Date, time: string): Date {
    const [h, m] = (time || '00:00').split(':').map(Number);
    const out = new Date(d);
    out.setHours(h || 0, m || 0, 0, 0);
    return out;
  }

  private fromIso(dt?: string | Date | null): { date: Date | null; time: string } {
    if (!dt) return { date: null, time: '' };
    const d = new Date(dt);
    if (isNaN(d.getTime())) return { date: null, time: '' };
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`
    };
  }
}
