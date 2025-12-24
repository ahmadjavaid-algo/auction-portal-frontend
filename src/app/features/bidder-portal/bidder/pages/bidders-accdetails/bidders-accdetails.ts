// src/app/features/bidder-portal/bidder/pages/bidders-accdetails/bidders-accdetails.ts
import { AfterViewInit, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { BiddersService } from '../../../../../services/bidders.service';
import { Bidder } from '../../../../../models/bidder.model';
import { BidderAuthService } from '../../../../../services/bidderauth';

type ProfileSectionId = 'overview' | 'identity' | 'account' | 'security' | 'preferences';

@Component({
  selector: 'app-bidders-accdetails',
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
  templateUrl: './bidders-accdetails.html',
  styleUrl: './bidders-accdetails.scss'
})
export class BiddersAccdetails implements OnInit, AfterViewInit, OnDestroy {
  private router = inject(Router);
  private biddersSvc = inject(BiddersService);
  private auth = inject(BidderAuthService);

  loading = true;
  error: string | null = null;
  user: Bidder | null = null;

  // Same “dashboard hero” vibe as auctions-list
  heroUrl =
    'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=1920&auto=format&fit=crop&q=80';

  // Scroll-spy (left rail)
  activeSection: ProfileSectionId = 'overview';

  // observers
  private revealObs?: IntersectionObserver;
  private sectionObs?: IntersectionObserver;

  readonly sections: Array<{ id: ProfileSectionId; label: string; icon: string; hint: string }> = [
    { id: 'overview', label: 'Overview', icon: 'space_dashboard', hint: 'Health & readiness' },
    { id: 'identity', label: 'Identity', icon: 'person', hint: 'Personal details' },
    { id: 'account', label: 'Account', icon: 'verified_user', hint: 'Trust & metadata' },
    { id: 'security', label: 'Security', icon: 'security', hint: 'Protection controls' },
    { id: 'preferences', label: 'Preferences', icon: 'tune', hint: 'Comfort & defaults' }
  ];

  ngOnInit(): void {
    if (!this.auth.isAuthenticated || !this.auth.currentUser?.userId) {
      this.router.navigate(['/bidder/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    const id = this.auth.currentUser.userId;
    this.loadUser(id);
  }

  ngAfterViewInit(): void {
    // Reveal animations for panels/rows
    this.revealObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) (e.target as HTMLElement).classList.add('is-visible');
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' }
    );

    // Section scroll-spy
    this.sectionObs = new IntersectionObserver(
      (entries) => {
        // pick the most visible intersecting section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];

        if (!visible?.target) return;
        const id = (visible.target as HTMLElement).id as ProfileSectionId;
        if (id) this.activeSection = id;
      },
      { threshold: [0.18, 0.28, 0.38, 0.5], rootMargin: '-20% 0px -55% 0px' }
    );

    // Attach observers (delay one tick so the DOM is ready)
    setTimeout(() => {
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => this.revealObs?.observe(el));
      document.querySelectorAll<HTMLElement>('section[data-section="profile"]').forEach((sec) => this.sectionObs?.observe(sec));
    });
  }

  ngOnDestroy(): void {
    this.revealObs?.disconnect();
    this.sectionObs?.disconnect();
  }

  private loadUser(id: number): void {
    this.loading = true;
    this.error = null;

    this.biddersSvc.getById(id).subscribe({
      next: (u) => {
        this.user = u;
        this.loading = false;

        // Nice touch: if your auctions-list hero uses first image, you can do similar later.
        // For now keep stable and calm.
      },
      error: (e) => {
        this.error = e?.error?.message || 'Failed to load account details.';
        this.loading = false;
      }
    });
  }

  refresh(): void {
    const id = this.auth.currentUser?.userId;
    if (!id) return;
    this.loadUser(id);
  }

  back(): void {
    this.router.navigate(['/bidder/dashboard']);
  }

  changePassword(): void {
    this.router.navigate(['/bidder/change-password']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/bidder/login']);
  }

  scrollTo(id: ProfileSectionId): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ====== Derived UI text ======
  get initials(): string {
    if (!this.user) return '';
    const first = this.user.firstName?.[0] ?? '';
    const last = this.user.lastName?.[0] ?? this.user.userName?.[0] ?? '';
    return (first + last).toUpperCase();
  }

  get displayName(): string {
    if (!this.user) return '—';
    const fn = (this.user.firstName || '').trim();
    const ln = (this.user.lastName || '').trim();
    const full = `${fn} ${ln}`.trim();
    return full || this.user.userName || '—';
  }

  get statusText(): string {
    return this.user?.active ? 'Active' : 'Inactive';
  }

  get verificationText(): string {
    return this.user?.emailConfirmed ? 'Verified' : 'Unverified';
  }

  // Simple “readiness” heuristic (pure UI)
  get readinessScore(): number {
    const u = this.user;
    if (!u) return 0;
    let score = 0;
    if (u.email) score += 20;
    if (u.phoneNumber) score += 15;
    if (u.address1) score += 15;
    if (u.postalCode) score += 10;
    if (u.identificationNumber) score += 20;
    if (u.emailConfirmed) score += 20;
    return Math.min(100, score);
  }

  get readinessLabel(): string {
    const s = this.readinessScore;
    if (s >= 85) return 'Ready';
    if (s >= 65) return 'Nearly Ready';
    if (s >= 40) return 'In Progress';
    return 'Incomplete';
  }
}
