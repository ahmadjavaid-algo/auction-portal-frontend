import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { InventoryAuction } from '../../../../models/inventoryauction.model';
import { Inventory } from '../../../../models/inventory.model';
import { InventoryAuctionService } from '../../../../services/inventoryauctions.service';
import { InventoryService } from '../../../../services/inventory.service';
import { AuthService } from '../../../../services/auth';


import {
  InventoryauctionsForm,
  InventoryAuctionsFormResult
} from '../inventoryauctions-form/inventoryauctions-form';

@Component({
  selector: 'app-inventoryauctions-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './inventoryauctions-list.html',
  styleUrls: ['./inventoryauctions-list.scss']
})
export class InventoryauctionsList implements OnChanges {
  private invAucSvc = inject(InventoryAuctionService);
  private invSvc = inject(InventoryService); 
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);

  
  @Input() auctionId!: number;

  
  displayedColumns: string[] = [
    'inventory',
    'status',
    'bid',
    'auctionStart',
    'buy',
    'reserve',
    'active',
    'actions'
  ];

  rows: InventoryAuction[] = [];
  loading = false;

  
  private invMap = new Map<number, Inventory>();
  private invLoaded = false;

  ngOnChanges(changes: SimpleChanges): void {
    if ('auctionId' in changes && this.auctionId) this.load();
  }

  private load(): void {
    this.loading = true;

    
    this.ensureInventoryCache();

    this.invAucSvc.getList().subscribe({
      next: list => {
        
        this.rows = (list ?? []).filter(x => (x as any).auctionId === this.auctionId);
      },
      error: () =>
        this.snack.open('Failed to load inventory items for this auction.', 'Dismiss', { duration: 3000 }),
      complete: () => (this.loading = false)
    });
  }

  
  private ensureInventoryCache(): void {
    if (this.invLoaded) return;
    this.invLoaded = true;
    this.invSvc.getList().subscribe({
      next: list => (list ?? []).forEach(i => this.invMap.set(i.inventoryId, i)),
      error: () =>
        this.snack.open('Could not load inventory metadata for names/chassis.', 'Dismiss', { duration: 2500 })
    });
  }

  
  getInvName(id: number): string {
    const i = this.invMap.get(id);
    if (!i) return `Inventory #${id}`;
    if (i.displayName) return i.displayName;

    const pj = this.safeParse(i.productJSON);
    return pj?.DisplayName || pj?.displayName || `Inventory #${id}`;
  }

  getChassis(id: number): string | null {
    return this.invMap.get(id)?.chassisNo || null;
  }

  private safeParse(json?: string | null): any | null {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  toggleActive(row: InventoryAuction): void {
    const newState = !(row.active ?? false);
    this.invAucSvc
      .activate({
        
        InventoryAuctionId: (row as any).inventoryAuctionId ?? (row as any).inventoryauctionId,
        Active: newState,
        ModifiedById: this.auth.currentUser?.userId ?? null
      })
      .subscribe({
        next: ok => {
          if (ok) {
            row.active = newState;
            this.snack.open(`Item ${newState ? 'activated' : 'deactivated'}.`, 'OK', { duration: 2000 });
          } else {
            this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 });
          }
        },
        error: () => this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 })
      });
  }

  
  addItem(): void {
    const ref = this.dialog.open<
      InventoryauctionsForm,
      { mode: 'create'; presetAuctionId: number },
      InventoryAuctionsFormResult
    >(InventoryauctionsForm, {
      width: '720px',
      data: { mode: 'create', presetAuctionId: this.auctionId }
    });

    ref.afterClosed().subscribe(res => {
      if (!res) return;
      if (res.action === 'create') {
        const payload = { ...res.payload, auctionId: this.auctionId };
        this.invAucSvc.add(payload).subscribe({
          next: id => {
            this.snack.open(`Inventory added to auction (ID ${id}).`, 'OK', { duration: 2500 });
            this.load();
          },
          error: e =>
            this.snack.open(e?.error?.message || 'Failed to add inventory to auction.', 'Dismiss', {
              duration: 3000
            })
        });
      }
    });
  }

  
  editItem(row: InventoryAuction): void {
    const ref = this.dialog.open<
      InventoryauctionsForm,
      { mode: 'edit'; initialData: InventoryAuction },
      InventoryAuctionsFormResult
    >(InventoryauctionsForm, {
      width: '720px',
      data: { mode: 'edit', initialData: row }
    });

    ref.afterClosed().subscribe(res => {
      if (!res) return;
      if (res.action === 'edit') {
        const payload: InventoryAuction = {
          ...res.payload,
          inventoryAuctionId:
            (res.payload as any).inventoryAuctionId ?? (res.payload as any).inventoryauctionId,
          auctionId: this.auctionId
        } as InventoryAuction;

        this.invAucSvc.update(payload).subscribe({
          next: ok => {
            if (ok) {
              this.snack.open('Inventory in auction updated.', 'OK', { duration: 2000 });
              this.load();
            } else {
              this.snack.open('Failed to update item.', 'Dismiss', { duration: 3000 });
            }
          },
          error: e =>
            this.snack.open(e?.error?.message || 'Failed to update item.', 'Dismiss', { duration: 3000 })
        });
      }
    });
  }

  viewItem(_row: InventoryAuction): void {
    
  }
}
