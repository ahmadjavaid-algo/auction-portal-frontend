import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatTable, MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { InspectionTypesService } from '../../../../services/inspectiontypes.service';
import { InspectionType } from '../../../../models/inspectiontype.model';
import { AuthService } from '../../../../services/auth';

import { InspectionForm, InspectionFormResult } from '../inspection-form/inspection-form';
import { InspectioncheckpointsList } from '../inspectioncheckpoints-list/inspectioncheckpoints-list';

@Component({
  selector: 'app-inspection-list',
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
    MatProgressSpinnerModule,
    MatTooltipModule,
    InspectioncheckpointsList
  ],
  templateUrl: './inspection-list.html',
  styleUrls: ['./inspection-list.scss']
})
export class InspectionList {
  private inspSvc = inject(InspectionTypesService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = ['expand', 'name', 'weight', 'status', 'actions'];
  detailRow: string[] = ['expandedDetail'];

  inspectionTypes = new MatTableDataSource<InspectionType>([]);
  totalItems = 0;

  pageSize = 10;
  pageIndex = 0;
  searchTerm = '';

  // stats: total, active, inactive, aggregate weight
  stats = { total: 0, active: 0, inactive: 0, totalWeight: 0 };
  loading = false;

  // expanded rows for checkpoints
  expanded = new Set<number>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatTable) table!: MatTable<InspectionType>;

  ngOnInit(): void {
    this.loadInspectionTypes();
    this.inspectionTypes.filterPredicate = (t: InspectionType, filter: string) => {
      const haystack = [
        t.inspectionTypeName ?? '',
        String(t.inspectionTypeId ?? ''),
        String(t.weightage ?? '')
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(filter);
    };
  }

  ngAfterViewInit(): void {
    this.inspectionTypes.paginator = this.paginator;
  }

  private loadInspectionTypes(): void {
    this.loading = true;
    this.inspSvc.getList().subscribe({
      next: (list: InspectionType[]) => {
        this.inspectionTypes.data = list ?? [];
        if (this.paginator) this.inspectionTypes.paginator = this.paginator;
        this.applyPagingTotals();
        this.computeStats();
      },
      error: (e) => {
        console.error('Failed to load inspection types', e);
        this.snack.open('Failed to load inspection types.', 'Dismiss', { duration: 3000 });
      },
      complete: () => (this.loading = false)
    });
  }

  private computeStats(): void {
    const all = this.inspectionTypes.data;
    const active = all.filter(x => x.active === true).length;
    const inactive = all.length - active;
    const totalWeight = all.reduce((sum, t) => sum + (t.weightage || 0), 0);

    this.stats = { total: all.length, active, inactive, totalWeight };
  }

  // expand helpers
  toggleExpand(id: number): void {
    if (this.expanded.has(id)) {
      this.expanded.delete(id);
    } else {
      this.expanded.add(id);
    }
    queueMicrotask(() => this.table?.renderRows());
  }

  isExpanded = (id: number) => this.expanded.has(id);
  isDetailRow = (_index: number, row: InspectionType) =>
    this.isExpanded(row.inspectionTypeId);

  // search + paging
  onSearch(): void {
    this.inspectionTypes.filter = this.searchTerm.trim().toLowerCase();
    this.totalItems = this.inspectionTypes.filteredData.length;
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
    this.totalItems = this.inspectionTypes.filter
      ? this.inspectionTypes.filteredData.length
      : this.inspectionTypes.data.length;
  }

  get rangeStart(): number {
    return !this.totalItems ? 0 : this.pageIndex * this.pageSize + 1;
  }
  get rangeEnd(): number {
    return Math.min(this.totalItems, (this.pageIndex + 1) * this.pageSize);
  }

  // CRUD actions
  openCreateInspectionType(): void {
    const ref = this.dialog.open<
      InspectionForm,
      { mode: 'create' },
      InspectionFormResult
    >(InspectionForm, {
      width: '600px',
      data: { mode: 'create' }
    });

    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      if (res.action === 'create') {
        this.inspSvc.add(res.payload).subscribe({
          next: (id) => {
            this.snack.open(`Inspection type created (ID ${id}).`, 'OK', {
              duration: 2500
            });
            this.loadInspectionTypes();
          },
          error: (e) =>
            this.snack.open(
              e?.error?.message || 'Failed to create inspection type.',
              'Dismiss',
              { duration: 3000 }
            )
        });
      }
    });
  }

  editInspectionType(row: InspectionType): void {
    const ref = this.dialog.open<
      InspectionForm,
      { mode: 'edit'; initialData: InspectionType },
      InspectionFormResult
    >(InspectionForm, {
      width: '600px',
      data: { mode: 'edit', initialData: row }
    });

    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      if (res.action === 'edit') {
        this.inspSvc.update(res.payload).subscribe({
          next: (ok) => {
            if (ok) {
              this.snack.open('Inspection type updated.', 'OK', {
                duration: 2000
              });
              this.loadInspectionTypes();
            } else {
              this.snack.open(
                'Failed to update inspection type.',
                'Dismiss',
                { duration: 3000 }
              );
            }
          },
          error: (e) =>
            this.snack.open(
              e?.error?.message || 'Failed to update inspection type.',
              'Dismiss',
              { duration: 3000 }
            )
        });
      }
    });
  }

  toggleActive(t: InspectionType): void {
    const newState = !(t.active ?? false);
    const payload = {
      InspectionTypeId: t.inspectionTypeId,
      Active: newState,
      ModifiedById: this.auth.currentUser?.userId ?? null
    };

    this.inspSvc.activate(payload).subscribe({
      next: (ok) => {
        if (ok) {
          t.active = newState;
          this.snack.open(
            `Inspection type ${newState ? 'activated' : 'deactivated'}.`,
            'OK',
            { duration: 2000 }
          );
          this.computeStats();
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

  viewInspectionType(inspectionTypeId: number): void {
    this.router.navigate(['/admin/inspection', inspectionTypeId]);
  }
}
