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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuctionService } from '../../../../services/auctions.service';
import { Auction } from '../../../../models/auction.model';
import { AuthService } from '../../../../services/auth';

// NEW: dialog form for create/edit
import { AuctionsForm, AuctionsFormResult } from '../auctions-form/auctions-form';

@Component({
  selector: 'app-auctions-list',
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
    MatTooltipModule
  ],
  templateUrl: './auctions-list.html',
  styleUrls: ['./auctions-list.scss']
})
export class AuctionsList {
  private aucSvc = inject(AuctionService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog); // NEW

  /** order must match template columns */
  displayedColumns: string[] = ['name', 'schedule', 'bid', 'status', 'actions'];
  auctions = new MatTableDataSource<Auction>([]);
  totalItems = 0;

  pageSize = 10;
  pageIndex = 0;
  searchTerm = '';

  // dashboard counters
  stats = { total: 0, active: 0, inactive: 0, statuses: 0 };

  // loading indicator
  loading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.loadAuctions();

    // Search across name, status text, ids, and dates
    this.auctions.filterPredicate = (a: Auction, filter: string) => {
      const haystack = [
        a.auctionName ?? '',
        String(a.auctionId ?? ''),
        String(a.auctionStatusId ?? ''),
        a.auctionStatusCode ?? '',
        a.auctionStatusName ?? '',
        a.startDateTime ?? '',
        a.endDateTime ?? '',
        String(a.bidIncrement ?? '')
      ].join(' ').toLowerCase();

      return haystack.includes(filter);
    };
  }

  ngAfterViewInit(): void {
    this.auctions.paginator = this.paginator;
  }

  private loadAuctions(): void {
    this.loading = true;
    this.aucSvc.getList().subscribe({
      next: (list: Auction[]) => {
        this.auctions.data = list ?? [];
        if (this.paginator) this.auctions.paginator = this.paginator;
        this.applyPagingTotals();
        this.computeStats();
      },
      error: (e) => {
        console.error('Failed to load auctions', e);
        this.snack.open('Failed to load auctions.', 'Dismiss', { duration: 3000 });
      },
      complete: () => (this.loading = false)
    });
  }

  private computeStats(): void {
    const all = this.auctions.data;
    const active = all.filter(x => x.active === true).length;
    const inactive = all.length - active;
    const statusSet = new Set(all.map(a => a.auctionStatusId));

    this.stats = {
      total: all.length,
      active,
      inactive,
      statuses: statusSet.size
    };
  }

  // ---- Display helpers ----
  getStart(a: Auction): Date | null {
    return a.startDateTime ? new Date(a.startDateTime) : null;
  }
  getEnd(a: Auction): Date | null {
    return a.endDateTime ? new Date(a.endDateTime) : null;
  }

  // ---- Search / Paging ----
  onSearch(): void {
    this.auctions.filter = this.searchTerm.trim().toLowerCase();
    this.totalItems = this.auctions.filteredData.length;
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
    this.totalItems = this.auctions.filter ? this.auctions.filteredData.length : this.auctions.data.length;
  }

  /** Range helpers for the right-bottom label */
  get rangeStart(): number {
    if (!this.totalItems) return 0;
    return this.pageIndex * this.pageSize + 1;
  }
  get rangeEnd(): number {
    return Math.min(this.totalItems, (this.pageIndex + 1) * this.pageSize);
  }

  // ===== Actions =====

  // OPEN CREATE DIALOG (uses AuctionsForm)
  openCreateAuction(): void {
    const ref = this.dialog.open<AuctionsForm, { mode: 'create' }, AuctionsFormResult>(AuctionsForm, {
      width: '720px',
      data: { mode: 'create' }
    });

    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      if (res.action === 'create') {
        this.aucSvc.add(res.payload).subscribe({
          next: (id) => {
            this.snack.open(`Auction created (ID ${id}).`, 'OK', { duration: 2500 });
            this.loadAuctions();
          },
          error: (e) =>
            this.snack.open(e?.error?.message || 'Failed to create auction.', 'Dismiss', { duration: 3000 })
        });
      }
    });
  }

  // OPEN EDIT DIALOG
  editAuction(row: Auction): void {
    const ref = this.dialog.open<AuctionsForm, { mode: 'edit'; initialData: Auction }, AuctionsFormResult>(AuctionsForm, {
      width: '720px',
      data: { mode: 'edit', initialData: row }
    });

    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      if (res.action === 'edit') {
        this.aucSvc.update(res.payload).subscribe({
          next: (ok) => {
            if (ok) {
              this.snack.open('Auction updated.', 'OK', { duration: 2000 });
              this.loadAuctions();
            } else {
              this.snack.open('Failed to update auction.', 'Dismiss', { duration: 3000 });
            }
          },
          error: (e) =>
            this.snack.open(e?.error?.message || 'Failed to update auction.', 'Dismiss', { duration: 3000 })
        });
      }
    });
  }

  toggleActive(a: Auction): void {
    const newState = !(a.active ?? false);
    const payload = {
      AuctionId: a.auctionId,
      Active: newState,
      ModifiedById: this.auth.currentUser?.userId ?? null
    };
    this.aucSvc.activate(payload).subscribe({
      next: (ok) => {
        if (ok) {
          a.active = newState;
          this.snack.open(`Auction ${newState ? 'activated' : 'deactivated'}.`, 'OK', { duration: 2000 });
          this.computeStats();
        } else {
          this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 });
        }
      },
      error: () => this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 })
    });
  }

  viewAuction(auctionId: number): void {
    this.router.navigate(['/admin/auctions', auctionId]);
  }
}
