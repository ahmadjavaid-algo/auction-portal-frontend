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

import { BiddersService } from '../../../../services/bidders.service';
import { Bidder } from '../../../../models/bidder.model';

@Component({
  selector: 'app-bidders-details',
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
  templateUrl: './bidders-details.html',
  styleUrls: ['./bidders-details.scss']
})
export class BiddersDetails implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private biddersSvc = inject(BiddersService);

  loading = true;
  error: string | null = null;

  user: Bidder | null = null;

  private intersectionObserver?: IntersectionObserver;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    if (!id || Number.isNaN(id)) {
      this.error = 'Invalid bidder ID.';
      this.loading = false;
      return;
    }

    this.biddersSvc.getById(id).subscribe({
      next: (u) => {
        this.user = u;
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'Failed to load bidder details.';
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
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    setTimeout(() => {
      const elements = document.querySelectorAll('.reveal-on-scroll');
      elements.forEach((el) => this.intersectionObserver?.observe(el));
    }, 100);
  }

  back(): void {
    this.router.navigate(['/admin/bidders']);
  }

  // ---- UI computed helpers ----

  get initials(): string {
    if (!this.user) return 'B';
    const f = (this.user.firstName?.[0] ?? '').toUpperCase();
    const l = (this.user.lastName?.[0] ?? this.user.userName?.[0] ?? '').toUpperCase();
    return (f + l) || 'B';
  }

  get fullName(): string {
    if (!this.user) return '';
    const full = `${this.user.firstName ?? ''} ${this.user.lastName ?? ''}`.trim();
    return full || this.user.userName || 'Unknown Bidder';
  }

  get activityStatus(): 'online' | 'recent' | 'away' | 'inactive' {
    if (!this.user?.loginDate) return 'inactive';

    const lastLogin = new Date(this.user.loginDate);
    if (isNaN(lastLogin.getTime())) return 'inactive';

    const diffMinutes = Math.floor((Date.now() - lastLogin.getTime()) / 60000);

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

  // If in future you add roles to Bidder, this will auto-support it without template changes.
  get roleIds(): number[] {
    const roleId = (this.user as any)?.roleId;
    if (Array.isArray(roleId)) return roleId.map((x: any) => Number(x)).filter((n) => Number.isFinite(n));
    if (typeof roleId === 'number' && Number.isFinite(roleId)) return [roleId];
    return [];
  }

  get hasRoles(): boolean {
    return this.roleIds.length > 0;
  }

  formatDate(date: string | null | undefined): string {
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

  formatLastLogin(date: string | null | undefined): string {
    if (!date) return 'Never';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Never';

    const minutes = Math.floor((Date.now() - d.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return this.formatDate(date);
  }

  getAccountAge(): string {
    const created = this.user?.createdDate;
    if (!created) return '—';
    const c = new Date(created);
    if (isNaN(c.getTime())) return '—';

    const days = Math.floor((Date.now() - c.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} months`;
    const years = Math.floor(months / 12);
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }

  getAccountAgeDetailed(): string {
    const created = this.user?.createdDate;
    if (!created) return 'Unknown';

    const c = new Date(created);
    if (isNaN(c.getTime())) return 'Unknown';

    const days = Math.floor((Date.now() - c.getTime()) / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week(s) ago`;
    if (days < 365) return `${Math.floor(days / 30)} month(s) ago`;

    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);
    return remainingMonths > 0 ? `${years}y ${remainingMonths}m ago` : `${years} year(s) ago`;
  }

  // ---- Actions (wire to your real endpoints) ----

  editBidder(): void {
    if (!this.user) return;
    this.router.navigate(['/admin/bidders'], { queryParams: { edit: this.user.userId } });
  }

  deleteBidder(): void {
    if (!this.user) return;
    if (confirm(`Are you sure you want to delete ${this.fullName}?`)) {
      console.log('Delete bidder:', this.user.userId);
      // TODO: call delete endpoint
    }
  }

  toggleBidderStatus(): void {
    if (!this.user) return;
    console.log('Toggle status for:', this.user.userId);
    // TODO: call activate/deactivate endpoint
  }

  resendVerification(): void {
    if (!this.user) return;
    console.log('Resend verification to:', this.user.email);
    // TODO: call resend email verification endpoint
  }

  resetPassword(): void {
    if (!this.user) return;
    console.log('Reset password for:', this.user.userId);
    // TODO: call reset password endpoint
  }

  trackByRole(_i: number, rid: number): number {
    return rid;
  }
}
