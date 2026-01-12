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

import { InspectorsService } from '../../../../services/inspectors.service';
import { Inspector } from '../../../../models/inspector.model';

@Component({
  selector: 'app-inspectors-details',
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
  templateUrl: './inspectors-details.html',
  styleUrls: ['./inspectors-details.scss']
})
export class InspectorsDetails implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inspectorsSvc = inject(InspectorsService);

  loading = true;
  error: string | null = null;

  // Keep the same variable name used by the replicated template
  user: Inspector | null = null;

  private intersectionObserver?: IntersectionObserver;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid inspector ID.';
      this.loading = false;
      return;
    }

    this.inspectorsSvc.getById(id).subscribe({
      next: (u) => {
        this.user = u;
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'Failed to load inspector details.';
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
      elements.forEach((el) => {
        this.intersectionObserver?.observe(el);
      });
    }, 100);
  }

  back(): void {
    this.router.navigate(['/admin/inspectors']);
  }

  get initials(): string {
    if (!this.user) return 'I';
    const first = (this.user.firstName?.[0] ?? '').toUpperCase();
    const last = (this.user.lastName?.[0] ?? this.user.userName?.[0] ?? '').toUpperCase();
    return first && last ? first + last : first || last || 'I';
  }

  get fullName(): string {
    if (!this.user) return '';
    const first = (this.user.firstName ?? '').trim();
    const last = (this.user.lastName ?? '').trim();
    const full = [first, last].filter(Boolean).join(' ');
    return full || this.user.userName || 'Unknown Inspector';
  }

  get roleIds(): number[] {
    const v: any = (this.user as any)?.roleId;
    if (Array.isArray(v)) {
      return v
        .map((n: any) => Number(n))
        .filter((n: number) => Number.isFinite(n));
    }
    if (typeof v === 'number' && Number.isFinite(v)) return [v];
    return [];
  }

  get hasRoles(): boolean {
    return this.roleIds.length > 0;
  }

  get activityStatus(): 'online' | 'recent' | 'away' | 'inactive' {
    if (!this.user?.loginDate) return 'inactive';

    const lastLogin = new Date(this.user.loginDate);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastLogin.getTime()) / 60000);

    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 60) return 'recent';
    if (diffMinutes < 1440) return 'away';
    return 'inactive';
  }

  get activityStatusLabel(): string {
    switch (this.activityStatus) {
      case 'online': return 'Online Now';
      case 'recent': return 'Active Recently';
      case 'away': return 'Away';
      default: return 'Offline';
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
    if (!this.user?.createdDate) return '—';
    const created = new Date(this.user.createdDate);
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
    if (!this.user?.createdDate) return 'Unknown';
    const created = new Date(this.user.createdDate);
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

  editUser(): void {
    if (this.user) {
      this.router.navigate(['/admin/inspectors'], {
        queryParams: { edit: (this.user as any).userId }
      });
    }
  }

  deleteUser(): void {
    if (!this.user) return;
    if (confirm(`Are you sure you want to delete ${this.fullName}?`)) {
      // Implement delete functionality
      console.log('Delete inspector:', (this.user as any).userId);
    }
  }

  toggleUserStatus(): void {
    if (!this.user) return;
    // Implement toggle status
    console.log('Toggle status for:', (this.user as any).userId);
  }

  resendVerification(): void {
    if (!this.user) return;
    // Implement resend verification
    console.log('Resend verification to:', (this.user as any).email);
  }

  resetPassword(): void {
    if (!this.user) return;
    // Implement password reset
    console.log('Reset password for:', (this.user as any).userId);
  }

  trackByRole(_i: number, rid: number): number {
    return rid;
  }
}
