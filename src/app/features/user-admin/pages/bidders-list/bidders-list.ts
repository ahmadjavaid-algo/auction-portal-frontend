import {
  Component,
  ViewChild,
  inject,
  OnInit,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import { BiddersService } from '../../../../services/bidders.service';
import { Bidder, BidderStats } from '../../../../models/bidder.model';
import { BiddersForm, BidderFormResult } from '../bidders-form/bidders-form';
import { AuthService } from '../../../../services/auth';

@Component({
  selector: 'app-bidders-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './bidders-list.html',
  styleUrls: ['./bidders-list.scss']
})
export class BiddersList implements OnInit, AfterViewInit, OnDestroy {
  private biddersSvc = inject(BiddersService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);

  // Keep structure 1:1 with UsersList
  displayedColumns: string[] = ['user', 'email', 'verified', 'lastLogin', 'status', 'actions'];
  users = new MatTableDataSource<Bidder>([]);
  totalItems = 0;

  pageSize = 10;
  pageIndex = 0;
  searchTerm = '';
  stats: BidderStats = { totalUsers: 0, activeUsers: 0, inactiveUsers: 0 };

  // Animated stats values (same behavior)
  animatedStats = {
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    onlineUsers: 1
  };

  private intersectionObserver?: IntersectionObserver;
  private animationFrames: number[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.loadUsers();
    this.loadStats();

    this.users.filterPredicate = (u, f) => {
      const haystack = [
        this.getFullName(u),
        u.email ?? '',
        u.userName ?? '',
        // keep in filter if bidder has phoneNumber, harmless if undefined
        (u as any).phoneNumber ?? ''
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(f);
    };
  }

  ngAfterViewInit(): void {
    this.users.paginator = this.paginator;
    this.initScrollReveal();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    this.animationFrames.forEach(id => cancelAnimationFrame(id));
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

    // Typed NodeList => no TS7006
    setTimeout(() => {
      const elements = document.querySelectorAll<HTMLElement>('.reveal-on-scroll');
      elements.forEach((el: HTMLElement) => {
        this.intersectionObserver?.observe(el);
      });
    }, 100);
  }

  private loadUsers(): void {
    this.biddersSvc.getList().subscribe({
      next: (list: Bidder[]) => {
        this.users.data = list ?? [];
        this.totalItems = this.users.data.length;
        if (this.paginator) this.users.paginator = this.paginator;
        this.applyPagingTotals();
      },
      error: e => {
        console.error('Failed to load bidders', e);
        this.snack.open('Failed to load bidders.', 'Dismiss', { duration: 3000 });
      }
    });
  }

  private loadStats(): void {
    this.biddersSvc.getStats().subscribe({
      next: s => {
        this.stats = s;
        this.animateStats();
      },
      error: () =>
        this.snack.open('Failed to load bidder stats.', 'Dismiss', {
          duration: 3000
        })
    });
  }

  private animateStats(): void {
    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      this.animatedStats.totalUsers = Math.floor((this.stats?.totalUsers ?? 0) * eased);
      this.animatedStats.activeUsers = Math.floor((this.stats?.activeUsers ?? 0) * eased);
      this.animatedStats.inactiveUsers = Math.floor((this.stats?.inactiveUsers ?? 0) * eased);

      if (progress < 1) {
        const frameId = requestAnimationFrame(animate);
        this.animationFrames.push(frameId);
      }
    };

    const frameId = requestAnimationFrame(animate);
    this.animationFrames.push(frameId);
  }

  getFullName(u: Bidder): string {
    const f = (u.firstName ?? '').trim();
    const l = (u.lastName ?? '').trim();
    const full = [f, l].filter(Boolean).join(' ');
    return full || u.userName || '';
  }

  getUserInitials(u: Bidder): string {
    const f = (u.firstName ?? '').trim();
    const l = (u.lastName ?? '').trim();

    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    if (f) return f.slice(0, 2).toUpperCase();
    if (u.userName) return u.userName.slice(0, 2).toUpperCase();
    return 'B';
  }

  getLastLogin(u: Bidder): Date | null {
    return u.loginDate ? new Date(u.loginDate) : null;
  }

  formatLastLogin(date: Date | null): string {
    if (!date) return '—';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  }

  onSearch(): void {
    this.users.filter = this.searchTerm.trim().toLowerCase();
    this.totalItems = this.users.filteredData.length;
    if (this.paginator) {
      this.paginator.firstPage();
      this.pageIndex = 0;
    }
  }

  onPageChange(e: PageEvent): void {
    this.pageSize = e.pageSize;
    this.pageIndex = e.pageIndex;
    this.applyPagingTotals();
  }

  private applyPagingTotals(): void {
    this.totalItems = this.users.filter
      ? this.users.filteredData.length
      : this.users.data.length;
  }

  get rangeStart(): number {
    if (!this.totalItems) return 0;
    return this.pageIndex * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.totalItems, (this.pageIndex + 1) * this.pageSize);
  }

  openCreateUser(): void {
    const ref = this.dialog.open<
      BiddersForm,
      { mode: 'create' },
      BidderFormResult
    >(BiddersForm, {
      width: '820px',
      data: { mode: 'create' }
    });

    ref.afterClosed().subscribe(res => {
      if (!res || res.action !== 'create') return;
      this.biddersSvc.addUser(res.payload).subscribe({
        next: newId => {
          this.snack.open(`Bidder created successfully (ID ${newId}).`, 'OK', {
            duration: 2500
          });
          this.loadUsers();
          this.loadStats();
        },
        error: () =>
          this.snack.open('Failed to create bidder.', 'Dismiss', {
            duration: 3000
          })
      });
    });
  }

  editUser(row: Bidder): void {
    this.biddersSvc.getById(row.userId).subscribe({
      next: full => {
        const ref = this.dialog.open<
          BiddersForm,
          { mode: 'edit'; initialData: Bidder },
          BidderFormResult
        >(BiddersForm, {
          width: '820px',
          data: { mode: 'edit', initialData: full }
        });

        ref.afterClosed().subscribe(res => {
          if (!res || res.action !== 'edit') return;
          this.biddersSvc.updateUser(res.payload).subscribe({
            next: ok => {
              this.snack.open(
                ok ? 'Bidder updated successfully.' : 'Update failed.',
                'OK',
                { duration: 2500 }
              );
              if (ok) {
                this.loadUsers();
                this.loadStats();
              }
            },
            error: () =>
              this.snack.open('Failed to update bidder.', 'Dismiss', {
                duration: 3000
              })
          });
        });
      },
      error: () =>
        this.snack.open('Failed to load bidder for edit.', 'Dismiss', {
          duration: 3000
        })
    });
  }

  toggleActive(u: Bidder): void {
    const newState = !(u.active ?? false);
    const payload: Partial<Bidder> = {
      userId: u.userId,
      active: newState,
      modifiedById: this.auth.currentUser?.userId ?? null
    };

    this.biddersSvc.activateUser(payload as Bidder).subscribe({
      next: ok => {
        if (ok) {
          u.active = newState;
          this.snack.open(
            `Bidder ${newState ? 'activated' : 'deactivated'} successfully.`,
            'OK',
            { duration: 2000 }
          );
          this.loadStats();
        } else {
          this.snack.open('Failed to change status.', 'Dismiss', {
            duration: 3000
          });
        }
      },
      error: () =>
        this.snack.open('Failed to change status.', 'Dismiss', {
          duration: 3000
        })
    });
  }

  openChangePassword(_u: Bidder): void {
    this.snack.open('Change password feature coming soon.', 'OK', {
      duration: 2000
    });
  }

  viewUser(userId: number): void {
    this.router.navigate(['/admin/bidders', userId]);
  }
}
