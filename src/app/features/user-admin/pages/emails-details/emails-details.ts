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

import { EmailsService } from '../../../../services/emails.service';
import { Email } from '../../../../models/email.model';

@Component({
  selector: 'app-emails-details',
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
  templateUrl: './emails-details.html',
  styleUrls: ['./emails-details.scss']
})
export class EmailsDetails implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private emailsSvc = inject(EmailsService);

  loading = true;
  error: string | null = null;
  email: Email | null = null;

  private intersectionObserver?: IntersectionObserver;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid email ID.';
      this.loading = false;
      return;
    }

    this.emailsSvc.getById(id).subscribe({
      next: (e) => {
        this.email = e;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load email details.';
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
    this.router.navigate(['/admin/emails']);
  }

  // -----------------------------
  // Derived UI fields (same idea)
  // -----------------------------

  get initials(): string {
    if (!this.email) return 'E';
    const a = (this.email.emailCode?.trim()?.[0] ?? 'E').toUpperCase();
    const b = (this.email.emailSubject?.trim()?.[0] ?? 'M').toUpperCase();
    return `${a}${b}`;
  }

  get fullName(): string {
    // In UsersDetails this is the big name in the hero. Here we use Subject (fallback to Code).
    if (!this.email) return '';
    const subject = (this.email.emailSubject ?? '').trim();
    const code = (this.email.emailCode ?? '').trim();
    return subject || code || 'Unknown Email Template';
  }

  get subtitle(): string {
    // Equivalent to username line — we show template code here.
    if (!this.email) return '';
    return (this.email.emailCode ?? '').trim() || '—';
  }

  get hasBody(): boolean {
    return !!(this.email?.emailBody && this.email.emailBody.trim().length);
  }

  // We don’t have loginDate for templates; treat ModifiedDate as last activity.
  get lastActivityDate(): any {
    return this.email?.modifiedDate ?? this.email?.createdDate ?? null;
  }

  get activityStatus(): 'online' | 'recent' | 'away' | 'inactive' {
    const d = this.lastActivityDate;
    if (!d) return 'inactive';

    const last = new Date(d);
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
      default: return 'Inactive';
    }
  }

  // Users page had roles; for Emails we keep the same API but always hide the roles card.
  get roleIds(): number[] {
    return [];
  }

  get hasRoles(): boolean {
    return false;
  }

  // -----------------------------
  // Format helpers (same)
  // -----------------------------

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
    // same logic, used for “Last Activity”
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
    if (!this.email?.createdDate) return '—';
    const created = new Date(this.email.createdDate);
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
    if (!this.email?.createdDate) return 'Unknown';
    const created = new Date(this.email.createdDate);
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

  // -----------------------------
  // Actions (replicated pattern)
  // -----------------------------

  editEmail(): void {
    if (this.email) {
      this.router.navigate(['/admin/emails'], {
        queryParams: { edit: this.email.emailId }
      });
    }
  }

  deleteEmail(): void {
    if (!this.email) return;
    if (confirm(`Are you sure you want to delete "${this.fullName}"?`)) {
      // Implement delete functionality
      console.log('Delete email template:', this.email.emailId);
    }
  }

  toggleEmailStatus(): void {
    if (!this.email) return;
    // Implement toggle active/inactive
    console.log('Toggle template status for:', this.email.emailId);
  }

  previewEmail(): void {
    if (!this.email) return;
    this.router.navigate(['/admin/email-preview', this.email.emailId]);
  }

  trackByRole(_i: number, rid: number): number {
    return rid;
  }
}
