import { Component, ViewChild, inject, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
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

import { UsersService } from '../../../../services/users.service';
import { User, UserStats } from '../../../../models/user.model';
import { UsersForm, UserFormResult } from '../users-form/users-form';
import { AuthService } from '../../../../services/auth';

@Component({
  selector: 'app-users-list',
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
  templateUrl: './users-list.html',
  styleUrls: ['./users-list.scss']
})
export class UsersList implements OnInit, AfterViewInit, OnDestroy {
  private usersSvc = inject(UsersService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);

  displayedColumns: string[] = ['user', 'email', 'phone', 'verified', 'lastLogin', 'status', 'actions'];
  users = new MatTableDataSource<User>([]);
  totalItems = 0;

  pageSize = 10;
  pageIndex = 0;
  searchTerm = '';
  stats: UserStats = { totalUsers: 0, activeUsers: 0, inactiveUsers: 0 };

  // Animated stats values
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
        u.phoneNumber ?? ''
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

  private loadUsers(): void {
    this.usersSvc.getList().subscribe({
      next: (list: User[]) => {
        this.users.data = list ?? [];
        this.totalItems = this.users.data.length;
        if (this.paginator) this.users.paginator = this.paginator;
        this.applyPagingTotals();
      },
      error: e => {
        console.error('Failed to load users', e);
        this.snack.open('Failed to load users.', 'Dismiss', { duration: 3000 });
      }
    });
  }

  private loadStats(): void {
    this.usersSvc.getStats().subscribe({
      next: s => {
        this.stats = s;
        this.animateStats();
      },
      error: () =>
        this.snack.open('Failed to load user stats.', 'Dismiss', {
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
      
      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      this.animatedStats.totalUsers = Math.floor(this.stats.totalUsers * eased);
      this.animatedStats.activeUsers = Math.floor(this.stats.activeUsers * eased);
      this.animatedStats.inactiveUsers = Math.floor(this.stats.inactiveUsers * eased);

      if (progress < 1) {
        const frameId = requestAnimationFrame(animate);
        this.animationFrames.push(frameId);
      }
    };

    const frameId = requestAnimationFrame(animate);
    this.animationFrames.push(frameId);
  }

  getFullName(u: User): string {
    const f = (u.firstName ?? '').trim();
    const l = (u.lastName ?? '').trim();
    const full = [f, l].filter(Boolean).join(' ');
    return full || u.userName || '';
  }

  getUserInitials(u: User): string {
    const f = (u.firstName ?? '').trim();
    const l = (u.lastName ?? '').trim();
    
    if (f && l) {
      return `${f[0]}${l[0]}`.toUpperCase();
    }
    
    if (f) {
      return f.slice(0, 2).toUpperCase();
    }
    
    if (u.userName) {
      return u.userName.slice(0, 2).toUpperCase();
    }
    
    return 'U';
  }

  getLastLogin(u: User): Date | null {
    return u.loginDate ? new Date(u.loginDate) : null;
  }

  getCreatedAt(u: User): Date | null {
    return u.createdDate ? new Date(u.createdDate) : null;
  }

  getRoleLabel(u: User): string {
    return Array.isArray(u.roleId) && u.roleId.length
      ? `${u.roleId.length} role(s)`
      : '—';
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
      UsersForm,
      { mode: 'create' },
      UserFormResult
    >(UsersForm, {
      width: '820px',
      data: { mode: 'create' }
    });

    ref.afterClosed().subscribe(res => {
      if (!res || res.action !== 'create') return;
      this.usersSvc.addUser(res.payload).subscribe({
        next: newId => {
          this.snack.open(`User created successfully (ID ${newId}).`, 'OK', {
            duration: 2500
          });
          this.loadUsers();
          this.loadStats();
        },
        error: () =>
          this.snack.open('Failed to create user.', 'Dismiss', {
            duration: 3000
          })
      });
    });
  }

  editUser(row: User): void {
    this.usersSvc.getById(row.userId).subscribe({
      next: full => {
        const ref = this.dialog.open<
          UsersForm,
          { mode: 'edit'; initialData: User },
          UserFormResult
        >(UsersForm, {
          width: '820px',
          data: { mode: 'edit', initialData: full }
        });
        ref.afterClosed().subscribe(res => {
          if (!res || res.action !== 'edit') return;
          this.usersSvc.updateUser(res.payload).subscribe({
            next: ok => {
              this.snack.open(
                ok ? 'User updated successfully.' : 'Update failed.',
                'OK',
                { duration: 2500 }
              );
              if (ok) {
                this.loadUsers();
                this.loadStats();
              }
            },
            error: () =>
              this.snack.open('Failed to update user.', 'Dismiss', {
                duration: 3000
              })
          });
        });
      },
      error: () =>
        this.snack.open('Failed to load user for edit.', 'Dismiss', {
          duration: 3000
        })
    });
  }

  toggleActive(u: User): void {
    const newState = !(u.active ?? false);
    const payload: Partial<User> = {
      userId: u.userId,
      active: newState,
      modifiedById: this.auth.currentUser?.userId ?? null
    };
    this.usersSvc.activateUser(payload as User).subscribe({
      next: ok => {
        if (ok) {
          u.active = newState;
          this.snack.open(
            `User ${newState ? 'activated' : 'deactivated'} successfully.`,
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

  openChangePassword(_u: User): void {
    this.snack.open('Change password feature coming soon.', 'OK', {
      duration: 2000
    });
  }

  viewUser(userId: number): void {
    this.router.navigate(['/admin/users', userId]);
  }

  deleteUser(u: User): void {
    if (!confirm(`Are you sure you want to delete ${this.getFullName(u)}?`)) {
      return;
    }
    
    this.snack.open('Delete feature coming soon.', 'OK', {
      duration: 2000
    });
  }
}