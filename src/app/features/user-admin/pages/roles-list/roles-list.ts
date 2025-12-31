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

import { RolesService } from '../../../../services/roles.service';
import { Role, RoleStats } from '../../../../models/role.model';
import { RolesForm } from '../roles-form/roles-form';
import { RolesClaims } from '../roles-claims/roles-claims';
import { AuthService } from '../../../../services/auth';

type RoleFormResult =
  | { action: 'create'; payload: Role }
  | { action: 'edit'; payload: Role };

@Component({
  selector: 'app-roles-list',
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
    MatTooltipModule,
    RolesClaims
  ],
  templateUrl: './roles-list.html',
  styleUrls: ['./roles-list.scss']
})
export class RolesList implements OnInit, AfterViewInit, OnDestroy {
  private rolesSvc = inject(RolesService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);

  displayedColumns: string[] = ['expand', 'role', 'code', 'description', 'permissions', 'status', 'actions'];
  
  roles = new MatTableDataSource<Role>([]);
  totalItems = 0;

  pageSize = 10;
  pageIndex = 0;
  searchTerm = '';

  expandedRoleId: number | null = null;
  stats: RoleStats = { totalRoles: 0, activeRoles: 0, inactiveRoles: 0 };

  // Animated stats values
  animatedStats = {
    totalRoles: 0,
    activeRoles: 0,
    inactiveRoles: 0,
    systemRoles: 4,
    customRoles: 0
  };

  private intersectionObserver?: IntersectionObserver;
  private animationFrames: number[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.loadRoles();
    this.loadStats();
    
    this.roles.filterPredicate = (d, f) =>
      (d.roleName + ' ' + d.roleCode + ' ' + (d.description || '')).toLowerCase().includes(f);
  }

  ngAfterViewInit(): void {
    this.roles.paginator = this.paginator;
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

  private loadRoles(): void {
    this.rolesSvc.getList().subscribe({
      next: (list: Role[]) => {
        this.roles.data = list ?? [];
        this.totalItems = this.roles.data.length;
        if (this.paginator) this.roles.paginator = this.paginator;
        this.applyPagingTotals();
        this.calculateCustomRoles();
      },
      error: e => {
        console.error('Failed to load roles', e);
        this.snack.open('Failed to load roles.', 'Dismiss', { duration: 3000 });
      }
    });
  }

  private loadStats(): void {
    this.rolesSvc.getStats().subscribe({
      next: s => {
        this.stats = s;
        this.animateStats();
      },
      error: () =>
        this.snack.open('Failed to load role stats.', 'Dismiss', {
          duration: 3000
        })
    });
  }

  private calculateCustomRoles(): void {
    this.animatedStats.customRoles = Math.max(0, this.stats.totalRoles - this.animatedStats.systemRoles);
  }

  private animateStats(): void {
    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      this.animatedStats.totalRoles = Math.floor(this.stats.totalRoles * eased);
      this.animatedStats.activeRoles = Math.floor(this.stats.activeRoles * eased);
      this.animatedStats.inactiveRoles = Math.floor(this.stats.inactiveRoles * eased);
      this.calculateCustomRoles();

      if (progress < 1) {
        const frameId = requestAnimationFrame(animate);
        this.animationFrames.push(frameId);
      }
    };

    const frameId = requestAnimationFrame(animate);
    this.animationFrames.push(frameId);
  }

  getRoleInitials(r: Role): string {
    if (!r.roleName) return 'R';
    
    const words = r.roleName.trim().split(/\s+/);
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    
    return r.roleName.slice(0, 2).toUpperCase();
  }

  getPermissionCount(r: Role): string {
    // Since Role doesn't have claims, we'll show this as expandable
    // The actual claims will be loaded when expanded via RolesClaims component
    return 'View';
  }

  onSearch(): void {
    this.roles.filter = this.searchTerm.trim().toLowerCase();
    this.totalItems = this.roles.filteredData.length;
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
    this.totalItems = this.roles.filter
      ? this.roles.filteredData.length
      : this.roles.data.length;
  }

  get rangeStart(): number {
    if (!this.totalItems) return 0;
    return this.pageIndex * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.totalItems, (this.pageIndex + 1) * this.pageSize);
  }

  toggleExpand(roleId: number): void {
    this.expandedRoleId = this.expandedRoleId === roleId ? null : roleId;
  }

  isExpanded(roleId: number): boolean {
    return this.expandedRoleId === roleId;
  }

  openCreateRole(): void {
    const ref = this.dialog.open<RolesForm, { mode: 'create' }, RoleFormResult>(RolesForm, {
      width: '820px',
      data: { mode: 'create' }
    });

    ref.afterClosed().subscribe(res => {
      if (!res || res.action !== 'create') return;
      this.rolesSvc.add(res.payload).subscribe({
        next: newId => {
          this.snack.open(`Role created successfully (ID ${newId}).`, 'OK', {
            duration: 2500
          });
          this.loadRoles();
          this.loadStats();
        },
        error: () =>
          this.snack.open('Failed to create role.', 'Dismiss', {
            duration: 3000
          })
      });
    });
  }

  editRole(row: Role): void {
    this.rolesSvc.getById(row.roleId).subscribe({
      next: full => {
        const ref = this.dialog.open<
          RolesForm,
          { mode: 'edit'; initialData: Role },
          RoleFormResult
        >(RolesForm, {
          width: '820px',
          data: { mode: 'edit', initialData: full }
        });
        ref.afterClosed().subscribe(res => {
          if (!res || res.action !== 'edit') return;
          this.rolesSvc.update(res.payload).subscribe({
            next: ok => {
              this.snack.open(
                ok ? 'Role updated successfully.' : 'Update failed.',
                'OK',
                { duration: 2500 }
              );
              if (ok) {
                this.loadRoles();
                this.loadStats();
              }
            },
            error: () =>
              this.snack.open('Failed to update role.', 'Dismiss', {
                duration: 3000
              })
          });
        });
      },
      error: () =>
        this.snack.open('Failed to load role for edit.', 'Dismiss', {
          duration: 3000
        })
    });
  }

  toggleActive(r: Role): void {
    const newState = !r.active;
    this.rolesSvc.activate(r.roleId, newState).subscribe({
      next: ok => {
        if (ok) {
          r.active = newState;
          this.snack.open(
            `Role ${newState ? 'activated' : 'deactivated'} successfully.`,
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

  viewRole(roleId: number): void {
    this.router.navigate(['/admin/roles', roleId]);
  }

  deleteRole(r: Role): void {
    if (!confirm(`Are you sure you want to delete role "${r.roleName}"?`)) {
      return;
    }
    
    this.snack.open('Delete feature coming soon.', 'OK', {
      duration: 2000
    });
  }

  duplicateRole(r: Role): void {
    this.snack.open(`Duplicating role "${r.roleName}"...`, 'OK', {
      duration: 2000
    });
  }

  exportRoles(): void {
    this.snack.open('Exporting roles...', 'OK', {
      duration: 2000
    });
  }
}