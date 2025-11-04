import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';

import { InventoryAuction } from '../../../../models/inventoryauction.model';
import { Inventory } from '../../../../models/inventory.model';
import { Auction } from '../../../../models/auction.model';

import { InventoryService } from '../../../../services/inventory.service';
import { AuctionService } from '../../../../services/auctions.service';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type InventoryAuctionsFormResult =
  | { action: 'create'; payload: InventoryAuction }
  | { action: 'edit';   payload: InventoryAuction };

@Component({
  selector: 'app-inventoryauctions-form',
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
  templateUrl: './inventoryauctions-form.html',
  styleUrls: ['./inventoryauctions-form.scss']
})
export class InventoryauctionsForm implements OnInit {
  form!: FormGroup;
  mode: Mode;

  // dropdown data
  inventories: Inventory[] = [];
  auctions: Auction[] = [];
  loadingInventories = false;
  loadingAuctions = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<InventoryauctionsForm, InventoryAuctionsFormResult>,
    private auth: AuthService,
    private inventorySvc: InventoryService,
    private auctionSvc: AuctionService,
    @Inject(MAT_DIALOG_DATA)
    public data: { mode: Mode; initialData?: InventoryAuction | null; presetAuctionId?: number | null }
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    // build form
    this.form = this.fb.group({
      inventoryAuctionId: [0],
      inventoryId: [null, Validators.required],
      auctionId: [this.data?.presetAuctionId ?? null, Validators.required],
      inventoryAuctionStatusId: [1, [Validators.required, Validators.min(1)]],
      auctionStartPrice: [null, [Validators.min(0)]],
      buyNowPrice: [null, [Validators.min(0)]],
      reservePrice: [null, [Validators.min(0)]]
    });

    // preload inventories
    this.loadingInventories = true;
    this.inventorySvc.getList().subscribe({
      next: (list) => (this.inventories = list ?? []),
      error: () => (this.inventories = []),
      complete: () => (this.loadingInventories = false)
    });

    // preload auctions
    this.loadingAuctions = true;
    this.auctionSvc.getList().subscribe({
      next: (list) => (this.auctions = list ?? []),
      error: () => (this.auctions = []),
      complete: () => (this.loadingAuctions = false)
    });

    // if editing, populate fields
    if (this.mode === 'edit' && this.data.initialData) {
      const r = this.data.initialData;
      this.form.patchValue({
        inventoryAuctionId: (r as any).inventoryAuctionId ?? (r as any).inventoryauctionId ?? 0,
        inventoryId: r.inventoryId ?? null,
        auctionId: r.auctionId ?? null,
        inventoryAuctionStatusId:
          (r as any).inventoryAuctionStatusId ?? (r as any).inventoryauctionStatusId ?? 1,
        auctionStartPrice: r.auctionStartPrice ?? null,
        buyNowPrice: r.buyNowPrice ?? null,
        reservePrice: r.reservePrice ?? null
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: InventoryAuction = {
      // ids
      inventoryAuctionId: v.inventoryAuctionId,
      inventoryId: v.inventoryId,
      auctionId: v.auctionId,
      inventoryAuctionStatusId: v.inventoryAuctionStatusId,

      // money fields (optional)
      auctionStartPrice: v.auctionStartPrice ?? 0,
      buyNowPrice: v.buyNowPrice ?? 0,
      reservePrice: v.reservePrice ?? 0,

      // snapshot field comes from SP
      bidIncrement: 0,

      // audit
      createdById: this.mode === 'create' ? currentUserId : null,
      createdDate: null,
      modifiedById: currentUserId ?? null,
      modifiedDate: null,
      active: undefined
    } as InventoryAuction;

    this.dialogRef.close(
      this.mode === 'create'
        ? { action: 'create', payload }
        : { action: 'edit', payload }
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // labels
  inventoryLabel(i: any): string {
    // Prefer displayName; fallback to id
    return i?.displayName ? `${i.displayName} (#${i.inventoryId})` : `Inventory #${i?.inventoryId}`;
  }
  auctionLabel(a: any): string {
    return a?.auctionName ? `${a.auctionName} (#${a.auctionId})` : `Auction #${a?.auctionId}`;
  }
}
