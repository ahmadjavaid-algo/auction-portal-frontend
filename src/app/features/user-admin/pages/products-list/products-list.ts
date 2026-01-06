import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { SelectionModel } from '@angular/cdk/collections';

import { ProductsService } from '../../../../services/products.service';
import { Product } from '../../../../models/product.model';
import { AuthService } from '../../../../services/auth';
import { InventoryService } from '../../../../services/inventory.service';
import { Inventory } from '../../../../models/inventory.model';

import { ProductsForm, ProductFormResult } from '../products-form/products-form';
import {
  AddToInventoryDialog,
  AddToInventoryResult
} from '../add-to-inventory.dialog/add-to-inventory.dialog';

type ProductStats = {
  total: number;
  active: number;
  inactive: number;
  categories: number;
};

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
    MatTooltipModule,
    MatCheckboxModule
  ],
  templateUrl: './products-list.html',
  styleUrls: ['./products-list.scss']
})
export class ProductsList implements OnInit, AfterViewInit, OnDestroy {
  private host = inject(ElementRef<HTMLElement>);

  private productsSvc = inject(ProductsService);
  private invSvc = inject(InventoryService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);

  displayedColumns: string[] = [
    'select',
    'product',
    'make',
    'model',
    'year',
    'category',
    'status',
    'actions'
  ];

  products = new MatTableDataSource<Product>([]);
  totalItems = 0;

  pageSize = 10;
  pageIndex = 0;
  searchTerm = '';

  stats: ProductStats = { total: 0, active: 0, inactive: 0, categories: 0 };

  // Animated stats values (same pattern as UsersList)
  animatedStats: ProductStats = { total: 0, active: 0, inactive: 0, categories: 0 };

  loading = false;

  // single-select (kept)
  selection = new SelectionModel<Product>(false, []);

  private intersectionObserver?: IntersectionObserver;
  private animationFrames: number[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.loadData();

    this.products.filterPredicate = (p: Product, filter: string) => {
      const anyp = p as any;
      const haystack = [
        p.displayName ?? '',
        anyp.makeName ?? '',
        anyp.modelName ?? '',
        anyp.yearName ?? '',
        anyp.categoryName ?? '',
        String(p.productId ?? '')
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(filter);
    };
  }

  ngAfterViewInit(): void {
    this.products.paginator = this.paginator;
    this.initScrollReveal();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    this.animationFrames.forEach(id => cancelAnimationFrame(id));
  }

  private initScrollReveal(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            this.intersectionObserver?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    setTimeout(() => {
      const elements = document.querySelectorAll('.reveal-on-scroll');
      elements.forEach((el) => this.intersectionObserver?.observe(el));
    }, 100);
  }

  private loadData(): void {
    this.loading = true;

    this.productsSvc.getList().subscribe({
      next: (list) => {
        this.products.data = list ?? [];
        this.totalItems = this.products.data.length;

        if (this.paginator) this.products.paginator = this.paginator;

        this.applyPagingTotals();
        this.computeStats();
        this.animateStats();

        this.selection.clear();
      },
      error: (e) => {
        console.error('Failed to load products', e);
        this.snack.open('Failed to load products.', 'Dismiss', { duration: 3000 });
      },
      complete: () => (this.loading = false)
    });
  }

  private computeStats(): void {
    const all = this.products.data ?? [];
    const active = all.filter(x => x.active === true).length;
    const inactive = all.length - active;

    const catSet = new Set(all.map(p => (p as any).categoryId ?? p.categoryId));
    this.stats = {
      total: all.length,
      active,
      inactive,
      categories: catSet.size
    };
  }

  private animateStats(): void {
    const duration = 1500;
    const startTime = performance.now();

    const start = { ...this.animatedStats };
    const target = { ...this.stats };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      this.animatedStats.total = Math.floor(start.total + (target.total - start.total) * eased);
      this.animatedStats.active = Math.floor(start.active + (target.active - start.active) * eased);
      this.animatedStats.inactive = Math.floor(start.inactive + (target.inactive - start.inactive) * eased);
      this.animatedStats.categories = Math.floor(start.categories + (target.categories - start.categories) * eased);

      if (progress < 1) {
        const frameId = requestAnimationFrame(animate);
        this.animationFrames.push(frameId);
      }
    };

    const frameId = requestAnimationFrame(animate);
    this.animationFrames.push(frameId);
  }

  // ---------- UI helpers ----------
  getDisplayName(p: Product): string {
    return (p.displayName ?? '').trim() || `Product #${p.productId ?? ''}`;
  }

  getProductInitials(p: Product): string {
    const name = (p.displayName ?? '').trim();
    if (!name) return 'PR';

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  // ---------- search / paging ----------
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
    this.totalItems = this.products.filter
      ? this.products.filteredData.length
      : this.products.data.length;
  }

  get rangeStart(): number {
    if (!this.totalItems) return 0;
    return this.pageIndex * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.totalItems, (this.pageIndex + 1) * this.pageSize);
  }

  // ---------- selection ----------
  onRowCheckboxChange(p: Product): void {
    if (this.selection.isSelected(p)) {
      this.selection.deselect(p);
    } else {
      this.selection.clear();
      this.selection.select(p);
    }
  }

  // ---------- create/edit/status ----------
  openCreateProduct(): void {
    const ref = this.dialog.open<
      ProductsForm,
      { mode: 'create' },
      ProductFormResult
    >(ProductsForm, {
      width: '820px',
      data: { mode: 'create' }
    });

    ref.afterClosed().subscribe((res) => {
      if (!res || res.action !== 'create') return;

      this.productsSvc.add(res.payload).subscribe({
        next: (id) => {
          this.snack.open(`Product created successfully (ID ${id}).`, 'OK', { duration: 2500 });
          this.loadData();
        },
        error: (e) =>
          this.snack.open(e?.error?.message || 'Failed to create product.', 'Dismiss', {
            duration: 3000
          })
      });
    });
  }

  editProduct(row: Product): void {
    const ref = this.dialog.open<
      ProductsForm,
      { mode: 'edit'; initialData: Product },
      ProductFormResult
    >(ProductsForm, {
      width: '820px',
      data: { mode: 'edit', initialData: row }
    });

    ref.afterClosed().subscribe((res) => {
      if (!res || res.action !== 'edit') return;

      this.productsSvc.update(res.payload).subscribe({
        next: (ok) => {
          this.snack.open(ok ? 'Product updated successfully.' : 'Update failed.', 'OK', {
            duration: 2500
          });
          if (ok) this.loadData();
        },
        error: (e) =>
          this.snack.open(e?.error?.message || 'Failed to update product.', 'Dismiss', {
            duration: 3000
          })
      });
    });
  }

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
          this.snack.open(
            `Product ${newState ? 'activated' : 'deactivated'} successfully.`,
            'OK',
            { duration: 2000 }
          );
          this.computeStats();
          this.animateStats();
        } else {
          this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 });
        }
      },
      error: () =>
        this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 })
    });
  }

  // ---------- inventory ----------
  addSelectedToInventory(): void {
    const p = this.selection.selected[0];
    if (!p) return;
    this.addToInventory(p);
  }

  addToInventory(p: Product): void {
    const ref = this.dialog.open<
      AddToInventoryDialog,
      { product: Product },
      AddToInventoryResult
    >(AddToInventoryDialog, {
      width: '520px',
      data: { product: p }
    });

    ref.afterClosed().subscribe((result) => {
      if (!result) return;

      const currentUserId = this.auth.currentUser?.userId ?? null;

      const payload: Inventory = {
        inventoryId: 0,
        productId: p.productId,
        productJSON: '',
        description: '',
        chassisNo: result.chassisNo,
        registrationNo: result.registrationNo,
        createdById: currentUserId,
        createdDate: null,
        modifiedById: currentUserId,
        modifiedDate: null,
        active: true
      } as any;

      this.invSvc.add(payload).subscribe({
        next: (newId: number) => {
          this.snack
            .open(`Added to inventory (ID ${newId}).`, 'View', { duration: 3000 })
            .onAction()
            .subscribe(() => this.router.navigate(['/admin/inventory', newId]));
        },
        error: (e) => {
          const msg = e?.error?.message || 'Failed to add to inventory.';
          this.snack.open(msg, 'Dismiss', { duration: 3000 });
        }
      });
    });
  }

  viewProduct(productId: number): void {
    this.router.navigate(['/admin/products', productId]);
  }
}
