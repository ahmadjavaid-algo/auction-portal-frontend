import { Component, AfterViewInit, OnDestroy, inject, OnInit } from '@angular/core';
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
  AdminNotificationItem
} from '../../../../services/admin-notification-hub.service';
import { AdminNotificationsService } from '../../../../services/admin-notifications.service';

import { Auction } from '../../../../models/auction.model';
import { InventoryAuction } from '../../../../models/inventoryauction.model';
import { Inventory } from '../../../../models/inventory.model';


import { BiddersService } from '../../../../services/bidders.service';
import { Bidder } from '../../../../models/bidder.model';

type GlanceItemStatus = 'Live' | 'Scheduled' | 'Closed' | '—';

interface GlanceItem {
  lot: string;
  car: string;
  endsInMin: number | null;
  bids: number | null;
  topBid: number | null;
  status: GlanceItemStatus;
  auctionId: number;
  inventoryAuctionId: number;
}

interface ActivityRow {
  icon: string;
  text: string;
  time: string; 
  type?: string;
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
    MatSnackBarModule
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

  private counterTimer?: any;
  private notifSub?: Subscription;

  get adminName(): string {
    const u = this.auth.currentUser;
    if (!u) return 'Admin';
    const name = [u.firstName].filter(Boolean).join(' ').trim();
    return name || u.userName || 'Admin';
  }

  
  stats = [
    { icon: 'local_fire_department', label: 'Live Auctions', value: 18,  delta: '+3',  up: true  },
    { icon: 'directions_car',        label: 'Vehicles Listed', value: 742, delta: '+56', up: true },
    { icon: 'gavel',                 label: 'Bids Today', value: 5230, delta: '-4%', up: false },
    { icon: 'attach_money',          label: 'Revenue (7d)', value: 126, delta: '+12%', up: true },
    { icon: 'verified_user',         label: 'KYC Approved', value: 128, delta: '+9',  up: true  },
    { icon: 'pending_actions',       label: 'KYC Pending', value: 7,   delta: '–',   up: true  },
  ];

  
  glanceLoading = false;
  liveAuctions: GlanceItem[] = [];

  
  activityLoading = false;
  activity: ActivityRow[] = [];
  activityCollapsed = true; 

  
  kycLoading = false;
  unverifiedBidders: Bidder[] = []; 

  
  topBidders = [
    { name: 'Zain R.',   handle: '@zain',   bids: 188, color: '#6ee7b7' },
    { name: 'Ayesha S.', handle: '@ayesha', bids: 163, color: '#93c5fd' },
    { name: 'Junaid I.', handle: '@junaid', bids: 151, color: '#fca5a5' },
  ];

  ngOnInit(): void {
    if (this.auth.isAuthenticated) {
      this.adminNotifHub.init();
      this.refreshActivityFromHistory();
      this.loadUnverifiedBidders(); 

      this.notifSub = this.adminNotifHub.notifications$.subscribe({
        next: () => this.refreshActivityFromHistory(),
        error: () => this.refreshActivityFromHistory()
      });
    }
  }

  ngAfterViewInit(): void {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.count-up'));
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
    this.counterTimer = setTimeout(() => els.forEach(anim), 300);

    this.loadGlance();
  }

  ngOnDestroy(): void {
    if (this.counterTimer) clearTimeout(this.counterTimer);
    this.notifSub?.unsubscribe();
  }

  

loadUnverifiedBidders(): void {
  this.kycLoading = true;
  this.biddersSvc.getList().pipe(
    catchError(() => of([] as Bidder[]))
  ).subscribe({
    next: (list) => {
      this.unverifiedBidders = (list || []).filter(b =>
        (b as any).emailConfirmed === false || (b as any).emailConfirmed === 0
      );
      this.kycLoading = false;
    },
    error: () => {
      this.unverifiedBidders = [];
      this.kycLoading = false;
      this.snack.open('Failed to load verification queue.', 'Dismiss', { duration: 3000 });
    }
  });
}

  
  private refreshActivityFromHistory(): void {
    this.activityLoading = true;
    this.adminNotifApi.getHistory(200).subscribe({
      next: (dtos) => {
        const rows = (dtos || []).map(dto => {
          const created =
            (dto as any).createdDate ?? (dto as any).CreatedDate ?? null;
          const type =
            (dto as any).type ?? (dto as any).Type ?? '';
          const title =
            (dto as any).title ?? (dto as any).Title ?? '';
          const message =
            (dto as any).message ?? (dto as any).Message ?? '';
          const text = title && message ? `${title} — ${message}` : (title || message || 'Notification');

          const itemForIcon: AdminNotificationItem = {
            id: 'x',
            type,
            title,
            message,
            createdAt: created ? new Date(created) : new Date(),
            read: false
          };

          return {
            icon: this.iconFor(itemForIcon),
            text,
            time: this.toRelative(created ? new Date(created) : new Date()),
            type
          } as ActivityRow;
        });

        
        this.activity = rows;
        this.activityLoading = false;
      },
      error: () => {
        this.activity = [];
        this.activityLoading = false;
      }
    });
  }

  toggleRecentActivity(): void {
    this.activityCollapsed = !this.activityCollapsed;
  }

  
  private loadGlance(): void {
    this.glanceLoading = true;

    forkJoin({
      auctions: this.aucSvc.getList().pipe(catchError(() => of([] as Auction[]))),
      ia: this.iaSvc.getList().pipe(catchError(() => of([] as InventoryAuction[]))),
      invs: this.invSvc.getList().pipe(catchError(() => of([] as Inventory[]))),
    })
    .subscribe({
      next: ({ auctions, ia, invs }) => {
        const auctionById = new Map<number, Auction>();
        (auctions || []).forEach(a => auctionById.set(a.auctionId, a));

        const invById = new Map<number, Inventory>();
        (invs || []).forEach(i => invById.set(i.inventoryId, i));

        const now = Date.now();

        const items: GlanceItem[] = (ia || []).map(row => {
          const a = auctionById.get((row as any).auctionId);
          const end = a?.endDateTime ? new Date(a.endDateTime).getTime() : null;

          const minsLeft =
            end && end > now ? Math.max(0, Math.round((end - now) / 60000)) : null;

          const status: GlanceItemStatus =
            a?.auctionStatusName?.toLowerCase().includes('live') ? 'Live' :
            a?.auctionStatusName?.toLowerCase().includes('sched') ? 'Scheduled' :
            a?.auctionStatusName?.toLowerCase().includes('close') ? 'Closed' :
            '—';

          const inv = invById.get(row.inventoryId);
          const car = this.resolveInventoryDisplayName(inv, row.inventoryId);

          return {
            lot: `AU-${a?.auctionId ?? row.auctionId ?? row.inventoryAuctionId}`,
            car,
            endsInMin: minsLeft,
            bids: null,
            topBid: null,
            status,
            auctionId: a?.auctionId ?? (row as any).auctionId,
            inventoryAuctionId:
              (row as any).inventoryAuctionId ?? (row as any).inventoryauctionId,
          };
        });

        const sorted = items.sort((x, y) => {
          const ax = x.endsInMin ?? Number.POSITIVE_INFINITY;
          const ay = y.endsInMin ?? Number.POSITIVE_INFINITY;
          return ax - ay;
        });

        this.liveAuctions = sorted.slice(0, 3);
      },
      error: () => {
        this.snack.open('Failed to load auctions at a glance.', 'Dismiss', { duration: 3000 });
        this.liveAuctions = [];
      },
      complete: () => (this.glanceLoading = false),
    });
  }

  
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
    if (text.includes('vehicle') || text.includes('inventory') || text.includes('car')) return 'directions_car';
    if (text.includes('user') || text.includes('@')) return 'person';
    if (text.includes('payment') || text.includes('invoice')) return 'payments';

    return 'notifications';
  }

  
toRelative(dateLike?: string | Date | null): string {
  if (!dateLike) return '—';
  const ts = typeof dateLike === 'string' ? new Date(dateLike).getTime() : new Date(dateLike).getTime();
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}


  private resolveInventoryDisplayName(inv: Inventory | undefined, id: number): string {
    if (!inv) return `Inventory #${id}`;
    if (inv.displayName) return inv.displayName;
    const pj = this.safeParse(inv.productJSON);
    return pj?.DisplayName || pj?.displayName || `Inventory #${id}`;
  }

  private safeParse(json?: string | null): any | null {
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
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
