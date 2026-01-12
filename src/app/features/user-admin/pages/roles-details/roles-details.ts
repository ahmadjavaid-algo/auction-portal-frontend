// roles-details.ts
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

import { RolesService } from '../../../../services/roles.service';
import { Role } from '../../../../models/role.model';

@Component({
  selector: 'app-roles-details',
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
  templateUrl: './roles-details.html',
  styleUrls: ['./roles-details.scss']
})
export class RolesDetails implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rolesSvc = inject(RolesService);

  loading = true;
  error: string | null = null;
  role: Role | null = null;

  private intersectionObserver?: IntersectionObserver;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid role ID.';
      this.loading = false;
      return;
    }

    this.rolesSvc.getById(id).subscribe({
      next: (r) => {
        this.role = r;
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'Failed to load role details.';
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

  back(): void {
    this.router.navigate(['/admin/roles']);
  }

  // ======================
  // UI Getters (match UsersDetails structure)
  // ======================

  get initials(): string {
    if (!this.role) return 'R';
    const name = (this.role.roleName ?? '').trim();
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      const first = (parts[0]?.[0] ?? '').toUpperCase();
      const second = (parts[1]?.[0] ?? '').toUpperCase();
      const two = (first + second).trim();
      return two || first || 'R';
    }
    const code = (this.role.roleCode ?? '').trim();
    return (code.slice(0, 2) || 'R').toUpperCase();
  }

  get displayName(): string {
    if (!this.role) return '';
    const name = (this.role.roleName ?? '').trim();
    return name || this.role.roleCode || 'Unknown Role';
  }

  get hasDescription(): boolean {
    return !!(this.role?.description ?? '').trim();
  }

  private get activityAnchorDate(): any {
    // Roles don't have loginDate; use modifiedDate if available, otherwise createdDate.
    return this.role?.modifiedDate ?? this.role?.createdDate ?? null;
  }

  get activityStatus(): 'online' | 'recent' | 'away' | 'inactive' {
    const anchor = this.activityAnchorDate;
    if (!anchor) return 'inactive';

    const d = new Date(anchor);
    if (isNaN(d.getTime())) return 'inactive';

    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - d.getTime()) / 60000);

    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 60) return 'recent';
    if (diffMinutes < 1440) return 'away';
    return 'inactive';
  }

  get activityStatusLabel(): string {
    // Keep the same "activity" semantics, but for role updates.
    switch (this.activityStatus) {
      case 'online':
        return 'Updated Now';
      case 'recent':
        return 'Updated Recently';
      case 'away':
        return 'Not Updated Today';
      default:
        return 'No Recent Updates';
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

  formatLastUpdate(date: any): string {
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
    if (!this.role?.createdDate) return '—';
    const created = new Date(this.role.createdDate);
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
    if (!this.role?.createdDate) return 'Unknown';
    const created = new Date(this.role.createdDate);
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

  // ======================
  // Actions (match UsersDetails structure)
  // ======================

  editRole(): void {
    if (this.role) {
      this.router.navigate(['/admin/roles'], {
        queryParams: { edit: this.role.roleId }
      });
    }
  }

  deleteRole(): void {
    if (!this.role) return;
    if (confirm(`Are you sure you want to delete role "${this.displayName}"?`)) {
      // Implement delete functionality
      console.log('Delete role:', this.role.roleId);
    }
  }

  toggleRoleStatus(): void {
    if (!this.role) return;
    // Implement toggle status
    console.log('Toggle status for role:', this.role.roleId);
  }

  trackByDummy(_i: number, _v: any): number {
    return _i;
  }
}
