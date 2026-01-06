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

import { MatTable, MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import { InspectionTypesService } from '../../../../services/inspectiontypes.service';
import { InspectionType } from '../../../../models/inspectiontype.model';
import { AuthService } from '../../../../services/auth';

import { InspectionForm, InspectionFormResult } from '../inspection-form/inspection-form';
import { InspectioncheckpointsList } from '../inspectioncheckpoints-list/inspectioncheckpoints-list';

type InspectionStats = {
  total: number;
  active: number;
  inactive: number;
  totalWeight: number;
};

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
    MatTooltipModule,
    InspectioncheckpointsList
  ],
  templateUrl: './inspection-list.html',
  styleUrls: ['./inspection-list.scss']
})
export class InspectionList implements OnInit, AfterViewInit, OnDestroy {
  private inspSvc = inject(InspectionTypesService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = ['expand', 'type', 'weight', 'status', 'actions'];
  detailRow: string[] = ['expandedDetail'];

  inspectionTypes = new MatTableDataSource<InspectionType>([]);
  totalItems = 0;

  pageSize = 10;
  pageIndex = 0;
  searchTerm = '';

  stats: InspectionStats = { total: 0, active: 0, inactive: 0, totalWeight: 0 };

  // Animated stats values (same feel as UsersList)
  animatedStats: InspectionStats = { total: 0, active: 0, inactive: 0, totalWeight: 0 };

  loading = false;

  expanded = new Set<number>();

  private intersectionObserver?: IntersectionObserver;
  private animationFrames: number[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatTable) table!: MatTable<InspectionType>;

  ngOnInit(): void {
    this.loadInspectionTypes();

    this.inspectionTypes.filterPredicate = (t: InspectionType, filter: string) => {
      const haystack = [
        t.inspectionTypeName ?? '',
        String(t.inspectionTypeId ?? ''),
        String(t.weightage ?? ''),
        t.active === true ? 'active' : 'inactive'
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(filter);
    };
  }

  ngAfterViewInit(): void {
    this.inspectionTypes.paginator = this.paginator;
    this.initScrollReveal();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    this.animationFrames.forEach(id => cancelAnimationFrame(id));
  }

  private initScrollReveal(): void {
    this.intersectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            this.intersectionObserver?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    setTimeout(() => {
      const elements = document.querySelectorAll('.reveal-on-scroll');
      elements.forEach(el => this.intersectionObserver?.observe(el));
    }, 100);
  }

  private loadInspectionTypes(): void {
    this.loading = true;

    this.inspSvc.getList().subscribe({
      next: (list: InspectionType[]) => {
        this.inspectionTypes.data = list ?? [];
        this.totalItems = this.inspectionTypes.data.length;

        if (this.paginator) this.inspectionTypes.paginator = this.paginator;

        this.applyPagingTotals();
        this.computeStats();
        this.animateStats();
      },
      error: e => {
        console.error('Failed to load inspection types', e);
        this.snack.open('Failed to load inspection types.', 'Dismiss', { duration: 3000 });
      },
      complete: () => (this.loading = false)
    });
  }

  private computeStats(): void {
    const all = this.inspectionTypes.data ?? [];
    const active = all.filter(x => x.active === true).length;
    const inactive = all.length - active;
    const totalWeight = all.reduce((sum, t) => sum + (t.weightage || 0), 0);

    this.stats = { total: all.length, active, inactive, totalWeight };
  }

  private animateStats(): void {
    // Cancel any prior animation frames
    this.animationFrames.forEach(id => cancelAnimationFrame(id));
    this.animationFrames = [];

    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      this.animatedStats.total = Math.floor(this.stats.total * eased);
      this.animatedStats.active = Math.floor(this.stats.active * eased);
      this.animatedStats.inactive = Math.floor(this.stats.inactive * eased);
      this.animatedStats.totalWeight = Math.floor(this.stats.totalWeight * eased);

      if (progress < 1) {
        const frameId = requestAnimationFrame(animate);
        this.animationFrames.push(frameId);
      }
    };

    const frameId = requestAnimationFrame(animate);
    this.animationFrames.push(frameId);
  }

  // ---------------------------
  // Helpers (matching UsersList pattern)
  // ---------------------------
  getTypeName(t: InspectionType): string {
    return (t.inspectionTypeName ?? '').trim() || '—';
  }

  getTypeInitials(t: InspectionType): string {
    const name = (t.inspectionTypeName ?? '').trim();
    if (!name) return 'IT';

    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();

    return name.slice(0, 2).toUpperCase();
  }

  formatWeight(w?: number | null): string {
    if (w === null || w === undefined) return '—';
    return `${w}`;
  }

  // ---------------------------
  // Expand / Detail Row
  // ---------------------------
  toggleExpand(id: number): void {
    if (this.expanded.has(id)) this.expanded.delete(id);
    else this.expanded.add(id);

    queueMicrotask(() => this.table?.renderRows());
  }

  isExpanded = (id: number) => this.expanded.has(id);

  isDetailRow = (_index: number, row: InspectionType) =>
    this.isExpanded(row.inspectionTypeId);

  // ---------------------------
  // Search + paging (same as UsersList)
  // ---------------------------
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
    if (!this.totalItems) return 0;
    return this.pageIndex * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.totalItems, (this.pageIndex + 1) * this.pageSize);
  }

  // ---------------------------
  // Actions
  // ---------------------------
  openCreateInspectionType(): void {
    const ref = this.dialog.open<
      InspectionForm,
      { mode: 'create' },
      InspectionFormResult
    >(InspectionForm, {
      width: '820px', // match UsersList dialog scale
      data: { mode: 'create' }
    });

    ref.afterClosed().subscribe(res => {
      if (!res || res.action !== 'create') return;

      this.inspSvc.add(res.payload).subscribe({
        next: id => {
          this.snack.open(`Inspection type created successfully (ID ${id}).`, 'OK', {
            duration: 2500
          });
          this.loadInspectionTypes();
        },
        error: e =>
          this.snack.open(e?.error?.message || 'Failed to create inspection type.', 'Dismiss', {
            duration: 3000
          })
      });
    });
  }

  editInspectionType(row: InspectionType): void {
    const ref = this.dialog.open<
      InspectionForm,
      { mode: 'edit'; initialData: InspectionType },
      InspectionFormResult
    >(InspectionForm, {
      width: '820px', // match UsersList dialog scale
      data: { mode: 'edit', initialData: row }
    });

    ref.afterClosed().subscribe(res => {
      if (!res || res.action !== 'edit') return;

      this.inspSvc.update(res.payload).subscribe({
        next: ok => {
          this.snack.open(ok ? 'Inspection type updated successfully.' : 'Update failed.', 'OK', {
            duration: 2500
          });
          if (ok) this.loadInspectionTypes();
        },
        error: e =>
          this.snack.open(e?.error?.message || 'Failed to update inspection type.', 'Dismiss', {
            duration: 3000
          })
      });
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
      next: ok => {
        if (ok) {
          t.active = newState;
          this.snack.open(
            `Inspection type ${newState ? 'activated' : 'deactivated'} successfully.`,
            'OK',
            { duration: 2000 }
          );
          this.computeStats();
          this.animateStats();
        } else {
          this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 });
        }
      },
      error: () => this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 })
    });
  }

  viewInspectionType(inspectionTypeId: number): void {
    this.router.navigate(['/admin/inspection', inspectionTypeId]);
  }
}
