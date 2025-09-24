import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { InventoryService } from '../../../../services/inventory.service';
import { Inventory } from '../../../../models/inventory.model';

type ProductSnapshot = {
  ProductId?: number;
  DisplayName?: string;
  Make?: string;
  Model?: string;
  Year?: string | number;
  Category?: string;
  [k: string]: any;
} | null;

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
    MatProgressSpinnerModule
  ],
  templateUrl: './inventory-details.html',
  styleUrls: ['./inventory-details.scss']
})
export class InventoryDetails {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private invSvc = inject(InventoryService);

  loading = true;
  error: string | null = null;
  inventory: Inventory | null = null;

  // parsed product JSON (if present)
  product: ProductSnapshot = null;

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
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load inventory.';
        this.loading = false;
      }
    });
  }

  back(): void {
    this.router.navigate(['/admin/inventory']);
  }

  /** Avatar initials (e.g., "IN" or from DisplayName if available) */
  get initials(): string {
    if (this.product?.DisplayName) {
      const parts = String(this.product.DisplayName).trim().split(/\s+/);
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
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
