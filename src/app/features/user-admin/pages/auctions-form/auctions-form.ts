import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';

import { Auction } from '../../../../models/auction.model';
import { AuthService } from '../../../../services/auth';

// If you already have a service that lists auction statuses, use it here:
import { Observable, of } from 'rxjs';
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
    MatDialogModule
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

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AuctionsForm, AuctionsFormResult>,
    private auth: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: { mode: Mode; initialData?: Auction | null }
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    // build form (status, name, schedule, bid increment)
    this.form = this.fb.group({
      auctionId: [0],
      auctionStatusId: [null, Validators.required],
      auctionName: ['', [Validators.required, Validators.maxLength(200)]],

      // HTML datetime-local friendly strings
      startDateTime: ['', Validators.required],
      endDateTime: ['', Validators.required],

      bidIncrement: [null, [Validators.required, Validators.min(0)]]
    });

    // load statuses (replace this stub with your real service call)
    this.loadingStatuses = true;
    this.loadStatuses().subscribe({
      next: (list) => (this.statuses = list ?? []),
      complete: () => (this.loadingStatuses = false)
    });

    // if editing, populate fields
    if (this.mode === 'edit' && this.data.initialData) {
      const r = this.data.initialData;
      this.form.patchValue({
        auctionId: r.auctionId,
        auctionStatusId: r.auctionStatusId ?? null,
        auctionName: r.auctionName ?? '',
        startDateTime: this.toLocalInput(r.startDateTime),
        endDateTime: this.toLocalInput(r.endDateTime),
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
      startDateTime: v.startDateTime || null,  // let API parse "YYYY-MM-DDTHH:mm"
      endDateTime: v.endDateTime || null,
      bidIncrement: Number(v.bidIncrement),

      // optional status labels (not required to submit)
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
  // convert Date/string → value accepted by <input type="datetime-local">
  private toLocalInput(dt?: string | Date | null): string {
    if (!dt) return '';
    const d = new Date(dt);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  statusLabel(s: AuctionStatusVm): string {
    return `${s.auctionStatusName} (${s.auctionStatusCode})`;
  }

  // ---- Replace with your real API call for statuses ----
  private loadStatuses(): Observable<AuctionStatusVm[]> {
    // stubbed to keep dialog working out-of-the-box; swap with service method
    // e.g. return this.auctionStatusSvc.getList();
    return of([
      { auctionStatusId: 1, auctionStatusCode: 'schedule', auctionStatusName: 'Scheduled' },
      { auctionStatusId: 2, auctionStatusCode: 'start',    auctionStatusName: 'Started' },
      { auctionStatusId: 3, auctionStatusCode: 'stop',     auctionStatusName: 'Stopped' },
      { auctionStatusId: 4, auctionStatusCode: 'ended',    auctionStatusName: 'Ended' }
    ]);
  }
}
