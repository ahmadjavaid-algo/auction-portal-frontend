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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SelectionModel } from '@angular/cdk/collections';
import { forkJoin } from 'rxjs';

import { ProductsService } from '../../../../services/products.service';
import { Product } from '../../../../models/product.model';
import { AuthService } from '../../../../services/auth';

// Inventory bits
import { InventoryService } from '../../../../services/inventory.service';
import { Inventory } from '../../../../models/inventory.model';

// Dialog component (standalone)
import { ProductsForm, ProductFormResult } from '../products-form/products-form';

@Component({
  selector: 'app-products-list',
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
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatTooltipModule
  ],
  templateUrl: './products-list.html',
  styleUrls: ['./products-list.scss']
})
export class ProductsList {
  private productsSvc = inject(ProductsService);
  private invSvc = inject(InventoryService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);

  /** order must match template columns */
  displayedColumns: string[] = ['select', 'name', 'make', 'model', 'year', 'category', 'status', 'actions'];
  products = new MatTableDataSource<Product>([]);
  totalItems = 0;

  pageSize = 10;
  pageIndex = 0;
  searchTerm = '';

  // dashboard counters
  stats = { total: 0, active: 0, inactive: 0, categories: 0 };

  // loading flag (for initial and refresh)
  loading = false;

  /** Set of productIds that already exist in inventory */
  private inventoryProductIds = new Set<number>();

  /** Table row selection (only for items NOT already in inventory) */
  selection = new SelectionModel<Product>(true, []);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.loadData(); // load products + inventory together

    // search across name + related names (using any because model omits the *_Name fields)
    this.products.filterPredicate = (p: Product, filter: string) => {
      const anyp = p as any;
      const haystack = [
        p.displayName ?? '',
        anyp.makeName ?? '',
        anyp.modelName ?? '',
        anyp.yearName ?? '',
        anyp.categoryName ?? ''
      ].join(' ').toLowerCase();
      return haystack.includes(filter);
    };
  }

  ngAfterViewInit(): void {
    this.products.paginator = this.paginator;
  }

  /** Load products and inventory in parallel so we can flip the plus/check icon & checkboxes */
  private loadData(): void {
    this.loading = true;
    forkJoin({
      products: this.productsSvc.getList(),
      inventory: this.invSvc.getList()
    }).subscribe({
      next: ({ products, inventory }) => {
        this.products.data = products ?? [];
        this.inventoryProductIds = new Set((inventory ?? []).map((i: Inventory) => i.productId));

        // Clear previous selection when data changes
        this.selection.clear();

        if (this.paginator) this.products.paginator = this.paginator;
        this.applyPagingTotals();
        this.computeStats();
      },
      error: (e) => {
        console.error('Failed to load data', e);
        this.snack.open('Failed to load products/inventory.', 'Dismiss', { duration: 3000 });
      },
      complete: () => (this.loading = false)
    });
  }

  private computeStats(): void {
    const all = this.products.data;
    const active = all.filter(x => x.active === true).length;
    const inactive = all.length - active;

    // distinct categories
    const catSet = new Set(all.map(p => p.categoryId));
    this.stats = {
      total: all.length,
      active,
      inactive,
      categories: catSet.size
    };
  }

  // ---- Display helpers ----
  getCreatedAt(p: Product): Date | null {
    return p.createdDate ? new Date(p.createdDate) : null;
  }

  /** Is this product already in inventory? */
  isInInventory(productId: number): boolean {
    return this.inventoryProductIds.has(productId);
  }

  // ---- Selection helpers ----
  canSelect(p: Product): boolean {
    return !this.isInInventory(p.productId);
  }

  toggleRow(p: Product): void {
    if (!this.canSelect(p)) return;
    this.selection.toggle(p);
  }

  /** rows available to select (respecting current filter) */
  private selectableRows(): Product[] {
    const list = this.products.filter ? this.products.filteredData : this.products.data;
    return list.filter(p => this.canSelect(p));
  }

  /** master checkbox state & handlers */
  get allSelectableSelected(): boolean {
    const rows = this.selectableRows();
    return rows.length > 0 && rows.every(r => this.selection.isSelected(r));
  }
  get someSelectableSelected(): boolean {
    const rows = this.selectableRows();
    return rows.some(r => this.selection.isSelected(r)) && !this.allSelectableSelected;
  }
  masterToggle(): void {
    const rows = this.selectableRows();
    if (this.allSelectableSelected) {
      rows.forEach(r => this.selection.deselect(r));
    } else {
      rows.forEach(r => this.selection.select(r));
    }
  }

  get selectedCount(): number {
    return this.selection.selected.length;
  }

  // ---- Search / Paging ----
  onSearch(): void {
    this.products.filter = this.searchTerm.trim().toLowerCase();
    this.totalItems = this.products.filteredData.length;
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
    this.totalItems = this.products.filter ? this.products.filteredData.length : this.products.data.length;
  }

  /** Range helpers for the right-bottom label */
  get rangeStart(): number {
    if (!this.totalItems) return 0;
    return this.pageIndex * this.pageSize + 1;
  }
  get rangeEnd(): number {
    return Math.min(this.totalItems, (this.pageIndex + 1) * this.pageSize);
  }

  // ===== Dialogs =====

  /** Create Product */
  openCreateProduct(): void {
    const ref = this.dialog.open<ProductsForm, { mode: 'create' }, ProductFormResult>(ProductsForm, {
      width: '720px',
      data: { mode: 'create' }
    });

    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      if (res.action === 'create') {
        this.productsSvc.add(res.payload).subscribe({
          next: (id) => {
            this.snack.open(`Product created (ID ${id}).`, 'OK', { duration: 2500 });
            this.loadData();
          },
          error: (e) => this.snack.open(e?.error?.message || 'Failed to create product.', 'Dismiss', { duration: 3000 })
        });
      }
    });
  }

  /** Edit Product */
  editProduct(row: Product): void {
    const ref = this.dialog.open<ProductsForm, { mode: 'edit'; initialData: Product }, ProductFormResult>(ProductsForm, {
      width: '720px',
      data: { mode: 'edit', initialData: row }
    });

    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      if (res.action === 'edit') {
        this.productsSvc.update(res.payload).subscribe({
          next: (ok) => {
            if (ok) {
              this.snack.open('Product updated.', 'OK', { duration: 2000 });
              this.loadData();
            } else {
              this.snack.open('Failed to update product.', 'Dismiss', { duration: 3000 });
            }
          },
          error: (e) => this.snack.open(e?.error?.message || 'Failed to update product.', 'Dismiss', { duration: 3000 })
        });
      }
    });
  }

  /** Toggle Active/Inactive */
  toggleActive(p: Product): void {
    const newState = !(p.active ?? false);
    const payload = {
      ProductId: p.productId,
      Active: newState,
      ModifiedById: this.auth.currentUser?.userId ?? null
    };
    this.productsSvc.activate(payload).subscribe({
      next: (ok) => {
        if (ok) {
          p.active = newState;
          this.snack.open(`Product ${newState ? 'activated' : 'deactivated'}.`, 'OK', { duration: 2000 });
          this.computeStats();
        } else {
          this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 });
        }
      },
      error: () => this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 })
    });
  }

  // ===== Inventory quick-add single =====
  addToInventory(p: Product): void {
    if (this.isInInventory(p.productId)) {
      this.snack.open('This product is already in inventory.', 'OK', { duration: 2000 });
      return;
    }

    const payload = {
      inventoryId: 0,
      productId: p.productId,
      productJSON: '', // server builds this
      description: '',
      createdById: this.auth.currentUser?.userId ?? null,
      createdDate: null,
      modifiedById: this.auth.currentUser?.userId ?? null,
      modifiedDate: null,
      active: true
    } as any;

    this.invSvc.add(payload).subscribe({
      next: (newId: number) => {
        // mark as present so the icon/checkbox flips immediately
        this.inventoryProductIds.add(p.productId);
        // also deselect if it was selected
        this.selection.deselect(p);

        this.snack.open(`Added to inventory (ID ${newId}).`, 'View', { duration: 3000 })
          .onAction().subscribe(() => this.router.navigate(['/admin/inventory', newId]));
      },
      error: (e) => {
        const msg = e?.error?.message || 'Failed to add to inventory.';
        this.snack.open(msg, 'Dismiss', { duration: 3000 });
      }
    });
  }

  // ===== Inventory bulk-add =====
  addSelectedToInventory(): void {
    const items = this.selection.selected.filter(p => !this.isInInventory(p.productId));
    if (items.length === 0) return;

    const currentUserId = this.auth.currentUser?.userId ?? null;

    const calls = items.map(p =>
      this.invSvc.add({
        inventoryId: 0,
        productId: p.productId,
        productJSON: '',
        description: '',
        createdById: currentUserId,
        createdDate: null,
        modifiedById: currentUserId,
        modifiedDate: null,
        active: true
      } as any)
    );

    forkJoin(calls).subscribe({
      next: (ids: number[]) => {
        // update local state
        items.forEach(p => this.inventoryProductIds.add(p.productId));
        this.selection.clear();

        this.snack.open(`Added ${ids.length} product(s) to inventory.`, 'OK', { duration: 3000 });
      },
      error: (e) => {
        const msg = e?.error?.message || 'Failed to add selected products.';
        this.snack.open(msg, 'Dismiss', { duration: 3000 });
      }
    });
  }

  // Optional details route
  viewProduct(productId: number): void {
    this.router.navigate(['/admin/products', productId]);
  }
}
