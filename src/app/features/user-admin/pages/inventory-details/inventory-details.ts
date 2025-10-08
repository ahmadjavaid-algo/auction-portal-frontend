import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

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
  // tolerate PascalCase too
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
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './inventory-details.html',
  styleUrls: ['./inventory-details.scss']
})
export class InventoryDetails {
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

  // files for this inventory
  filesLoading = false;
  docs: InvDoc[] = [];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid inventory id.';
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
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load inventory.';
        this.loading = false;
      }
    });
  }

  private loadDocs(): void {
    if (!this.inventory?.inventoryId) return;
    this.filesLoading = true;

    this.invDocSvc.getList().subscribe({
      next: (all) => {
        const id = this.inventory!.inventoryId;
        this.docs = (all as InvDoc[]).filter(
          d => d.inventoryId === id && (d.active ?? true)
        );
      },
      error: () => this.snack.open('Failed to load files.', 'Dismiss', { duration: 2500 }),
      complete: () => (this.filesLoading = false)
    });
  }

  back(): void {
    this.router.navigate(['/admin/inventory']);
  }

  get initials(): string {
    const name =
      (this.product as any)?.displayName ??
      (this.product as any)?.DisplayName ??
      '';
    if (name) {
      const parts = String(name).trim().split(/\s+/);
      const a = parts[0]?.[0] ?? 'I';
      const b = parts[1]?.[0] ?? 'N';
      return (a + b).toUpperCase();
    }
    return 'IN';
  }

  get hasJSON(): boolean {
    const txt = this.inventory?.productJSON?.trim();
    return !!(txt && txt.length);
  }

  private safeParse(json?: string | null): ProductSnapshot {
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
  }

  // ===== Files UI helpers =====
  displayName(d: InvDoc): string {
    return d.documentDisplayName || d.documentName || `#${d.documentFileId}`;
  }

  isImage(d: InvDoc): boolean {
    const extRaw = (d.documentExtension || d.documentName || '').toString().toLowerCase();
    const ext = extRaw.startsWith('.') ? extRaw : `.${extRaw}`;
    return ['.jpg', '.jpeg', '.png'].some(x => ext.endsWith(x));
  }

  openUrl(d: InvDoc): void {
    const url = d.documentUrl || '';
    if (url) window.open(url, '_blank');
  }

  remove(d: InvDoc): void {
    if (!confirm(`Remove "${this.displayName(d)}"?`)) return;

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
}
