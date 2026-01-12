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

import { AuctionService } from '../../../../services/auctions.service';
import { Auction } from '../../../../models/auction.model';

@Component({
  selector: 'app-auctions-details',
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
  templateUrl: './auctions-details.html',
  styleUrls: ['./auctions-details.scss']
})
export class AuctionsDetails implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private aucSvc = inject(AuctionService);

  loading = true;
  error: string | null = null;
  auction: Auction | null = null;

  private intersectionObserver?: IntersectionObserver;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid auction ID.';
      this.loading = false;
      return;
    }

    this.aucSvc.getById(id).subscribe({
      next: (a) => {
        this.auction = a;
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'Failed to load auction details.';
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
    this.router.navigate(['/admin/auctions']);
  }

  // -----------------------------
  // UI helpers (match users-details)
  // -----------------------------
  get initials(): string {
    const name = (this.auction?.auctionName ?? '').trim();
    if (!name) return 'AU';
    const parts = name.split(/\s+/).filter(Boolean);
    const a = (parts[0]?.[0] ?? 'A').toUpperCase();
    const b = (parts[1]?.[0] ?? parts[0]?.[1] ?? 'U').toUpperCase();
    return `${a}${b}`;
  }

  get fullName(): string {
    const n = (this.auction?.auctionName ?? '').trim();
    return n || 'Untitled Auction';
  }

  get hasSchedule(): boolean {
    const s = this.auction?.startDateTime;
    const e = this.auction?.endDateTime;
    return !!(s && e && !isNaN(new Date(s).getTime()) && !isNaN(new Date(e).getTime()));
  }

  get startDate(): Date | null {
    const s = this.auction?.startDateTime;
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  get endDate(): Date | null {
    const e = this.auction?.endDateTime;
    if (!e) return null;
    const d = new Date(e);
    return isNaN(d.getTime()) ? null : d;
  }

  get scheduleStatus(): 'live' | 'upcoming' | 'ended' | 'unscheduled' {
    if (!this.hasSchedule || !this.startDate || !this.endDate) return 'unscheduled';

    const now = Date.now();
    const start = this.startDate.getTime();
    const end = this.endDate.getTime();

    if (now >= start && now <= end) return 'live';
    if (now < start) return 'upcoming';
    return 'ended';
  }

  get scheduleStatusLabel(): string {
    switch (this.scheduleStatus) {
      case 'live': return 'Live Now';
      case 'upcoming': return 'Upcoming';
      case 'ended': return 'Ended';
      default: return 'Unscheduled';
    }
  }

  // Mapping users "activityStatus" to auction schedule state
  get activityStatus(): 'online' | 'recent' | 'away' | 'inactive' {
    switch (this.scheduleStatus) {
      case 'live': return 'online';
      case 'upcoming': return 'recent';
      case 'ended': return 'away';
      default: return 'inactive';
    }
  }

  get activityStatusLabel(): string {
    switch (this.activityStatus) {
      case 'online': return 'Live Now';
      case 'recent': return 'Starts Soon';
      case 'away': return 'Ended';
      default: return 'No Schedule';
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

  formatRelative(date: any): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';

    const now = new Date();
    const diff = d.getTime() - now.getTime(); // future positive
    const abs = Math.abs(diff);
    const minutes = Math.floor(abs / 60000);
    const isFuture = diff > 0;

    if (minutes < 1) return isFuture ? 'Now' : 'Just now';
    if (minutes < 60) return isFuture ? `In ${minutes}m` : `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return isFuture ? `In ${hours}h` : `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return isFuture ? `In ${days}d` : `${days}d ago`;

    return this.formatDate(date);
  }

  getDurationLabel(): string {
    if (!this.startDate || !this.endDate) return '—';
    const diffMs = this.endDate.getTime() - this.startDate.getTime();
    if (!Number.isFinite(diffMs) || diffMs <= 0) return '—';

    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr`;

    const days = Math.floor(hours / 24);
    const remH = hours % 24;
    return remH > 0 ? `${days}d ${remH}h` : `${days} days`;
  }

  // Match "account age" style, but for auction creation age
  getAuctionAge(): string {
    const created = this.auction?.createdDate;
    if (!created) return '—';
    const c = new Date(created);
    if (isNaN(c.getTime())) return '—';

    const now = new Date();
    const diff = now.getTime() - c.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} months`;
    const years = Math.floor(months / 12);
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }

  getAuctionAgeDetailed(): string {
    const created = this.auction?.createdDate;
    if (!created) return 'Unknown';
    const c = new Date(created);
    if (isNaN(c.getTime())) return 'Unknown';

    const now = new Date();
    const diff = now.getTime() - c.getTime();
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

  // -----------------------------
  // Actions
  // -----------------------------
  editAuction(): void {
    if (!this.auction) return;
    this.router.navigate(['/admin/auctions'], { queryParams: { edit: this.auction.auctionId } });
  }

  deleteAuction(): void {
    if (!this.auction) return;
    if (confirm(`Are you sure you want to delete "${this.fullName}"?`)) {
      console.log('Delete auction:', this.auction.auctionId);
    }
  }

  toggleAuctionStatus(): void {
    if (!this.auction) return;
    console.log('Toggle auction active status:', this.auction.auctionId);
  }

  rescheduleAuction(): void {
    if (!this.auction) return;
    console.log('Reschedule auction:', this.auction.auctionId);
  }
}
