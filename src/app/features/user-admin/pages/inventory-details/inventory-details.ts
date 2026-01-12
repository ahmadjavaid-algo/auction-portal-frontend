// inventory-details.ts (REPLICATED FROM users-details, adapted for Inventory)

import { Component, inject, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { InventoryService } from '../../../../services/inventory.service';
import { Inventory } from '../../../../models/inventory.model';

import { InventoryDocumentFileService } from '../../../../services/inventorydocumentfile.service';
import { InventoryDocumentFile } from '../../../../models/inventorydocumentfile.model';
import { AuthService } from '../../../../services/auth';

type ProductSnapshot = {
  productId?: number;
  displayName?: string;
  make?: string;
  model?: string;
  year?: string | number;
  category?: string;

  ProductId?: number;
  DisplayName?: string;
  Make?: string;
  Model?: string;
  Year?: string | number;
  Category?: string;

  [k: string]: any;
} | null;

type InvDoc = InventoryDocumentFile & {
  documentUrl?: string | null;
  documentExtension?: string | null;
};

@Component({
  selector: 'app-inventory-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './inventory-details.html',
  styleUrls: ['./inventory-details.scss']
})
export class InventoryDetails implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private invSvc = inject(InventoryService);
  private invDocSvc = inject(InventoryDocumentFileService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  loading = true;
  error: string | null = null;

  inventory: Inventory | null = null;
  product: ProductSnapshot = null;

  filesLoading = false;
  docs: InvDoc[] = [];

  private intersectionObserver?: IntersectionObserver;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid inventory ID.';
      this.loading = false;
      return;
    }

    this.invSvc.getById(id).subscribe({
      next: (inv) => {
        this.inventory = inv;
        this.product = this.safeParse(inv?.productJSON);
        this.loading = false;
        this.loadDocs();
      },
      error: (e) => {
        this.error = e?.error?.message || 'Failed to load inventory details.';
        this.loading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    this.initScrollReveal();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
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
        rootMargin: '0px 0px -50px 0px'
      }
    );

    setTimeout(() => {
      const elements = document.querySelectorAll('.reveal-on-scroll');
      elements.forEach((el) => this.intersectionObserver?.observe(el));
    }, 100);
  }

  private loadDocs(): void {
    if (!this.inventory?.inventoryId) return;

    this.filesLoading = true;

    this.invDocSvc.getList().subscribe({
      next: (all) => {
        const id = this.inventory!.inventoryId;
        this.docs = (all as InvDoc[]).filter(d => d.inventoryId === id && (d.active ?? true));
      },
      error: () => this.snack.open('Failed to load files.', 'Dismiss', { duration: 2500 }),
      complete: () => (this.filesLoading = false)
    });
  }

  back(): void {
    this.router.navigate(['/admin/inventory']);
  }

  // ------------------------
  // HERO / UI HELPERS (replicated)
  // ------------------------

  private getProductName(): string {
    const p: any = this.product || {};
    const name = (p.displayName ?? p.DisplayName ?? '').toString().trim();
    return name;
  }

  private getProductMake(): string {
    const p: any = this.product || {};
    return (p.make ?? p.Make ?? '').toString().trim();
  }

  private getProductModel(): string {
    const p: any = this.product || {};
    return (p.model ?? p.Model ?? '').toString().trim();
  }

  private getProductYear(): string {
    const p: any = this.product || {};
    const v = p.year ?? p.Year;
    return (v === 0 || v) ? String(v) : '';
  }

  private getProductCategory(): string {
    const p: any = this.product || {};
    return (p.category ?? p.Category ?? '').toString().trim();
  }

  get initials(): string {
    const name = this.getProductName();
    if (name) {
      const parts = String(name).trim().split(/\s+/);
      const a = parts[0]?.[0] ?? 'I';
      const b = parts[1]?.[0] ?? 'N';
      return (a + b).toUpperCase();
    }
    return 'IN';
  }

  get fullName(): string {
    const name = this.getProductName();
    if (name) return name;
    const id = this.inventory?.inventoryId;
    return id ? `Inventory #${id}` : 'Inventory';
  }

  get subtitleLine(): string {
    const invId = this.inventory?.inventoryId ?? '—';
    const prodId = this.inventory?.productId ?? '—';
    const make = this.getProductMake();
    const model = this.getProductModel();
    const year = this.getProductYear();

    const mm = [make, model].filter(Boolean).join(' ');
    const ym = [year, mm].filter(Boolean).join(' • ');
    return ym
      ? `Inventory #${invId} • Product #${prodId} • ${ym}`
      : `Inventory #${invId} • Product #${prodId}`;
  }

  get hasJSON(): boolean {
    const txt = this.inventory?.productJSON?.trim();
    return !!(txt && txt.length);
  }

  get lastTouched(): any {
    // “activity” for inventory = last modified, fallback to created
    return this.inventory?.modifiedDate || this.inventory?.createdDate || null;
  }

  get activityStatus(): 'online' | 'recent' | 'away' | 'inactive' {
    const dt = this.lastTouched;
    if (!dt) return 'inactive';

    const touched = new Date(dt);
    if (isNaN(touched.getTime())) return 'inactive';

    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - touched.getTime()) / 60000);

    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 60) return 'recent';
    if (diffMinutes < 1440) return 'away';
    return 'inactive';
  }

  get activityStatusLabel(): string {
    switch (this.activityStatus) {
      case 'online': return 'Updated Just Now';
      case 'recent': return 'Updated Recently';
      case 'away': return 'Updated Earlier';
      default: return 'Not Updated Recently';
    }
  }

  formatDate(date: any): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatLastLogin(date: any): string {
    // Reused: “last login” -> “last update”
    if (!date) return 'Never';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Never';

    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return this.formatDate(date);
  }

  getAccountAge(): string {
    if (!this.inventory?.createdDate) return '—';
    const created = new Date(this.inventory.createdDate);
    if (isNaN(created.getTime())) return '—';

    const now = new Date();
    const diff = now.getTime() - created.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} months`;
    const years = Math.floor(months / 12);
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }

  getAccountAgeDetailed(): string {
    if (!this.inventory?.createdDate) return 'Unknown';
    const created = new Date(this.inventory.createdDate);
    if (isNaN(created.getTime())) return 'Unknown';

    const now = new Date();
    const diff = now.getTime() - created.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) {
      const weeks = Math.floor(days / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    }
    if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    }
    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);
    return remainingMonths > 0
      ? `${years}y ${remainingMonths}m ago`
      : `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }

  editInventory(): void {
    if (this.inventory) {
      this.router.navigate(['/admin/inventory'], {
        queryParams: { edit: this.inventory.inventoryId }
      });
    }
  }

  deleteInventory(): void {
    if (!this.inventory) return;
    if (confirm(`Are you sure you want to delete ${this.fullName}?`)) {
      // Implement delete functionality
      console.log('Delete inventory:', this.inventory.inventoryId);
      this.snack.open('Delete action triggered (implement API).', 'OK', { duration: 2200 });
    }
  }

  toggleInventoryStatus(): void {
    if (!this.inventory) return;
    // Implement toggle active/inactive
    console.log('Toggle status for inventory:', this.inventory.inventoryId);
    this.snack.open('Toggle status triggered (implement API).', 'OK', { duration: 2200 });
  }

  // ------------------------
  // FILES (kept from your inventory-details)
  // ------------------------

  private safeParse(json?: string | null): ProductSnapshot {
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
  }

  displayName(d: InvDoc): string {
    return d.documentDisplayName || d.documentName || `#${d.documentFileId}`;
  }

  isImage(d: InvDoc): boolean {
    const extRaw = (d.documentExtension || d.documentName || '').toString().toLowerCase();
    const ext = extRaw.startsWith('.') ? extRaw : `.${extRaw}`;
    return ['.jpg', '.jpeg', '.png', '.webp'].some(x => ext.endsWith(x));
  }

  openUrl(d: InvDoc): void {
    const url = d.documentUrl || '';
    if (url) window.open(url, '_blank');
  }

  remove(d: InvDoc): void {
    const payload = {
      inventoryDocumentFileId: d.inventoryDocumentFileId,
      active: false,
      modifiedById: this.auth.currentUser?.userId ?? null
    } as any;

    this.invDocSvc.activate(payload).subscribe({
      next: (ok) => {
        if (ok) {
          this.docs = this.docs.filter(x => x.inventoryDocumentFileId !== d.inventoryDocumentFileId);
          this.snack.open('Removed.', 'OK', { duration: 1800 });
        } else {
          this.snack.open('Failed to remove.', 'Dismiss', { duration: 2500 });
        }
      },
      error: () => this.snack.open('Failed to remove.', 'Dismiss', { duration: 2500 })
    });
  }

  trackByDoc(_i: number, d: InvDoc): number {
    return Number(d.inventoryDocumentFileId ?? d.documentFileId ?? _i);
  }

  // Template helpers for snapshot fields (nice fallbacks)
  get productMake(): string { return this.getProductMake() || '—'; }
  get productModel(): string { return this.getProductModel() || '—'; }
  get productYear(): string { return this.getProductYear() || '—'; }
  get productCategory(): string { return this.getProductCategory() || '—'; }
  get productDisplayName(): string { return this.getProductName() || '—'; }
}
