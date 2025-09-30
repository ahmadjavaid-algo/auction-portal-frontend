import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { AuctionService } from '../../../../services/auctions.service';
import { Auction } from '../../../../models/auction.model';

export type AddToAuctionResult = {
  auctionId: number;
  inventoryAuctionStatusId: number;
  buyNowPrice?: number | null;
  reservePrice?: number | null;
};

type StatusVm = { id: number; name: string; code: string };

@Component({
  selector: 'app-add-to-auction-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './add-to-auction.dialog.html',
  styleUrls: ['./add-to-auction.dialog.scss']
})
export class AddToAuctionDialog implements OnInit {
  auctions: Auction[] = [];
  loadingAuctions = false;

  // simple status set — match your server
  statuses: StatusVm[] = [
    { id: 1, name: 'Scheduled', code: 'schedule' },
    { id: 2, name: 'Live',      code: 'live' },
    { id: 3, name: 'Stop',      code: 'stop' }
  ];

  // init in ngOnInit to avoid "used before initialization"
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private aucSvc: AuctionService,
    private ref: MatDialogRef<AddToAuctionDialog, AddToAuctionResult>,
    @Inject(MAT_DIALOG_DATA) public data: { count: number }
  ) {}

  ngOnInit(): void {
    // build the form here (fb is now initialized)
    this.form = this.fb.group({
      auctionId: [null as number | null, Validators.required],
      inventoryAuctionStatusId: [1, Validators.required],
      buyNowPrice: [0, [Validators.min(0)]],
      reservePrice: [0, [Validators.min(0)]],
    });

    // load auctions
    this.loadingAuctions = true;
    this.aucSvc.getList().subscribe({
      next: (list) => {
        this.auctions = (list ?? []).sort((a, b) =>
          (a.auctionName ?? '').localeCompare(b.auctionName ?? '')
        );
      },
      complete: () => (this.loadingAuctions = false)
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.ref.close({
      auctionId: v.auctionId!,
      inventoryAuctionStatusId: v.inventoryAuctionStatusId!,
      buyNowPrice: Number(v.buyNowPrice ?? 0),
      reservePrice: Number(v.reservePrice ?? 0)
    });
  }

  cancel(): void {
    this.ref.close();
  }
}
