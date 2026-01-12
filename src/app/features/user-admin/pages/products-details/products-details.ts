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

import { ProductsService } from '../../../../services/products.service';
import { Product } from '../../../../models/product.model';

type ProductWithNames = Product & {
  makeName?: string;
  modelName?: string;
  yearName?: string | number;
  categoryName?: string;
};

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
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './products-details.html',
  styleUrls: ['./products-details.scss']
})
export class ProductsDetails implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productsSvc = inject(ProductsService);

  loading = true;
  error: string | null = null;
  product: ProductWithNames | null = null;

  private intersectionObserver?: IntersectionObserver;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid product ID.';
      this.loading = false;
      return;
    }

    this.productsSvc.getById(id).subscribe({
      next: (p: any) => {
        this.product = p as ProductWithNames;
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'Failed to load product details.';
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
        rootMargin: '0px 0px -50px 0px',
      }
    );

    setTimeout(() => {
      const elements = document.querySelectorAll('.reveal-on-scroll');
      elements.forEach((el) => this.intersectionObserver?.observe(el));
    }, 100);
  }

  back(): void {
    this.router.navigate(['/admin/products']);
  }

  // ---------------------------
  // Display helpers
  // ---------------------------
  get initials(): string {
    const name = (this.product as any)?.displayName?.trim();
    if (name) {
      const parts = name.split(/\s+/);
      const a = parts[0]?.[0] ?? 'P';
      const b = parts[1]?.[0] ?? parts[0]?.[1] ?? 'R';
      return (a + b).toUpperCase();
    }
    return 'PR';
  }

  get title(): string {
    const p: any = this.product;
    return (p?.displayName ?? '').trim() || 'Unnamed Product';
  }

  get hasRelations(): boolean {
    const p: any = this.product || {};
    return !!(
      p.makeName || p.modelName || p.yearName || p.categoryName ||
      p.makeId || p.modelId || p.yearId || p.categoryId
    );
  }

  get relationIdsCount(): number {
    const p: any = this.product || {};
    const ids = [p.makeId, p.modelId, p.yearId, p.categoryId].filter((x: any) => x !== null && x !== undefined && x !== '');
    return ids.length;
  }

  get lastActivityDate(): any {
    const p: any = this.product;
    return p?.modifiedDate || p?.createdDate || null;
  }

  get activityStatus(): 'online' | 'recent' | 'away' | 'inactive' {
    const dt = this.lastActivityDate;
    if (!dt) return 'inactive';

    const last = new Date(dt);
    if (isNaN(last.getTime())) return 'inactive';

    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - last.getTime()) / 60000);

    // Mapping the same status buckets (but for "updated activity")
    if (diffMinutes < 5) return 'online';       // Updated just now
    if (diffMinutes < 60) return 'recent';      // Updated recently
    if (diffMinutes < 1440) return 'away';      // Updated today
    return 'inactive';                           // Old update
  }

  get activityStatusLabel(): string {
    switch (this.activityStatus) {
      case 'online': return 'Updated Just Now';
      case 'recent': return 'Updated Recently';
      case 'away': return 'Updated Today';
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

  formatLastActivity(date: any): string {
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

  getProductAge(): string {
    const p: any = this.product;
    const dt = p?.createdDate;
    if (!dt) return '—';

    const created = new Date(dt);
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

  getProductAgeDetailed(): string {
    const p: any = this.product;
    const dt = p?.createdDate;
    if (!dt) return 'Unknown';

    const created = new Date(dt);
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
    return remainingMonths > 0 ? `${years}y ${remainingMonths}m ago` : `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }

  // ---------------------------
  // Actions (same placeholders pattern as users-details)
  // ---------------------------
  editProduct(): void {
    if (!this.product) return;
    this.router.navigate(['/admin/products'], {
      queryParams: { edit: (this.product as any).productId }
    });
  }

  deleteProduct(): void {
    if (!this.product) return;
    const name = this.title;
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      // Implement delete functionality
      console.log('Delete product:', (this.product as any).productId);
    }
  }

  toggleProductStatus(): void {
    if (!this.product) return;
    // Implement toggle status
    console.log('Toggle status for:', (this.product as any).productId);
  }

  manageImages(): void {
    if (!this.product) return;
    // Implement images management
    console.log('Manage images for:', (this.product as any).productId);
  }

  trackByKey(_i: number, k: string): string {
    return k;
  }
}
