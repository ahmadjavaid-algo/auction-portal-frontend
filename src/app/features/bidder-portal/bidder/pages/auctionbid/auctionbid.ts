
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { forkJoin, of, interval, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Auction } from '../../../../../models/auction.model';
import { InventoryAuction } from '../../../../../models/inventoryauction.model';
import { Inventory } from '../../../../../models/inventory.model';
import { InventoryDocumentFile } from '../../../../../models/inventorydocumentfile.model';
import { Product } from '../../../../../models/product.model';
import { AuctionTimebox } from '../../../../../models/auction-timebox.model';
import { AuctionBid } from '../../../../../models/auctionbid.model';

import { AuctionService } from '../../../../../services/auctions.service';
import { InventoryAuctionService } from '../../../../../services/inventoryauctions.service';
import { InventoryDocumentFileService } from '../../../../../services/inventorydocumentfile.service';
import { InventoryService } from '../../../../../services/inventory.service';
import { ProductsService } from '../../../../../services/products.service';
import { AuctionBidService } from '../../../../../services/auctionbids.service';
import { BidderAuthService } from '../../../../../services/bidderauth';
import {
  NotificationHubService,
  NotificationItem
} from '../../../../../services/notification-hub.service';

type SpecRow = { label: string; value: string | number | null | undefined };

type BidView = {
  auctionBidId: number;
  amount: number;
  createdDate: string | null;
  createdById: number | null;
  isMine: boolean;
  statusName: string | null | undefined;
};

@Component({
  selector: 'app-auctionbid',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  templateUrl: './auctionbid.html',
  styleUrls: ['./auctionbid.scss']
})
export class Auctionbid implements OnInit, OnDestroy {
  
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  private auctionsSvc = inject(AuctionService);
  private invAucSvc = inject(InventoryAuctionService);
  private filesSvc = inject(InventoryDocumentFileService);
  private invSvc = inject(InventoryService);
  private productsSvc = inject(ProductsService);
  private bidsSvc = inject(AuctionBidService);
  private bidderAuth = inject(BidderAuthService);
  private notifHub = inject(NotificationHubService);

  
  auctionId!: number;
  inventoryAuctionId!: number;

  
  auction: Auction | null = null;
  lot: InventoryAuction | null = null;
  inventory: Inventory | null = null;
  product: Product | null = null;

  
  loading = true;
  error: string | null = null;

  images: string[] = [];
  activeImage = '';
  title = 'Auction lot';
  subtitle = '';

  specs: SpecRow[] = [];

  
  private auctionStartUtcMs: number | null = null;
  private auctionEndUtcMs: number | null = null;
  private clockSkewMs = 0;
  private tickHandle: any = null;
  private resyncSub?: Subscription;
  private notifStreamSub?: Subscription;

  auctionState: 'scheduled' | 'live' | 'ended' | 'unknown' = 'unknown';
  auctionCountdown = '—';

  
  bids: BidView[] = [];
  currentPrice: number | null = null;
  yourMaxBid: number | null = null;
  yourStatus: 'Winning' | 'Outbid' | 'Won' | 'Lost' | 'No Bids' = 'No Bids';

  newBidAmount: number | null = null;
  placingBid = false;

  
  heroUrl =
    'https://images.unsplash.com/photo-1517940310602-75e447f00b52?q=80&w=1400&auto=format&fit=crop';

  money = (n?: number | null) =>
    n == null
      ? '—'
      : n.toLocaleString(undefined, {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0
        });

  

  get lotId(): number | null {
    const l: any = this.lot;
    return l?.inventoryAuctionId ?? l?.inventoryauctionId ?? null;
  }

  get lotStartPrice(): number | null {
    const l: any = this.lot;
    return (l?.auctionStartPrice ?? l?.AuctionStartPrice) ?? null;
  }

  get lotReservePrice(): number | null {
    const l: any = this.lot;
    return (l?.reservePrice ?? l?.ReservePrice) ?? null;
  }

  get lotBuyNowPrice(): number | null {
    const l: any = this.lot;
    return (l?.buyNowPrice ?? l?.BuyNowPrice) ?? null;
  }

  get lotBidIncrement(): number | null {
    const l: any = this.lot;
    return (l?.bidIncrement ?? l?.BidIncrement) ?? null;
  }

  

  ngOnInit(): void {
    this.route.paramMap.subscribe(pm => {
      this.auctionId = Number(pm.get('auctionId') || 0);
      this.inventoryAuctionId = Number(
        pm.get('inventoryAuctionId') ?? pm.get('id') ?? 0
      );

      if (!this.auctionId || !this.inventoryAuctionId) {
        this.error = 'Invalid auction or lot id.';
        this.loading = false;
        return;
      }

      this.loadAll();

      
      if (!this.notifStreamSub) {
        this.notifStreamSub = this.notifHub.stream$.subscribe(n =>
          this.handleNotification(n)
        );
      }
    });
  }

  ngOnDestroy(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.resyncSub?.unsubscribe();
    this.notifStreamSub?.unsubscribe();
    document.removeEventListener('visibilitychange', this.onVisChange);
  }

  

  private loadAll(): void {
    this.loading = true;
    this.error = null;
    this.images = [];
    this.activeImage = '';
    this.specs = [];
    this.bids = [];
    this.currentPrice = null;
    this.yourMaxBid = null;
    this.yourStatus = 'No Bids';
    this.newBidAmount = null;

    forkJoin({
      timebox: this.auctionsSvc
        .getTimebox(this.auctionId)
        .pipe(catchError(() => of(null as AuctionTimebox | null))),
      auctions: this.auctionsSvc
        .getList()
        .pipe(catchError(() => of([] as Auction[]))),
      invAucs: this.invAucSvc
        .getList()
        .pipe(catchError(() => of([] as InventoryAuction[]))),
      files: this.filesSvc
        .getList()
        .pipe(catchError(() => of([] as InventoryDocumentFile[]))),
      invs: this.invSvc.getList().pipe(catchError(() => of([] as Inventory[]))),
      products: this.productsSvc
        .getList()
        .pipe(catchError(() => of([] as Product[]))),
      bids: this.bidsSvc
        .getList()
        .pipe(catchError(() => of([] as AuctionBid[])))
    })
      .pipe(
        map(({ timebox, auctions, invAucs, files, invs, products, bids }) => {
          
          if (timebox) {
            this.auctionStartUtcMs = Number(timebox.startEpochMsUtc);
            this.auctionEndUtcMs = Number(timebox.endEpochMsUtc);
            if (Number.isFinite(timebox.nowEpochMsUtc as any)) {
              this.clockSkewMs = Number(timebox.nowEpochMsUtc) - Date.now();
            } else {
              this.clockSkewMs = 0;
            }
          } else {
            this.auctionStartUtcMs = null;
            this.auctionEndUtcMs = null;
            this.clockSkewMs = 0;
          }

          
          this.auction =
            (auctions || []).find(a => a.auctionId === this.auctionId) || null;

          
          this.lot =
            (invAucs || []).find(
              a =>
                ((a as any).inventoryAuctionId ??
                  (a as any).inventoryauctionId) === this.inventoryAuctionId
            ) || null;
          if (!this.lot) {
            throw new Error('Listing not found');
          }

          
          this.inventory =
            (invs || []).find(i => i.inventoryId === this.lot!.inventoryId) ||
            null;
          this.product = this.inventory
            ? (products || []).find(
                p => p.productId === this.inventory!.productId
              ) || null
            : null;

          
          const snap = this.safeParse(this.inventory?.productJSON);
          const year = this.product?.yearName ?? snap?.Year ?? snap?.year;
          const make = this.product?.makeName ?? snap?.Make ?? snap?.make;
          const model = this.product?.modelName ?? snap?.Model ?? snap?.model;
          this.title =
            [year, make, model].filter(Boolean).join(' ') ||
            (this.inventory?.displayName ?? 'Auction lot');

          const chassis =
            this.inventory?.chassisNo || snap?.Chassis || snap?.chassis;
          this.subtitle = chassis
            ? `Chassis ${chassis} • Lot #${this.lotId ?? ''}`
            : `Lot #${this.lotId ?? ''}`;

          
          const isImg = (u?: string | null, n?: string | null) => {
            const s = (u || n || '').toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.webp'].some(x => s.endsWith(x));
          };
          this.images = (files || [])
            .filter(
              f =>
                (f.active ?? true) &&
                f.inventoryId === this.inventory?.inventoryId &&
                f.documentUrl &&
                isImg(f.documentUrl, f.documentName)
            )
            .map(f => f.documentUrl!)
            .slice(0, 32);
          if (this.images.length) {
            this.activeImage = this.images[0];
          } else {
            this.activeImage = this.heroUrl;
          }

          
          const colorExterior =
            snap?.ExteriorColor ?? snap?.exteriorColor ?? null;
          const colorInterior =
            snap?.InteriorColor ?? snap?.interiorColor ?? null;
          const drivetrain = snap?.Drivetrain ?? snap?.drivetrain ?? null;
          const transmission =
            snap?.Transmission ?? snap?.transmission ?? null;
          const bodyStyle = snap?.BodyStyle ?? snap?.bodyStyle ?? null;
          const engine = snap?.Engine ?? snap?.engine ?? null;
          const mileage = snap?.Mileage ?? snap?.mileage ?? null;
          const location = snap?.Location ?? snap?.location ?? null;
          const titleStatus = snap?.TitleStatus ?? snap?.titleStatus ?? null;
          const sellerType = snap?.SellerType ?? snap?.sellerType ?? null;
          const categoryName =
            this.product?.categoryName ??
            snap?.Category ??
            snap?.category ??
            null;

          this.specs = [
            { label: 'Make', value: make || this.product?.makeName || '—' },
            { label: 'Model', value: model || this.product?.modelName || '—' },
            { label: 'Year', value: year || this.product?.yearName || '—' },
            { label: 'Category', value: categoryName || '—' },
            { label: 'VIN / Chassis', value: chassis || '—' },
            { label: 'Engine', value: engine || '—' },
            { label: 'Drivetrain', value: drivetrain || '—' },
            { label: 'Transmission', value: transmission || '—' },
            { label: 'Body Style', value: bodyStyle || '—' },
            { label: 'Exterior Color', value: colorExterior || '—' },
            { label: 'Interior Color', value: colorInterior || '—' },
            { label: 'Mileage', value: mileage ?? '—' },
            { label: 'Location', value: location || '—' },
            { label: 'Title Status', value: titleStatus || '—' },
            { label: 'Seller Type', value: sellerType || '—' }
          ];

          
          const currentUserId = this.bidderAuth.currentUser?.userId ?? null;

          const bidsForLot = (bids || []).filter(b => {
            const iaId =
              (b as any).inventoryAuctionId ??
              (b as any).InventoryAuctionId ??
              (b as any).inventoryauctionId;
            const aucId =
              (b as any).auctionId ??
              (b as any).AuctionId ??
              (b as any).auctionID;
            return iaId === this.lotId && aucId === this.auctionId;
          });

          this.bids = bidsForLot
            .map(b => {
              const createdRaw =
                (b as any).createdDate ?? (b as any).CreatedDate ?? null;
              const createdBy =
                (b as any).createdById ?? (b as any).CreatedById ?? null;
              const statusName =
                (b as any).auctionBidStatusName ??
                (b as any).AuctionBidStatusName ??
                null;

              return {
                auctionBidId:
                  (b as any).auctionBidId ?? (b as any).AuctionBidId ?? 0,
                amount: Number(
                  (b as any).bidAmount ?? (b as any).BidAmount ?? 0
                ),
                createdDate: createdRaw,
                createdById: createdBy,
                isMine: currentUserId != null && createdBy === currentUserId,
                statusName
              } as BidView;
            })
            .sort((a, b) => {
              const ta = a.createdDate ? Date.parse(a.createdDate) : 0;
              const tb = b.createdDate ? Date.parse(b.createdDate) : 0;
              return tb - ta; 
            });

          this.recomputeBidMetrics();

          
          this.updateCountdown();
          this.startTicker();
          this.startResync();
          this.wireVisibility();

          try {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch {}
        })
      )
      .subscribe({
        next: () => {
          this.loading = false;
        },
        error: () => {
          this.error = 'Failed to load auction.';
          this.loading = false;
        }
      });
  }

  private safeParse(json?: string | null): any | null {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  

  private startTicker(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.tickHandle = setInterval(() => this.updateCountdown(), 1000);
  }

  private startResync(): void {
    this.resyncSub = interval(120000).subscribe(() => {
      this.auctionsSvc.getTimebox(this.auctionId).subscribe({
        next: tb => {
          if (!tb) return;
          this.auctionStartUtcMs = Number(tb.startEpochMsUtc);
          this.auctionEndUtcMs = Number(tb.endEpochMsUtc);
          this.clockSkewMs = Number(tb.nowEpochMsUtc) - Date.now();
          this.updateCountdown();
        }
      });
    });
  }

  private onVisChange = () => {
    if (document.visibilityState === 'visible') {
      this.auctionsSvc.getTimebox(this.auctionId).subscribe({
        next: tb => {
          if (!tb) return;
          this.auctionStartUtcMs = Number(tb.startEpochMsUtc);
          this.auctionEndUtcMs = Number(tb.endEpochMsUtc);
          this.clockSkewMs = Number(tb.nowEpochMsUtc) - Date.now();
          this.updateCountdown();
        }
      });
    }
  };

  private wireVisibility(): void {
    document.addEventListener('visibilitychange', this.onVisChange);
  }

  private updateCountdown(): void {
    if (!this.auctionStartUtcMs || !this.auctionEndUtcMs) {
      this.auctionState = 'unknown';
      this.auctionCountdown = '—';
      return;
    }
    const now = Date.now() + this.clockSkewMs;
    const start = this.auctionStartUtcMs;
    const end = this.auctionEndUtcMs;

    if (now < start) {
      this.auctionState = 'scheduled';
      this.auctionCountdown = 'Starts in ' + this.fmtCountdown(start - now);
    } else if (now <= end) {
      this.auctionState = 'live';
      this.auctionCountdown = 'Ends in ' + this.fmtCountdown(end - now);
    } else {
      this.auctionState = 'ended';
      this.auctionCountdown = 'Auction ended';
    }

    this.recomputeBidMetrics(); 
  }

  private fmtCountdown(ms: number): string {
    const day = 24 * 60 * 60 * 1000;
    if (ms >= day) {
      const d = Math.floor(ms / day);
      return `${d} Day${d > 1 ? 's' : ''}`;
    }
    let s = Math.max(0, Math.floor(ms / 1000));
    const hh = Math.floor(s / 3600);
    s -= hh * 3600;
    const mm = Math.floor(s / 60);
    s -= mm * 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${hh}:${pad(mm)}:${pad(s)}`;
  }

  

  get isLive(): boolean {
    return this.auctionState === 'live';
  }

  private recomputeBidMetrics(): void {
    if (!this.lot) return;

    const all = this.bids;
    const currentUserId = this.bidderAuth.currentUser?.userId ?? null;

    const highestBid = all.length ? Math.max(...all.map(b => b.amount)) : null;

    const yourBids = currentUserId ? all.filter(b => b.isMine) : [];
    const yourHighest = yourBids.length
      ? Math.max(...yourBids.map(b => b.amount))
      : null;

    const startPrice = this.lotStartPrice;

    this.currentPrice = highestBid != null ? highestBid : startPrice ?? null;
    this.yourMaxBid = yourHighest;

    
    if (!yourHighest) {
      this.yourStatus = 'No Bids';
    } else if (this.auctionState === 'ended') {
      this.yourStatus =
        highestBid != null && yourHighest === highestBid ? 'Won' : 'Lost';
    } else if (highestBid != null && yourHighest === highestBid) {
      this.yourStatus = 'Winning';
    } else {
      this.yourStatus = 'Outbid';
    }

    
    if (this.currentPrice != null) {
      const inc = this.lotBidIncrement ?? 0;
      const base = this.currentPrice || 0;
      const next = inc > 0 ? base + inc : base;
      if (!this.newBidAmount || this.newBidAmount <= this.currentPrice) {
        this.newBidAmount = next;
      }
    }
  }

  adjustBid(delta: number): void {
    const current = this.newBidAmount ?? this.currentPrice ?? 0;
    const next = Math.max(0, current + delta);
    this.newBidAmount = next;
  }

  placeBid(): void {
    const userId = this.bidderAuth.currentUser?.userId ?? null;
    if (!userId) {
      this.snack.open('Please log in as a bidder to place bids.', 'OK', {
        duration: 3000
      });
      return;
    }

    if (!this.isLive) {
      this.snack.open(
        'Bidding is only available while the auction is live.',
        'OK',
        {
          duration: 3000
        }
      );
      return;
    }

    if (!this.lot) return;

    const amount = Number(this.newBidAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.snack.open('Enter a valid bid amount.', 'OK', { duration: 2500 });
      return;
    }

    if (this.currentPrice != null && amount <= this.currentPrice) {
      this.snack.open(
        'Your bid must be higher than the current price.',
        'OK',
        {
          duration: 3000
        }
      );
      return;
    }

    this.placingBid = true;

    
    const payload: any = {
      createdById: userId,
      active: true,

      auctionBidId: 0,
      auctionId: this.auctionId,
      auctionBidStatusId: 0,
      inventoryAuctionId: this.lotId ?? 0,
      bidAmount: amount,
      auctionBidStatusName: 'Winning'
    };

    console.log('[bid] placing with payload', payload);

    this.bidsSvc.add(payload).subscribe({
      next: id => {
        console.log('[bid] add() ok, new id =', id);
        this.snack.open('Bid placed successfully.', 'OK', { duration: 2500 });
        this.refreshBids();
      },
      error: err => {
        console.error('[bid] add() failed', err);
        const msg =
          err && err.error
            ? typeof err.error === 'string'
              ? err.error
              : JSON.stringify(err.error)
            : 'Unknown error';
        this.snack.open('Failed to place bid: ' + msg, 'OK', {
          duration: 5000
        });
      },
      complete: () => {
        this.placingBid = false;
      }
    });
  }

  private refreshBids(): void {
    if (!this.lot) return;

    this.bidsSvc
      .getList()
      .pipe(catchError(() => of([] as AuctionBid[])))
      .subscribe({
        next: bids => {
          const currentUserId = this.bidderAuth.currentUser?.userId ?? null;

          const filtered = (bids || []).filter(b => {
            const iaId =
              (b as any).inventoryAuctionId ??
              (b as any).InventoryAuctionId ??
              (b as any).inventoryauctionId;
            const aucId =
              (b as any).auctionId ??
              (b as any).AuctionId ??
              (b as any).auctionID;
            return iaId === this.lotId && aucId === this.auctionId;
          });

          this.bids = filtered
            .map(b => {
              const createdRaw =
                (b as any).createdDate ?? (b as any).CreatedDate ?? null;
              const createdBy =
                (b as any).createdById ?? (b as any).CreatedById ?? null;
              const statusName =
                (b as any).auctionBidStatusName ??
                (b as any).AuctionBidStatusName ??
                null;

              return {
                auctionBidId:
                  (b as any).auctionBidId ?? (b as any).AuctionBidId ?? 0,
                amount: Number(
                  (b as any).bidAmount ?? (b as any).BidAmount ?? 0
                ),
                createdDate: createdRaw,
                createdById: createdBy,
                isMine: currentUserId != null && createdBy === currentUserId,
                statusName
              } as BidView;
            })
            .sort((a, b) => {
              const ta = a.createdDate ? Date.parse(a.createdDate) : 0;
              const tb = b.createdDate ? Date.parse(b.createdDate) : 0;
              return tb - ta;
            });

          this.recomputeBidMetrics();
        },
        error: err => {
          console.error('[bid] refreshBids() failed', err);
        }
      });
  }

  

  private handleNotification(n: NotificationItem): void {
    
    if (!n.auctionId || !n.inventoryAuctionId) return;
    if (n.auctionId !== this.auctionId || n.inventoryAuctionId !== this.lotId) {
      return;
    }

    
    if (
      n.type !== 'bid-outbid' &&
      n.type !== 'bid-winning' &&
      n.type !== 'auction-won' &&
      n.type !== 'auction-lost'
    ) {
      return;
    }

    
    switch (n.type) {
      case 'bid-outbid':
        this.snack.open(
          'You have been outbid on this lot. Refreshing bid history…',
          'OK',
          { duration: 5000 }
        );
        break;

      case 'bid-winning':
        this.snack.open(
          'Your bid is currently winning for this lot.',
          'OK',
          { duration: 4000 }
        );
        break;

      case 'auction-won':
        this.snack.open(
          'Congratulations! You have won this lot.',
          'View',
          { duration: 6000 }
        );
        break;

      case 'auction-lost':
        this.snack.open(
          'The auction has ended and your bid was not the winning bid.',
          'OK',
          { duration: 6000 }
        );
        break;
    }

    
    this.refreshBids();
  }

  

  selectImage(url: string): void {
    this.activeImage = url;
  }

  formatDate(d?: string | null): string {
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(d));
    } catch {
      return d;
    }
  }

  formatRange(a?: string | Date | null, b?: string | Date | null): string {
    const s = a ? new Date(a) : null;
    const e = b ? new Date(b) : null;
    const fmt = (d: Date) =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(d);
    return `${s ? fmt(s) : '—'} → ${e ? fmt(e) : '—'}`;
  }
}
