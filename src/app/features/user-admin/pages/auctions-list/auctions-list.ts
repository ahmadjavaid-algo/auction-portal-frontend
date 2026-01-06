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

import { AuctionService } from '../../../../services/auctions.service';
import { Auction } from '../../../../models/auction.model';
import { AuthService } from '../../../../services/auth';

import { AuctionsForm, AuctionsFormResult } from '../auctions-form/auctions-form';
import { InventoryauctionsList } from '../inventoryauctions-list/inventoryauctions-list';

type AuctionStats = {
  totalAuctions: number;
  activeAuctions: number;
  inactiveAuctions: number;
  distinctStatuses: number;
};

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
    MatTooltipModule,
    InventoryauctionsList
  ],
  templateUrl: './auctions-list.html',
  styleUrls: ['./auctions-list.scss']
})
export class AuctionsList implements OnInit, AfterViewInit, OnDestroy {
  private aucSvc = inject(AuctionService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = ['expand', 'name', 'schedule', 'bid', 'status', 'actions'];
  detailRow: string[] = ['expandedDetail'];

  auctions = new MatTableDataSource<Auction>([]);
  totalItems = 0;

  pageSize = 10;
  pageIndex = 0;
  searchTerm = '';
  loading = false;

  stats: AuctionStats = {
    totalAuctions: 0,
    activeAuctions: 0,
    inactiveAuctions: 0,
    distinctStatuses: 0
  };

  // Animated stats values (same feel as UsersList)
  animatedStats: AuctionStats = {
    totalAuctions: 0,
    activeAuctions: 0,
    inactiveAuctions: 0,
    distinctStatuses: 0
  };

  private intersectionObserver?: IntersectionObserver;
  private animationFrames: number[] = [];

  expanded = new Set<number>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatTable) table!: MatTable<Auction>;

  ngOnInit(): void {
    this.loadAuctions();

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
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(filter);
    };
  }

  ngAfterViewInit(): void {
    this.auctions.paginator = this.paginator;
    this.initScrollReveal();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    this.animationFrames.forEach((id) => cancelAnimationFrame(id));
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
      const elements = document.querySelectorAll('.reveal-on-scroll');
      elements.forEach((el) => this.intersectionObserver?.observe(el));
    }, 100);
  }

  private loadAuctions(): void {
    this.loading = true;

    this.aucSvc.getList().subscribe({
      next: (list: Auction[]) => {
        this.auctions.data = list ?? [];
        if (this.paginator) this.auctions.paginator = this.paginator;

        this.applyPagingTotals();
        this.computeStats();
        this.animateStats();
      },
      error: (e) => {
        console.error('Failed to load auctions', e);
        this.snack.open('Failed to load auctions.', 'Dismiss', { duration: 3000 });
      },
      complete: () => (this.loading = false)
    });
  }

  private computeStats(): void {
    const all = this.auctions.data ?? [];
    const active = all.filter((x) => x.active === true).length;
    const inactive = all.length - active;
    const statusSet = new Set(all.map((a) => a.auctionStatusId ?? a.auctionStatusCode ?? a.auctionStatusName ?? '—'));

    this.stats = {
      totalAuctions: all.length,
      activeAuctions: active,
      inactiveAuctions: inactive,
      distinctStatuses: statusSet.size
    };
  }

  private animateStats(): void {
    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      this.animatedStats.totalAuctions = Math.floor(this.stats.totalAuctions * eased);
      this.animatedStats.activeAuctions = Math.floor(this.stats.activeAuctions * eased);
      this.animatedStats.inactiveAuctions = Math.floor(this.stats.inactiveAuctions * eased);
      this.animatedStats.distinctStatuses = Math.floor(this.stats.distinctStatuses * eased);

      if (progress < 1) {
        const frameId = requestAnimationFrame(animate);
        this.animationFrames.push(frameId);
      }
    };

    const frameId = requestAnimationFrame(animate);
    this.animationFrames.push(frameId);
  }

  // ---------- UI helpers ----------
  getAuctionInitials(a: Auction): string {
    const name = (a.auctionName ?? '').trim();
    if (!name) return 'A';
    const parts = name.split(' ').filter(Boolean);
    const first = parts[0]?.[0] ?? 'A';
    const second = parts.length > 1 ? (parts[1]?.[0] ?? '') : (name[1] ?? '');
    return `${first}${second}`.toUpperCase();
  }

  getStart(a: Auction): Date | null {
    return a.startDateTime ? new Date(a.startDateTime) : null;
  }
  getEnd(a: Auction): Date | null {
    return a.endDateTime ? new Date(a.endDateTime) : null;
  }

  formatWhen(date: Date | null): string {
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

  // ---------- Expand / Collapse ----------
  toggleExpand(id: number): void {
    if (this.expanded.has(id)) this.expanded.delete(id);
    else this.expanded.add(id);

    queueMicrotask(() => this.table?.renderRows());
  }

  isExpanded = (id: number) => this.expanded.has(id);
  isDetailRow = (_index: number, row: Auction) => this.isExpanded(row.auctionId);

  // ---------- Search / Paging ----------
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
    this.totalItems = this.auctions.filter
      ? this.auctions.filteredData.length
      : this.auctions.data.length;
  }

  get rangeStart(): number {
    if (!this.totalItems) return 0;
    return this.pageIndex * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.totalItems, (this.pageIndex + 1) * this.pageSize);
  }

  // ---------- CRUD ----------
  openCreateAuction(): void {
    const ref = this.dialog.open<AuctionsForm, { mode: 'create' }, AuctionsFormResult>(AuctionsForm, {
      width: '820px',
      data: { mode: 'create' }
    });

    ref.afterClosed().subscribe((res) => {
      if (!res || res.action !== 'create') return;

      this.aucSvc.add(res.payload).subscribe({
        next: (id) => {
          this.snack.open(`Auction created successfully (ID ${id}).`, 'OK', { duration: 2500 });
          this.loadAuctions();
        },
        error: (e) =>
          this.snack.open(e?.error?.message || 'Failed to create auction.', 'Dismiss', {
            duration: 3000
          })
      });
    });
  }

  editAuction(row: Auction): void {
    const ref = this.dialog.open<AuctionsForm, { mode: 'edit'; initialData: Auction }, AuctionsFormResult>(
      AuctionsForm,
      {
        width: '820px',
        data: { mode: 'edit', initialData: row }
      }
    );

    ref.afterClosed().subscribe((res) => {
      if (!res || res.action !== 'edit') return;

      this.aucSvc.update(res.payload).subscribe({
        next: (ok) => {
          this.snack.open(ok ? 'Auction updated successfully.' : 'Update failed.', 'OK', {
            duration: 2500
          });
          if (ok) this.loadAuctions();
        },
        error: (e) =>
          this.snack.open(e?.error?.message || 'Failed to update auction.', 'Dismiss', {
            duration: 3000
          })
      });
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
          this.snack.open(`Auction ${newState ? 'activated' : 'deactivated'} successfully.`, 'OK', {
            duration: 2000
          });
          this.computeStats();
          this.animateStats();
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
