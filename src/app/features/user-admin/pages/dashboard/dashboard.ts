// src/app/pages/admin/dashboard/dashboard.ts
import {
  Component,
  AfterViewInit,
  OnDestroy,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '../../../../services/auth';
import { AuctionService } from '../../../../services/auctions.service';
import { InventoryAuctionService } from '../../../../services/inventoryauctions.service';
import { InventoryService } from '../../../../services/inventory.service';

import {
  AdminNotificationHubService,
  AdminNotificationItem,
} from '../../../../services/admin-notification-hub.service';
import { AdminNotificationsService } from '../../../../services/admin-notifications.service';

import { Auction } from '../../../../models/auction.model';
import { InventoryAuction } from '../../../../models/inventoryauction.model';
import { Inventory } from '../../../../models/inventory.model';

import { BiddersService } from '../../../../services/bidders.service';
import { Bidder } from '../../../../models/bidder.model';

import { DashboardsService } from '../../../../services/dashboards.service';
import { Dashboard as DashboardStat } from '../../../../models/dashboard.model';

type GlanceItemStatus = 'Live' | 'Scheduled' | 'Closed' | '—';

interface GlanceItem {
  lot: string;              // AU-xx
  make: string;             // BMW, Mercedes etc
  count: number;            // how many of that make in this auction
  status: GlanceItemStatus; // Live / Scheduled
  auctionId: number;
}

interface ActivityRow {
  icon: string;
  text: string;
  time: string;
  type?: string;
}

interface StatTile {
  key: string;
  icon: string;
  label: string;
  value: number;
  delta: string;
  up: boolean;
}

interface MakeSummaryRow {
  make: string;
  count: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  readonly Math = Math;

  private auth = inject(AuthService);
  private aucSvc = inject(AuctionService);
  private iaSvc = inject(InventoryAuctionService);
  private invSvc = inject(InventoryService);
  private snack = inject(MatSnackBar);

  private adminNotifHub = inject(AdminNotificationHubService);
  private adminNotifApi = inject(AdminNotificationsService);

  private biddersSvc = inject(BiddersService);
  private dashboardsSvc = inject(DashboardsService);

  private counterTimer?: any;
  private notifSub?: Subscription;

  // --- DASHBOARD STATS (from Dashboardstats table) ---
  statsLoading = false;
  stats: StatTile[] = [
    {
      key: 'Live Auction',
      icon: 'local_fire_department',
      label: 'Live Auctions',
      value: 0,
      delta: '+0',
      up: true,
    },
    {
      key: 'Vehicles Listed',
      icon: 'directions_car',
      label: 'Vehicles Listed',
      value: 0,
      delta: '+0',
      up: true,
    },
    {
      key: 'Bids today',
      icon: 'gavel',
      label: 'Bids Today',
      value: 0,
      delta: '+0',
      up: true,
    },
    {
      key: 'Revenue',
      icon: 'attach_money',
      label: 'Revenue',
      value: 0,
      delta: '+0',
      up: true,
    },
    {
      key: 'Live Bid Portal Login count',
      icon: 'verified_user',
      label: 'Logged in today',
      value: 0,
      delta: '+0',
      up: true,
    },
    {
      key: 'Revenue Today',
      icon: 'pending_actions',
      label: 'Revenue (1d)',
      value: 0,
      delta: '–',
      up: true,
    },
  ];

  // performance-card helpers
  get totalRevenue(): number {
    return this.stats.find((s) => s.key === 'Revenue')?.value || 0;
  }
  get revenueToday(): number {
    return this.stats.find((s) => s.key === 'Revenue Today')?.value || 0;
  }
  get bidsToday(): number {
    return this.stats.find((s) => s.key === 'Bids today')?.value || 0;
  }
  get liveAuctionCount(): number {
    return this.stats.find((s) => s.key === 'Live Auction')?.value || 0;
  }
  get revenueTodaySharePercent(): number {
    const total = this.totalRevenue;
    if (!total || total <= 0) return 0;
    return Math.round((this.revenueToday / total) * 100);
  }

  // --- Auctions at a glance ---
  glanceLoading = false;
  liveAuctions: GlanceItem[] = [];          // all grouped rows
  auctionMakeSummary: MakeSummaryRow[] = []; // (kept for future use / if you show below card)
  glanceExpanded = false;                   // controls "View all" expansion

  // visible rows for the card (top 5 when collapsed)
  get visibleGlanceAuctions(): GlanceItem[] {
    if (!this.liveAuctions?.length) return [];
    if (this.glanceExpanded) return this.liveAuctions;
    return this.liveAuctions.slice(0, 5);
  }

  // --- Recent Activity ---
  activityLoading = false;
  activity: ActivityRow[] = [];
  activityCollapsed = true;

  // --- Verification Queue ---
  kycLoading = false;
  unverifiedBidders: Bidder[] = [];

  // --- Top bidders (still static) ---
  topBidders = [
    { name: 'Zain R.', handle: '@zain', bids: 188, color: '#6ee7b7' },
    { name: 'Ayesha S.', handle: '@ayesha', bids: 163, color: '#93c5fd' },
    { name: 'Junaid I.', handle: '@junaid', bids: 151, color: '#fca5a5' },
  ];

  get adminName(): string {
    const u = this.auth.currentUser;
    if (!u) return 'Admin';
    const name = [u.firstName].filter(Boolean).join(' ').trim();
    return name || u.userName || 'Admin';
  }

  // ----------------------------------------------------
  // LIFECYCLE
  // ----------------------------------------------------
  ngOnInit(): void {
    this.loadDashboardStats();

    if (this.auth.isAuthenticated) {
      this.adminNotifHub.init();
      this.refreshActivityFromHistory();
      this.loadUnverifiedBidders();

      this.notifSub = this.adminNotifHub.notifications$.subscribe({
        next: () => this.refreshActivityFromHistory(),
        error: () => this.refreshActivityFromHistory(),
      });
    }
  }

  ngAfterViewInit(): void {
    this.scheduleCountUpAnimation();
    this.loadGlance();
  }

  ngOnDestroy(): void {
    if (this.counterTimer) clearTimeout(this.counterTimer);
    this.notifSub?.unsubscribe();
  }

  // ----------------------------------------------------
  // DASHBOARDSTATS – dynamic KPI tiles
  // ----------------------------------------------------
  private loadDashboardStats(): void {
    this.statsLoading = true;
    this.dashboardsSvc
      .getList()
      .pipe(
        catchError((err) => {
          console.error('Failed to load dashboard stats', err);
          this.snack.open('Failed to load dashboard stats.', 'Dismiss', {
            duration: 3000,
          });
          this.statsLoading = false;
          return of([] as DashboardStat[]);
        })
      )
      .subscribe((rows: DashboardStat[]) => {
        if (rows && rows.length) {
          const byName = new Map<string, DashboardStat>();
          rows.forEach((r) => {
            if (r.dashboardstatsName) {
              byName.set(r.dashboardstatsName, r);
            }
          });

          this.stats = this.stats.map((tile) => {
            const row = byName.get(tile.key);
            const val = row?.dashboardnumber ?? 0;
            return {
              ...tile,
              value: val,
            };
          });
        }

        this.statsLoading = false;
        this.scheduleCountUpAnimation();
      });
  }

  // ----------------------------------------------------
  // COUNT-UP ANIMATION
  // ----------------------------------------------------
  private runCountUpAnimation(): void {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>('.count-up')
    );
    if (!els.length) return;

    const anim = (el: HTMLElement) => {
      const target = Number(el.dataset['value'] || '0');
      const dur = 900;
      const step = (t0: number) => {
        const p = Math.min(1, (performance.now() - t0) / dur);
        const val = Math.floor(target * (0.2 + 0.8 * p * (2 - p)));
        el.innerText = this.formatNumber(val);
        if (p < 1) requestAnimationFrame(() => step(t0));
      };
      requestAnimationFrame(() => step(performance.now()));
    };

    els.forEach(anim);
  }

  private scheduleCountUpAnimation(): void {
    if (this.counterTimer) clearTimeout(this.counterTimer);
    this.counterTimer = setTimeout(() => this.runCountUpAnimation(), 300);
  }

  // ----------------------------------------------------
  // VERIFICATION QUEUE
  // ----------------------------------------------------
  loadUnverifiedBidders(): void {
    this.kycLoading = true;
    this.biddersSvc
      .getList()
      .pipe(catchError(() => of([] as Bidder[])))
      .subscribe({
        next: (list) => {
          this.unverifiedBidders = (list || []).filter(
            (b) =>
              (b as any).emailConfirmed === false ||
              (b as any).emailConfirmed === 0
          );
          this.kycLoading = false;
        },
        error: () => {
          this.unverifiedBidders = [];
          this.kycLoading = false;
          this.snack.open('Failed to load verification queue.', 'Dismiss', {
            duration: 3000,
          });
        },
      });
  }

  // ----------------------------------------------------
  // RECENT ACTIVITY
  // ----------------------------------------------------
  private refreshActivityFromHistory(): void {
    this.activityLoading = true;
    this.adminNotifApi.getHistory(200).subscribe({
      next: (dtos) => {
        const rows = (dtos || []).map((dto) => {
          const created =
            (dto as any).createdDate ?? (dto as any).CreatedDate ?? null;
          const type = (dto as any).type ?? (dto as any).Type ?? '';
          const title = (dto as any).title ?? (dto as any).Title ?? '';
          const message =
            (dto as any).message ?? (dto as any).Message ?? '';
          const text =
            title && message
              ? `${title} — ${message}`
              : title || message || 'Notification';

          const itemForIcon: AdminNotificationItem = {
            id: 'x',
            type,
            title,
            message,
            createdAt: created ? new Date(created) : new Date(),
            read: false,
          };

          return {
            icon: this.iconFor(itemForIcon),
            text,
            time: this.toRelative(created ? new Date(created) : new Date()),
            type,
          } as ActivityRow;
        });

        this.activity = rows;
        this.activityLoading = false;
      },
      error: () => {
        this.activity = [];
        this.activityLoading = false;
      },
    });
  }

  toggleRecentActivity(): void {
    this.activityCollapsed = !this.activityCollapsed;
  }

  // ----------------------------------------------------
  // AUCTIONS AT A GLANCE
  //   - only Live or Scheduled auctions
  //   - grouped by (AuctionId + Make) with a count
  //   - sorted Live -> Scheduled
  // ----------------------------------------------------
  private loadGlance(): void {
    this.glanceLoading = true;

    forkJoin({
      auctions: this.aucSvc
        .getList()
        .pipe(catchError(() => of([] as Auction[]))),
      ia: this.iaSvc
        .getList()
        .pipe(catchError(() => of([] as InventoryAuction[]))),
      invs: this.invSvc
        .getList()
        .pipe(catchError(() => of([] as Inventory[]))),
    }).subscribe({
      next: ({ auctions, ia, invs }) => {
        const auctionById = new Map<number, Auction>();
        (auctions || []).forEach((a) => auctionById.set(a.auctionId, a));

        const invById = new Map<number, Inventory>();
        (invs || []).forEach((i) => invById.set(i.inventoryId, i));

        const groupMap = new Map<
          string,
          { auctionId: number; make: string; count: number; status: GlanceItemStatus }
        >();

        (ia || []).forEach((row) => {
          const auctionId = (row as any).auctionId;
          const a = auctionById.get(auctionId);
          if (!a) return;

          const statusName = (a.auctionStatusName || '').toLowerCase();
          let status: GlanceItemStatus = '—';
          if (statusName.includes('start')) status = 'Live';
          else if (statusName.includes('sched')) status = 'Scheduled';
          else if (statusName.includes('close')) status = 'Closed';

          // Only Live or Scheduled auctions
          if (status !== 'Live' && status !== 'Scheduled') return;

          const inv = invById.get(row.inventoryId);
          const make = this.resolveInventoryMake(inv);
          const key = `${auctionId}|${make}`;

          const existing = groupMap.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            groupMap.set(key, {
              auctionId,
              make,
              count: 1,
              status,
            });
          }
        });

        const items: GlanceItem[] = Array.from(groupMap.values()).map((g) => ({
          lot: `AU-${g.auctionId}`,
          make: g.make,
          count: g.count,
          status: g.status,
          auctionId: g.auctionId,
        }));

        const statusOrder = (s: GlanceItemStatus) =>
          s === 'Live' ? 0 : s === 'Scheduled' ? 1 : 2;

        items.sort((a, b) => {
          const sd = statusOrder(a.status) - statusOrder(b.status);
          if (sd !== 0) return sd;
          if (a.auctionId !== b.auctionId) return a.auctionId - b.auctionId;
          return a.make.localeCompare(b.make);
        });

        this.liveAuctions = items;
        this.glanceExpanded = false; // reset when reloaded

        // optional summary by make (if you want to show somewhere)
        const makeMap = new Map<string, number>();
        items.forEach((item) => {
          makeMap.set(item.make, (makeMap.get(item.make) || 0) + item.count);
        });

        this.auctionMakeSummary = Array.from(makeMap.entries())
          .map(([make, count]) => ({ make, count }))
          .sort((a, b) => b.count - a.count || a.make.localeCompare(b.make));
      },
      error: () => {
        this.snack.open('Failed to load auctions at a glance.', 'Dismiss', {
          duration: 3000,
        });
        this.liveAuctions = [];
        this.auctionMakeSummary = [];
      },
      complete: () => (this.glanceLoading = false),
    });
  }

  toggleGlance(): void {
    if (this.liveAuctions.length <= 5) return;
    this.glanceExpanded = !this.glanceExpanded;
  }

  // ----------------------------------------------------
  // HELPERS
  // ----------------------------------------------------
  private iconFor(n: AdminNotificationItem): string {
    const t = (n?.type || '').toLowerCase();
    const text = `${n?.title ?? ''} ${n?.message ?? ''}`.toLowerCase();

    switch (t) {
      case 'bid-created':
      case 'bid-placed':
      case 'bid-updated':
      case 'bid-outbid':
        return 'gavel';
      case 'auction-created':
        return 'add_business';
      case 'auction-scheduled':
        return 'event';
      case 'auction-live':
        return 'local_fire_department';
      case 'auction-closed':
        return 'lock';
      case 'vehicle-listed':
      case 'inventory-added':
      case 'inventory-updated':
        return 'directions_car';
      case 'user-created':
      case 'user-updated':
      case 'user-deleted':
        return 'person';
      case 'kyc-pending':
        return 'pending_actions';
      case 'kyc-approved':
      case 'kyc-verified':
        return 'verified_user';
      case 'kyc-rejected':
        return 'gpp_bad';
      case 'payment-received':
        return 'payments';
      case 'payment-failed':
        return 'report_gmailerrorred';
      case 'system-info':
        return 'info';
      case 'system-warning':
        return 'warning';
      case 'system-error':
        return 'error';
      default:
        break;
    }

    if (text.includes('bid')) return 'gavel';
    if (text.includes('kyc') || text.includes('verify')) return 'verified_user';
    if (text.includes('auction')) return 'local_fire_department';
    if (text.includes('vehicle') || text.includes('inventory') || text.includes('car'))
      return 'directions_car';
    if (text.includes('user') || text.includes('@')) return 'person';
    if (text.includes('payment') || text.includes('invoice')) return 'payments';

    return 'notifications';
  }

  toRelative(dateLike?: string | Date | null): string {
    if (!dateLike) return '—';
    const ts =
      typeof dateLike === 'string'
        ? new Date(dateLike).getTime()
        : new Date(dateLike).getTime();
    const diff = Math.max(0, Date.now() - ts);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  }

  private resolveInventoryDisplayName(
    inv: Inventory | undefined,
    id: number
  ): string {
    if (!inv) return `Inventory #${id}`;
    if (inv.displayName) return inv.displayName;
    const pj = this.safeParse(inv.productJSON);
    return pj?.DisplayName || pj?.displayName || `Inventory #${id}`;
  }

  // derive "make" for grouping
  private resolveInventoryMake(inv?: Inventory): string {
    if (!inv) return 'Unknown';
    const pj = this.safeParse(inv.productJSON);

    const raw =
      (inv as any).make ??
      pj?.Make ??
      pj?.make ??
      pj?.Brand ??
      pj?.brand ??
      '';

    const trimmed = (raw || '').toString().trim();
    if (!trimmed) return 'Unknown';
    return trimmed;
  }

  private safeParse(json?: string | null): any | null {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  formatNumber(n: number): string {
    return n >= 1000 ? n.toLocaleString() : String(n);
  }

  getFullName(u: Bidder): string {
    const f = (u.firstName ?? '').trim();
    const l = (u.lastName ?? '').trim();
    const full = [f, l].filter(Boolean).join(' ');
    return full || u.userName || '—';
  }
}
