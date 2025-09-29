import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { InventoryService } from '../../../../services/inventory.service';
import { Inventory } from '../../../../models/inventory.model';
import { AuthService } from '../../../../services/auth';

import { InventoryForm, InventoryFormResult } from '../inventory-form/inventory-form';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './inventory-list.html',
  styleUrls: ['./inventory-list.scss']
})
export class InventoryList {
  private invSvc = inject(InventoryService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);

  /** order must match template columns */
  displayedColumns: string[] = [
    'name',
    'product',
    'chassis',
    'registration',
    'description',
    'status',
    'actions'
  ];
  inventory = new MatTableDataSource<Inventory>([]);
  totalItems = 0;

  pageSize = 10;
  pageIndex = 0;
  searchTerm = '';

  // dashboard counters
  stats = { total: 0, active: 0, inactive: 0, products: 0 };

  // loading indicator
  loading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.loadInventory();

    // Search across display name, category fields in JSON, chassis/registration, etc.
    this.inventory.filterPredicate = (i: Inventory, filter: string) => {
      const pj = this.safeParseProductJSON(i.productJSON);
      const haystack = [
        i.displayName ?? '',
        i.description ?? '',
        String(i.productId ?? ''),
        pj?.DisplayName ?? pj?.displayName ?? '',
        pj?.Make ?? pj?.make ?? '',
        pj?.Model ?? pj?.model ?? '',
        pj?.Year ?? pj?.year ?? '',
        pj?.Category ?? pj?.category ?? '',
        i.chassisNo ?? '',
        i.registrationNo ?? ''
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(filter);
    };
  }

  ngAfterViewInit(): void {
    this.inventory.paginator = this.paginator;
  }

  private loadInventory(): void {
    this.loading = true;
    this.invSvc.getList().subscribe({
      next: (list: Inventory[]) => {
        this.inventory.data = list ?? [];
        if (this.paginator) this.inventory.paginator = this.paginator;
        this.applyPagingTotals();
        this.computeStats();
      },
      error: (e) => {
        console.error('Failed to load inventory', e);
        this.snack.open('Failed to load inventory.', 'Dismiss', { duration: 3000 });
      },
      complete: () => (this.loading = false)
    });
  }

  private computeStats(): void {
    const all = this.inventory.data;
    const active = all.filter(x => x.active === true).length;
    const inactive = all.length - active;
    const prodSet = new Set(all.map(i => i.productId));

    this.stats = {
      total: all.length,
      active,
      inactive,
      products: prodSet.size
    };
  }

  getCreatedAt(i: Inventory): Date | null {
    return i.createdDate ? new Date(i.createdDate) : null;
  }

  getProductName(i: Inventory): string {
    if (i.displayName) return i.displayName;
    const pj = this.safeParseProductJSON(i.productJSON);
    return pj?.DisplayName || pj?.displayName || `#${i.productId}`;
  }

  getProductCategory(i: Inventory): string {
    const pj = this.safeParseProductJSON(i.productJSON);
    return pj?.Category || pj?.categoryName || pj?.category || '';
  }

  private safeParseProductJSON(json: string | null | undefined): any | null {
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
  }

  onSearch(): void {
    this.inventory.filter = this.searchTerm.trim().toLowerCase();
    this.totalItems = this.inventory.filteredData.length;
    if (this.paginator) {
      this.paginator.firstPage();
      this.pageIndex = 0;
    }
  }

  onPageChange(e: PageEvent): void {
    this.pageSize = e.pageSize;
    this.pageIndex = e.pageIndex;
    this.applyPagingTotals();
  }

  private applyPagingTotals(): void {
    this.totalItems = this.inventory.filter ? this.inventory.filteredData.length : this.inventory.data.length;
  }

  get rangeStart(): number {
    if (!this.totalItems) return 0;
    return this.pageIndex * this.pageSize + 1;
  }
  get rangeEnd(): number {
    return Math.min(this.totalItems, (this.pageIndex + 1) * this.pageSize);
  }

  openCreateInventory(): void {
    const ref = this.dialog.open<InventoryForm, { mode: 'create' }, InventoryFormResult>(InventoryForm, {
      width: '720px',
      data: { mode: 'create' }
    });

    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      if (res.action === 'create') {
        this.invSvc.add(res.payload).subscribe({
          next: (id) => {
            this.snack.open(`Inventory created (ID ${id}).`, 'OK', { duration: 2500 });
            this.loadInventory();
          },
          error: (e) => this.snack.open(e?.error?.message || 'Failed to create inventory.', 'Dismiss', { duration: 3000 })
        });
      }
    });
  }

  editInventory(row: Inventory): void {
    const ref = this.dialog.open<InventoryForm, { mode: 'edit'; initialData: Inventory }, InventoryFormResult>(InventoryForm, {
      width: '720px',
      data: { mode: 'edit', initialData: row }
    });

    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      if (res.action === 'edit') {
        this.invSvc.update(res.payload).subscribe({
          next: (ok) => {
            if (ok) {
              this.snack.open('Inventory updated.', 'OK', { duration: 2000 });
              this.loadInventory();
            } else {
              this.snack.open('Failed to update inventory.', 'Dismiss', { duration: 3000 });
            }
          },
          error: (e) => this.snack.open(e?.error?.message || 'Failed to update inventory.', 'Dismiss', { duration: 3000 })
        });
      }
    });
  }

  toggleActive(i: Inventory): void {
    const newState = !(i.active ?? false);
    const payload = {
      InventoryId: i.inventoryId,
      Active: newState,
      ModifiedById: this.auth.currentUser?.userId ?? null
    };
    this.invSvc.activate(payload).subscribe({
      next: (ok) => {
        if (ok) {
          i.active = newState;
          this.snack.open(`Inventory ${newState ? 'activated' : 'deactivated'}.`, 'OK', { duration: 2000 });
          this.computeStats();
        } else {
          this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 });
        }
      },
      error: () => this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 })
    });
  }

  viewInventory(inventoryId: number): void {
    this.router.navigate(['/admin/inventory', inventoryId]);
  }
}
