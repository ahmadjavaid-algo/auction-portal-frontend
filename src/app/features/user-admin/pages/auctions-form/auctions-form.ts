import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { Auction } from '../../../../models/auction.model';
import { AuthService } from '../../../../services/auth';

import { Observable, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

type Mode = 'create' | 'edit';

export interface AuctionStatusVm {
  auctionStatusId: number;
  auctionStatusCode: string;
  auctionStatusName: string;
}
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
    MatSelectModule,
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

  // dropdown data
  statuses: AuctionStatusVm[] = [];
  loadingStatuses = false;

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
    // build form
    this.form = this.fb.group(
      {
        auctionId: [0],
        auctionStatusId: [null, Validators.required],
        auctionName: ['', [Validators.required, Validators.maxLength(200)]],

        // New UX: split date + time inputs (we'll compose them)
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

    // load statuses (replace this stub with your real service call)
    this.loadingStatuses = true;
    this.loadStatuses().subscribe({
      next: (list) => (this.statuses = list ?? []),
      complete: () => (this.loadingStatuses = false)
    });

    // if editing, populate fields
    if (this.mode === 'edit' && this.data.initialData) {
      const r = this.data.initialData;
      const s = this.fromIso(r.startDateTime);
      const e = this.fromIso(r.endDateTime);
      this.form.patchValue({
        auctionId: r.auctionId,
        auctionStatusId: r.auctionStatusId ?? null,
        auctionName: r.auctionName ?? '',
        startDate: s.date,
        startTime: s.time,
        endDate: e.date,
        endTime: e.time,
        bidIncrement: r.bidIncrement ?? null
      });
    }
  }

  // ---- Submit / Cancel ----
  onSubmit(): void {
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: Auction = {
      auctionId: v.auctionId,
      auctionStatusId: v.auctionStatusId,
      auctionName: (v.auctionName ?? '').trim(),

      // compose as "YYYY-MM-DDTHH:mm" (local)
      startDateTime: this.composeIso(v.startDate, v.startTime),
      endDateTime:   this.composeIso(v.endDate, v.endTime),

      bidIncrement: Number(v.bidIncrement),

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

  statusLabel(s: AuctionStatusVm): string {
    return `${s.auctionStatusName} (${s.auctionStatusCode})`;
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

  /** Parse "YYYY-MM-DDTHH:mm" (or ISO) to { date, time } in local TZ */
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

  // ---- Replace with your real API call for statuses ----
  private loadStatuses(): Observable<AuctionStatusVm[]> {
    return of([
      { auctionStatusId: 1, auctionStatusCode: 'schedule', auctionStatusName: 'Scheduled' },
      { auctionStatusId: 2, auctionStatusCode: 'start',    auctionStatusName: 'Started' },
      { auctionStatusId: 3, auctionStatusCode: 'stop',     auctionStatusName: 'Stopped' },
      { auctionStatusId: 4, auctionStatusCode: 'ended',    auctionStatusName: 'Ended' }
    ]);
  }
}
