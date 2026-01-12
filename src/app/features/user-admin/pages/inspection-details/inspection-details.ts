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

import { InspectionType } from '../../../../models/inspectiontype.model';
import { InspectionTypesService } from '../../../../services/inspectiontypes.service';

@Component({
  selector: 'app-inspection-details',
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
  templateUrl: './inspection-details.html',
  styleUrls: ['./inspection-details.scss']
})
export class InspectionDetails implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inspTypeSvc = inject(InspectionTypesService);

  loading = true;
  error: string | null = null;
  inspectionType: InspectionType | null = null;

  private intersectionObserver?: IntersectionObserver;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid inspection type ID.';
      this.loading = false;
      return;
    }

    this.inspTypeSvc.getById(id).subscribe({
      next: (x) => {
        this.inspectionType = x;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load inspection type details.';
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
    this.router.navigate(['/admin/inspection']);
  }

  // ----------------------------
  // Header helpers (same UX as UsersDetails)
  // ----------------------------
  get initials(): string {
    const name = (this.inspectionType?.inspectionTypeName ?? '').trim();
    if (!name) return 'IT';
    const parts = name.split(/\s+/);
    const a = (parts[0]?.[0] ?? 'I').toUpperCase();
    const b = (parts[1]?.[0] ?? 'T').toUpperCase();
    return a + b;
  }

  get fullName(): string {
    const name = (this.inspectionType?.inspectionTypeName ?? '').trim();
    return name || 'Unknown Inspection Type';
  }

  get weightageLabel(): string {
    const w = this.inspectionType?.weightage;
    if (w === null || w === undefined) return '—';
    return `${w}%`;
  }

  get lastActivityDate(): any {
    // "Activity" for an inspection type = last modified (fallback created)
    return this.inspectionType?.modifiedDate ?? this.inspectionType?.createdDate ?? null;
  }

  get activityStatus(): 'online' | 'recent' | 'away' | 'inactive' {
    const dAny = this.lastActivityDate;
    if (!dAny) return 'inactive';

    const last = new Date(dAny);
    if (isNaN(last.getTime())) return 'inactive';

    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - last.getTime()) / 60000);

    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 60) return 'recent';
    if (diffMinutes < 1440) return 'away';
    return 'inactive';
  }

  get activityStatusLabel(): string {
    switch (this.activityStatus) {
      case 'online': return 'Updated Just Now';
      case 'recent': return 'Updated Recently';
      case 'away': return 'Not Updated Today';
      default: return 'No Recent Updates';
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

  getAccountAge(): string {
    if (!this.inspectionType?.createdDate) return '—';
    const created = new Date(this.inspectionType.createdDate);
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
    if (!this.inspectionType?.createdDate) return 'Unknown';
    const created = new Date(this.inspectionType.createdDate);
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

  // ----------------------------
  // Actions (same placements as UsersDetails)
  // ----------------------------
  editInspectionType(): void {
    if (!this.inspectionType) return;
    this.router.navigate(['/admin/inspection'], {
      queryParams: { edit: this.inspectionType.inspectionTypeId }
    });
  }

  viewCheckpoints(): void {
    if (!this.inspectionType) return;
    // Adjust route if your checkpoints page differs
    this.router.navigate(['/admin/inspectioncheckpoints'], {
      queryParams: { inspectionTypeId: this.inspectionType.inspectionTypeId }
    });
  }

  toggleInspectionStatus(): void {
    if (!this.inspectionType) return;
    // Implement API call when ready
    console.log('Toggle status for inspection type:', this.inspectionType.inspectionTypeId);
  }

  deleteInspectionType(): void {
    if (!this.inspectionType) return;
    if (confirm(`Are you sure you want to delete "${this.fullName}"?`)) {
      // Implement API call when ready
      console.log('Delete inspection type:', this.inspectionType.inspectionTypeId);
    }
  }
}
