import { Component, ViewChild, inject } from '@angular/core';
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
import { Role,RoleStats } from '../../../../models/role.model';
import { RolesForm } from '../roles-form/roles-form';
import { RolesClaims } from '../roles-claims/roles-claims';

type RoleFormResult =
  | { action: 'create'; payload: Role }
  | { action: 'edit';   payload: Role };

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
export class RolesList {
  private rolesSvc = inject(RolesService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  displayedColumns: string[] = ['expand', 'role', 'code', 'description', 'status', 'actions'];

  // Use the canonical model directly
  roles = new MatTableDataSource<Role>([]);
  totalItems = 0;

  pageSize = 10;
  pageIndex = 0;
  searchTerm = '';

  expandedRoleId: number | null = null;
  stats: RoleStats = { totalRoles: 0, activeRoles: 0, inactiveRoles: 0 };

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.loadRoles();
    this.loadStats();
    this.roles.filterPredicate = (d, f) =>
      (d.roleName + ' ' + d.roleCode + ' ' + (d.description || '')).toLowerCase().includes(f);
  }

  ngAfterViewInit(): void {
    this.roles.paginator = this.paginator;
  }

  private loadRoles(): void {
    this.rolesSvc.getList().subscribe({
      next: (list: Role[]) => {
        this.roles.data = list;            // no mapping
        this.totalItems = list.length;
        if (this.paginator) this.roles.paginator = this.paginator;
        this.applyPagingTotals();
      },
      error: (e) => console.error('Failed to load roles', e)
    });
  }
  private loadStats(): void {
    this.rolesSvc.getStats().subscribe({
      next: (s) => (this.stats = s),
      error: () => this.snack.open('Failed to load role stats.', 'Dismiss', { duration: 3000 })
    });
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
    this.totalItems = this.roles.filter ? this.roles.filteredData.length : this.roles.data.length;
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
        next: (newId) => {
          this.snack.open(`Role created (ID ${newId}).`, 'OK', { duration: 2500 });
          this.loadRoles();
        },
        error: () => this.snack.open('Failed to create role.', 'Dismiss', { duration: 3000 })
      });
    });
  }

  editRole(row: Role): void {
    this.rolesSvc.getById(row.roleId).subscribe({
      next: (full) => {
        const ref = this.dialog.open<RolesForm, { mode: 'edit'; initialData: Role }, RoleFormResult>(RolesForm, {
          width: '820px',
          data: { mode: 'edit', initialData: full }
        });
        ref.afterClosed().subscribe(res => {
          if (!res || res.action !== 'edit') return;
          this.rolesSvc.update(res.payload).subscribe({
            next: (ok) => {
              this.snack.open(ok ? 'Role updated.' : 'Update failed.', 'OK', { duration: 2500 });
              if (ok) this.loadRoles();
            },
            error: () => this.snack.open('Failed to update role.', 'Dismiss', { duration: 3000 })
          });
        });
      },
      error: () => this.snack.open('Failed to load role for edit.', 'Dismiss', { duration: 3000 })
    });
  }

  toggleActive(r: Role): void {
    const newState = !r.active;
    this.rolesSvc.activate(r.roleId, newState).subscribe({
      next: (ok) => {
        if (ok) {
          r.active = newState;
          this.snack.open(`Role ${newState ? 'activated' : 'deactivated'}.`, 'OK', { duration: 2000 });
        } else {
          this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 });
        }
      },
      error: () => this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 })
    });
  }

  viewRole(roleId: number): void {
    this.router.navigate(['/admin/roles', roleId]);
  }
}
