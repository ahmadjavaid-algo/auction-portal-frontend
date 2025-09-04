import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';

import { RolesService } from '../../../../services/roles.service';
import { RoleClaim, RoleClaimSelection } from '../../../../models/role-claim.model';

@Component({
  selector: 'app-roles-claims',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatCheckboxModule,
    MatFormFieldModule, MatInputModule,
    MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './roles-claims.html',
  styleUrls: ['./roles-claims.scss']
})
export class RolesClaims implements OnChanges {
  @Input({ required: true }) roleId!: number;

  private svc = inject(RolesService);
  private snack = inject(MatSnackBar);

  loading = false;
  saving = false;
  dirty = false;
  filter = '';

  displayedColumns: string[] = ['selected', 'claimCode', 'endpoint', 'description'];
  data = new MatTableDataSource<RoleClaimSelection>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['roleId'] && this.roleId) this.load();
  }

  private load(): void {
    this.loading = true;
    this.dirty = false;

    forkJoin({
      all: this.svc.getRoleClaimsList(),
      byRole: this.svc.getRoleClaimsByRole(this.roleId)
    }).subscribe({
      next: ({ all, byRole }) => {
        const selectedIds = new Set<number>(byRole.map(x => x.claimId));
        const rows: RoleClaimSelection[] = (all as RoleClaim[]).map(c => ({
          ...c,
          selected: selectedIds.has(c.claimId)
        }));
        this.data.data = rows;

        this.data.filterPredicate = (d, f) => {
          const hay = (d.claimCode + ' ' + (d.endpoint || '') + ' ' + (d.description || '')).toLowerCase();
          return hay.includes(f);
        };
        this.applyFilter();

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Failed to load claims.', 'Dismiss', { duration: 3000 });
      }
    });
  }

  applyFilter(): void {
    this.data.filter = this.filter.trim().toLowerCase();
  }

  toggleOne(row: RoleClaimSelection): void {
    row.selected = !row.selected;
    this.dirty = true;
  }

  toggleAll(check: boolean): void {
    this.data.filteredData.forEach(r => (r.selected = check));
    this.dirty = true;
  }

  get selectedCount(): number {
    return this.data.data.filter(x => x.selected).length;
  }

  save(): void {
    const ids = this.data.data.filter(x => x.selected).map(x => x.claimId);
    this.svc.setRoleClaims(this.roleId, ids).subscribe({
      next: ok => {
        if (ok) {
          this.dirty = false;
          this.snack.open('Permissions saved.', 'OK', { duration: 2000 });
        } else {
          this.snack.open('Save failed.', 'Dismiss', { duration: 3000 });
        }
      },
      error: () => this.snack.open('Save failed.', 'Dismiss', { duration: 3000 })
    });
  }

  reset(): void {
    this.load();
  }
}
