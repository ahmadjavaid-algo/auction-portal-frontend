import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, Validators, ReactiveFormsModule,
  AbstractControl, ValidationErrors
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { Auction } from '../../../../models/auction.model';
import { AuthService } from '../../../../services/auth';

import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

type Mode = 'create' | 'edit';

export type AuctionsFormResult =
  | { action: 'create'; payload: Auction }
  | { action: 'edit';   payload: Auction };

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
    MatNativeDateModule
  ],
  templateUrl: './auctions-form.html',
  styleUrls: ['./auctions-form.scss']
})
export class AuctionsForm implements OnInit {
  form!: FormGroup;
  mode: Mode;

  // read-only status chip for edit mode
  computedStatusLabel: string | null = null;

  // convenience observable for range validation message
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
    // build form (NO auctionStatusId here — backend computes it)
    this.form = this.fb.group(
      {
        auctionId: [0],
        auctionName: ['', [Validators.required, Validators.maxLength(200)]],

        // split date + time inputs (compose later)
        startDate: [null as Date | null, Validators.required],
        startTime: ['', Validators.required], // "HH:mm"
        endDate:   [null as Date | null, Validators.required],
        endTime:   ['', Validators.required], // "HH:mm"

        bidIncrement: [null, [Validators.required, Validators.min(0)]]
      },
      { validators: this.dateRangeValidator }
    );

    // watch for validity of range
    this.rangeInvalid$ = this.form.valueChanges.pipe(
      startWith(this.form.value),
      map(() => !!this.form.errors?.['range'])
    );

    // if editing, populate fields + show read-only status chip
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

      // build a nice label if we have code/name
      const code = r.auctionStatusCode ?? '';
      const name = r.auctionStatusName ?? '';
      this.computedStatusLabel =
        (name && code) ? `${name} (${code})` :
        (name || code) ? (name || code) : null;
    }
  }

  // ---- Submit / Cancel ----
  onSubmit(): void {
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    // IMPORTANT: do NOT include auctionStatusId in payload.
    const payload: Auction = {
      auctionId: v.auctionId,
      // auctionStatusId intentionally omitted (server computes)
      auctionName: (v.auctionName ?? '').trim(),

      // compose local "YYYY-MM-DDTHH:mm"
      startDateTime: this.composeIso(v.startDate, v.startTime),
      endDateTime:   this.composeIso(v.endDate, v.endTime),

      bidIncrement: Number(v.bidIncrement),

      // these will be filled by the API response after insert/update
      auctionStatusCode: null,
      auctionStatusName: null,

      // audit
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

  // ---- Helpers ----
  /** Validator: ensures end >= start (minute precision) */
  private dateRangeValidator = (group: AbstractControl): ValidationErrors | null => {
    const sd = group.get('startDate')?.value as Date | null;
    const st = group.get('startTime')?.value as string | null;
    const ed = group.get('endDate')?.value as Date | null;
    const et = group.get('endTime')?.value as string | null;

    if (!sd || !st || !ed || !et) return null;

    const start = this.toDate(sd, st);
    const end   = this.toDate(ed, et);

    return end.getTime() >= start.getTime() ? null : { range: true };
  };

  /** Compose `YYYY-MM-DDTHH:mm` string from date + "HH:mm" */
  private composeIso(d: Date, time: string): string {
    const dt = this.toDate(d, time);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  }

  /** Convert date + "HH:mm" to a local Date object */
  private toDate(d: Date, time: string): Date {
    const [h, m] = (time || '00:00').split(':').map(Number);
    const out = new Date(d);
    out.setHours(h || 0, m || 0, 0, 0);
    return out;
  }

  /** Parse ISO or "YYYY-MM-DDTHH:mm" to { date, time } in local TZ */
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
