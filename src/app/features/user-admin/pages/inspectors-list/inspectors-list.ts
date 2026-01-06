import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
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

import { InspectorsService } from '../../../../services/inspectors.service';
import { Inspector, InspectorStats } from '../../../../models/inspector.model';
import { InspectorsForm, InspectorFormResult } from '../inspectors-form/inspectors-form';
import { AuthService } from '../../../../services/auth';

@Component({
  selector: 'app-inspectors-list',
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
  templateUrl: './inspectors-list.html',
  styleUrls: ['./inspectors-list.scss']
})
export class InspectorsList implements OnInit, AfterViewInit, OnDestroy {
  private inspectorsSvc = inject(InspectorsService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);
  private host = inject(ElementRef<HTMLElement>);

  displayedColumns: string[] = ['user', 'email', 'verified', 'lastLogin', 'status', 'actions'];
  users = new MatTableDataSource<Inspector>([]);
  totalItems = 0;

  pageSize = 10;
  pageIndex = 0;
  searchTerm = '';
  stats: InspectorStats = { totalUsers: 0, activeUsers: 0, inactiveUsers: 0 };

  // Animated stats values (same as UsersList)
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
        u.userName ?? ''
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
setTimeout(() => {
  const elements = this.host.nativeElement.querySelectorAll('.reveal-on-scroll');
  Array.from(elements).forEach((el) => this.intersectionObserver?.observe(el as Element));
}, 100);

  }

  private loadUsers(): void {
    this.inspectorsSvc.getList().subscribe({
      next: (list: Inspector[]) => {
        this.users.data = list ?? [];
        this.totalItems = this.users.data.length;
        if (this.paginator) this.users.paginator = this.paginator;
        this.applyPagingTotals();
      },
      error: (e) => {
        console.error('Failed to load inspectors', e);
        this.snack.open('Failed to load inspectors.', 'Dismiss', { duration: 3000 });
      }
    });
  }

  private loadStats(): void {
    this.inspectorsSvc.getStats().subscribe({
      next: (s) => {
        this.stats = s;
        this.animateStats();
      },
      error: () =>
        this.snack.open('Failed to load inspector stats.', 'Dismiss', { duration: 3000 })
    });
  }

  private animateStats(): void {
    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

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

  getFullName(u: Inspector): string {
    const f = (u.firstName ?? '').trim();
    const l = (u.lastName ?? '').trim();
    const full = [f, l].filter(Boolean).join(' ');
    return full || u.userName || '';
  }

  getUserInitials(u: Inspector): string {
    const f = (u.firstName ?? '').trim();
    const l = (u.lastName ?? '').trim();

    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    if (f) return f.slice(0, 2).toUpperCase();
    if (u.userName) return u.userName.slice(0, 2).toUpperCase();
    return 'I';
  }

  getLastLogin(u: Inspector): Date | null {
    return u.loginDate ? new Date(u.loginDate) : null;
  }

  getCreatedAt(u: Inspector): Date | null {
    return u.createdDate ? new Date(u.createdDate) : null;
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
    const ref = this.dialog.open<InspectorsForm, { mode: 'create' }, InspectorFormResult>(
      InspectorsForm,
      {
        width: '820px',
        data: { mode: 'create' }
      }
    );

    ref.afterClosed().subscribe(res => {
      if (!res || res.action !== 'create') return;

      this.inspectorsSvc.addUser(res.payload).subscribe({
        next: (newId) => {
          this.snack.open(`Inspector created successfully (ID ${newId}).`, 'OK', { duration: 2500 });
          this.loadUsers();
          this.loadStats();
        },
        error: () =>
          this.snack.open('Failed to create inspector.', 'Dismiss', { duration: 3000 })
      });
    });
  }

  editUser(row: Inspector): void {
    this.inspectorsSvc.getById(row.userId).subscribe({
      next: (full) => {
        const ref = this.dialog.open<
          InspectorsForm,
          { mode: 'edit'; initialData: Inspector },
          InspectorFormResult
        >(InspectorsForm, {
          width: '820px',
          data: { mode: 'edit', initialData: full }
        });

        ref.afterClosed().subscribe(res => {
          if (!res || res.action !== 'edit') return;

          this.inspectorsSvc.updateUser(res.payload).subscribe({
            next: (ok) => {
              this.snack.open(ok ? 'Inspector updated successfully.' : 'Update failed.', 'OK', {
                duration: 2500
              });
              if (ok) {
                this.loadUsers();
                this.loadStats();
              }
            },
            error: () =>
              this.snack.open('Failed to update inspector.', 'Dismiss', { duration: 3000 })
          });
        });
      },
      error: () =>
        this.snack.open('Failed to load inspector for edit.', 'Dismiss', { duration: 3000 })
    });
  }

  toggleActive(u: Inspector): void {
    const newState = !(u.active ?? false);

    const payload: Partial<Inspector> = {
      userId: u.userId,
      active: newState,
      modifiedById: this.auth.currentUser?.userId ?? null
    };

    this.inspectorsSvc.activateUser(payload as Inspector).subscribe({
      next: (ok) => {
        if (ok) {
          u.active = newState;
          this.snack.open(
            `Inspector ${newState ? 'activated' : 'deactivated'} successfully.`,
            'OK',
            { duration: 2000 }
          );
          this.loadStats();
        } else {
          this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 });
        }
      },
      error: () => this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 })
    });
  }

  openChangePassword(_u: Inspector): void {
    this.snack.open('Change password feature coming soon.', 'OK', { duration: 2000 });
  }

  viewUser(userId: number): void {
    this.router.navigate(['/admin/inspectors', userId]);
  }
}
