import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ProductsService } from '../../../../services/products.service';
import { Product } from '../../../../models/product.model';

@Component({
  selector: 'app-products-details',
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
  templateUrl: './products-details.html',
  styleUrls: ['./products-details.scss']
})
export class ProductsDetails {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productsSvc = inject(ProductsService);

  loading = true;
  error: string | null = null;
  product: Product | (Product & {
    makeName?: string;
    modelName?: string;
    yearName?: string | number;
    categoryName?: string;
  }) | null = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid product id.';
      this.loading = false;
      return;
    }

    this.productsSvc.getById(id).subscribe({
      next: (p) => {
        this.product = p;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load product.';
        this.loading = false;
      }
    });
  }

  back(): void {
    this.router.navigate(['/admin/products']);
  }

  get initials(): string {
    const name = this.product?.displayName?.trim();
    if (name) {
      const parts = name.split(/\s+/);
      const a = parts[0]?.[0] ?? 'P';
      const b = parts[1]?.[0] ?? 'R';
      return (a + b).toUpperCase();
    }
    return 'PR';
  }

  get hasRelations(): boolean {
    const p: any = this.product || {};
    return !!(p.makeName || p.modelName || p.yearName || p.categoryName || p.makeId || p.modelId || p.yearId || p.categoryId);
  }
}
