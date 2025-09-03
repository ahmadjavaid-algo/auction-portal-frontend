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
import { Role } from '../../../../models/role.model';

// When you create RolesForm next, keep this same API as UsersForm.
import { RolesForm } from '../roles-form/roles-form';
type RoleFormResult =
  | { action: 'create'; payload: Role }
  | { action: 'edit';   payload: Role };

type DisplayRole = {
  roleId: number;
  roleName: string;
  roleCode: string;
  description?: string | null;
  active?: boolean | null; // GetList is trimmed; may be null
};

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
    MatTooltipModule
  ],
  templateUrl: './roles-list.html',
  styleUrls: ['./roles-list.scss']
})
export class RolesList {
  private rolesSvc = inject(RolesService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  // order mirrors the users page, but columns adapted for Roles
  displayedColumns: string[] = ['role', 'code', 'description', 'status', 'actions'];
  roles = new MatTableDataSource<DisplayRole>([]);
  totalItems = 0;

  pageSize = 10;
  pageIndex = 0;
  searchTerm = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.loadRoles();
    this.roles.filterPredicate = (d, f) =>
      (d.roleName + ' ' + d.roleCode + ' ' + (d.description || '')).toLowerCase().includes(f);
  }

  ngAfterViewInit(): void {
    this.roles.paginator = this.paginator;
  }

  private loadRoles(): void {
    this.rolesSvc.getList().subscribe({
      next: (list: Role[]) => {
        const mapped: DisplayRole[] = list.map(r => ({
          roleId: r.roleId,
          roleName: r.roleName,
          roleCode: r.roleCode,
          description: r.description ?? null,
          active: r.active ?? null // may be null (GetList returns trimmed cols)
        }));
        this.roles.data = mapped;
        this.totalItems = mapped.length;
        if (this.paginator) this.roles.paginator = this.paginator;
        this.applyPagingTotals();
      },
      error: (e) => console.error('Failed to load roles', e)
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

  /** Range helpers for the right-bottom label (template look) */
  get rangeStart(): number {
    if (!this.totalItems) return 0;
    return this.pageIndex * this.pageSize + 1;
  }
  get rangeEnd(): number {
    return Math.min(this.totalItems, (this.pageIndex + 1) * this.pageSize);
  }

  // ----- Create -----
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

  // ----- Edit -----
  editRole(row: DisplayRole): void {
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

  /** Toggle Active/Inactive with backend call (uses simple service signature) */
  toggleActive(r: DisplayRole): void {
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

  // Navigate to details page
  viewRole(roleId: number): void {
    this.router.navigate(['/admin/roles', roleId]);
  }
}
