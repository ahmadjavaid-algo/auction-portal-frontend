import { Component, inject, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UsersService } from '../../../../services/users.service';
import { User } from '../../../../models/user.model';

@Component({
  selector: 'app-users-details',
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
  templateUrl: './users-details.html',
  styleUrls: ['./users-details.scss']
})
export class UsersDetails implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usersSvc = inject(UsersService);

  loading = true;
  error: string | null = null;
  user: User | null = null;

  private intersectionObserver?: IntersectionObserver;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid user ID.';
      this.loading = false;
      return;
    }

    this.usersSvc.getById(id).subscribe({
      next: (u) => {
        this.user = u;
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'Failed to load user details.';
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
    this.router.navigate(['/admin/users']);
  }

  get initials(): string {
    if (!this.user) return 'U';
    const first = (this.user.firstName?.[0] ?? '').toUpperCase();
    const last = (this.user.lastName?.[0] ?? this.user.userName?.[0] ?? '').toUpperCase();
    return first && last ? first + last : first || last || 'U';
  }

  get fullName(): string {
    if (!this.user) return '';
    const first = (this.user.firstName ?? '').trim();
    const last = (this.user.lastName ?? '').trim();
    const full = [first, last].filter(Boolean).join(' ');
    return full || this.user.userName || 'Unknown User';
  }

  get roleIds(): number[] {
    const v: any = this.user?.roleId;
    if (Array.isArray(v)) {
      return v
        .map(n => Number(n))
        .filter(n => Number.isFinite(n));
    }
    if (typeof v === 'number' && Number.isFinite(v)) return [v];
    return [];
  }

  get hasRoles(): boolean {
    return this.roleIds.length > 0;
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

  editUser(): void {
    if (this.user) {
      this.router.navigate(['/admin/users'], {
        queryParams: { edit: this.user.userId }
      });
    }
  }

  trackByRole(_i: number, rid: number): number {
    return rid;
  }
}