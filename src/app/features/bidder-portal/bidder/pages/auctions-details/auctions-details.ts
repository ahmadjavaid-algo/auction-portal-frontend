import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { forkJoin, of, interval, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Auction } from '../../../../../models/auction.model';
import { InventoryAuction } from '../../../../../models/inventoryauction.model';
import { InventoryDocumentFile } from '../../../../../models/inventorydocumentfile.model';
import { Inventory } from '../../../../../models/inventory.model';
import { Product } from '../../../../../models/product.model';
import { AuctionTimebox } from '../../../../../models/auction-timebox.model';
import { AuctionBid } from '../../../../../models/auctionbid.model';
import { Favourite } from '../../../../../models/favourite.model';

import { AuctionService } from '../../../../../services/auctions.service';
import { InventoryAuctionService } from '../../../../../services/inventoryauctions.service';
import { InventoryDocumentFileService } from '../../../../../services/inventorydocumentfile.service';
import { InventoryService } from '../../../../../services/inventory.service';
import { ProductsService } from '../../../../../services/products.service';
import { AuctionBidService } from '../../../../../services/auctionbids.service';
import { FavouriteService } from '../../../../../services/favourites.service';
import { BidderAuthService } from '../../../../../services/bidderauth';

type LotCard = {
  invAuc: InventoryAuction;
  inventory: Inventory | null;
  title: string;
  sub: string;
  imageUrl: string;

  auctionStartPrice?: number | null;
  buyNow?: number | null;
  reserve?: number | null;
  bidIncrement?: number | null;

  yearName?: string | null;
  makeName?: string | null;
  modelName?: string | null;
  categoryName?: string | null;

  countdownText?: string;
  countdownState?: 'scheduled' | 'live' | 'ended';

  currentPrice?: number | null;
  yourMaxBid?: number | null;
  reserveMet?: boolean;

  isFavourite?: boolean;
  favouriteId?: number | null;

  bidCooldownActive?: boolean;
  bidCooldownRemaining?: number;
  cooldownHandle?: any;
  placingBid?: boolean;
};

@Component({
  selector: 'app-auctions-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  templateUrl: './auctions-details.html',
  styleUrls: ['./auctions-details.scss']
})
export class AuctionsDetails implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  private auctionsSvc = inject(AuctionService);
  private invAucSvc = inject(InventoryAuctionService);
  private filesSvc = inject(InventoryDocumentFileService);
  private invSvc = inject(InventoryService);
  private productsSvc = inject(ProductsService);
  private bidsSvc = inject(AuctionBidService);
  private favSvc = inject(FavouriteService);
  private bidderAuth = inject(BidderAuthService);

  loading = true;
  error: string | null = null;

  auctionId!: number;
  auction: Auction | null = null;

  // Hero background (will be replaced by first lot image when available)
  heroUrl =
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920';

  lots: LotCard[] = [];

  q = '';
  filters = { make: '', model: '', year: '', category: '' };
  sortBy: 'newest' | 'price_low' | 'price_high' | 'year_new' | 'year_old' =
    'newest';
  options = {
    makes: [] as string[],
    models: [] as string[],
    years: [] as string[],
    categories: [] as string[]
  };

  private tickHandle: any = null;
  private resyncSub?: Subscription;

  private auctionStartUtcMs: number | null = null;
  private auctionEndUtcMs: number | null = null;
  private clockSkewMs = 0;

  private favMap = new Map<number, Favourite>();

  ngOnInit(): void {
    this.auctionId = Number(
      this.route.snapshot.paramMap.get('auctionId') ||
        this.route.snapshot.paramMap.get('id')
    );

    if (!this.auctionId) {
      this.error = 'Invalid auction id.';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;

    const currentUserId = this.bidderAuth.currentUser?.userId ?? null;

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
      invs: this.invSvc
        .getList()
        .pipe(catchError(() => of([] as Inventory[]))),
      products: this.productsSvc
        .getList()
        .pipe(catchError(() => of([] as Product[]))),
      bids: this.bidsSvc
        .getList()
        .pipe(catchError(() => of([] as AuctionBid[]))),
      favs: this.favSvc
        .getList()
        .pipe(catchError(() => of([] as Favourite[])))
    })
      .pipe(
        map(({ timebox, auctions, invAucs, files, invs, products, bids, favs }) => {
          // time sync
          if (timebox) {
            this.auctionStartUtcMs = Number(timebox.startEpochMsUtc);
            this.auctionEndUtcMs = Number(timebox.endEpochMsUtc);
            if (Number.isFinite(timebox.nowEpochMsUtc as any)) {
              this.clockSkewMs = Number(timebox.nowEpochMsUtc) - Date.now();
            }
          } else {
            this.clockSkewMs = 0;
          }

          // auction info
          this.auction =
            (auctions || []).find(a => a.auctionId === this.auctionId) || null;

          // favourites map for this user
          this.favMap.clear();
          const favsForUserAll = (favs || []).filter(f => {
            const uid =
              (f as any).userId ??
              (f as any).UserId ??
              (f as any).userID ??
              (f as any).userid;
            return uid === currentUserId;
          });

          favsForUserAll.forEach(f => {
            const invAucIdFromFav =
              (f as any).inventoryAuctionId ??
              (f as any).InventoryAuctionId ??
              (f as any).inventoryauctionId;
            if (invAucIdFromFav != null) {
              this.favMap.set(Number(invAucIdFromFav), f);
            }
          });

          const rows = (invAucs || []).filter(
            x => (x as any).auctionId === this.auctionId && ((x as any).active ?? true)
          );

          const imageMap = this.buildImagesMap(files);

          const invMap = new Map<number, Inventory>();
          (invs || []).forEach(i => invMap.set((i as any).inventoryId, i));

          const prodMap = new Map<number, Product>();
          (products || []).forEach(p => prodMap.set((p as any).productId, p));

          const cards: LotCard[] = rows.map(r => {
            const inv = invMap.get((r as any).inventoryId) || null;
            const prod = inv ? prodMap.get((inv as any).productId) || null : null;
            const snap = this.safeParse((inv as any)?.productJSON);

            const yearName =
              ((prod as any)?.yearName ?? snap?.Year ?? snap?.year) ?? null;
            const makeName =
              ((prod as any)?.makeName ?? snap?.Make ?? snap?.make) ?? null;
            const modelName =
              ((prod as any)?.modelName ?? snap?.Model ?? snap?.model) ?? null;
            const categoryName =
              ((prod as any)?.categoryName ?? snap?.Category ?? snap?.category) ??
              null;

            const titleFromMeta = [yearName, makeName, modelName]
              .filter(Boolean)
              .join(' ');
            const title =
              titleFromMeta ||
              (inv as any)?.displayName ||
              snap?.DisplayName ||
              snap?.displayName ||
              `Inventory #${(r as any).inventoryId}`;

            const chassis = (inv as any)?.chassisNo || null;
            const sub = chassis
              ? `Chassis ${chassis} • #${(r as any).inventoryId}`
              : `#${(r as any).inventoryId}`;

            const cover =
              this.pickRandom(imageMap.get((r as any).inventoryId)) || this.heroUrl;

            const invAucId =
              (r as any).inventoryAuctionId ??
              (r as any).InventoryAuctionId ??
              (r as any).inventoryauctionId;

            const favRecord = this.favMap.get(invAucId);
            const isActive =
              (favRecord as any)?.active ??
              (favRecord as any)?.Active ??
              (favRecord as any)?.active;
            const isFav = !!favRecord && isActive !== false;
            const favId =
              (favRecord as any)?.BidderInventoryAuctionFavoriteId ??
              (favRecord as any)?.bidderInventoryAuctionFavoriteId ??
              null;

            return {
              invAuc: r,
              inventory: inv,
              title,
              sub,
              imageUrl: cover,
              auctionStartPrice: (r as any).auctionStartPrice ?? null,
              buyNow: (r as any).buyNowPrice ?? null,
              reserve: (r as any).reservePrice ?? null,
              bidIncrement: (r as any).bidIncrement ?? null,
              yearName,
              makeName,
              modelName,
              categoryName,
              countdownText: '—',
              countdownState: 'scheduled',
              currentPrice: null,
              yourMaxBid: null,
              reserveMet: false,
              isFavourite: isFav,
              favouriteId: favId,
              bidCooldownActive: false,
              bidCooldownRemaining: 0,
              cooldownHandle: null,
              placingBid: false
            };
          });

          // pick hero (same behavior as auctions-list)
          const firstImg = cards.find(c => !!c.imageUrl)?.imageUrl;
          if (firstImg) this.heroUrl = firstImg;

          this.applyBidMetrics(cards, bids || []);

          this.lots = cards.sort((a, b) =>
            this.dateDesc(
              ((a.inventory as any)?.modifiedDate || (a.inventory as any)?.createdDate) ?? null,
              ((b.inventory as any)?.modifiedDate || (b.inventory as any)?.createdDate) ?? null
            )
          );

          this.buildFilterOptions();

          this.updateCountdowns();
          this.startTicker();
          this.startResync();
          this.wireVisibility();
        })
      )
      .subscribe({
        next: () => {
          this.loading = false;
        },
        error: () => {
          this.error = 'Failed to load auction details.';
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.resyncSub?.unsubscribe();
    document.removeEventListener('visibilitychange', this.onVisChange);

    for (const c of this.lots) {
      if (c.cooldownHandle) {
        clearInterval(c.cooldownHandle);
        c.cooldownHandle = null;
      }
    }
  }

  // ===== Dashboard-like counts for hero/stats (mirrors auctions-list behavior) =====
  get liveCount(): number {
    return this.results.filter(x => x.countdownState === 'live').length;
  }
  get scheduledCount(): number {
    return this.results.filter(x => x.countdownState === 'scheduled').length;
  }
  get endedCount(): number {
    return this.results.filter(x => x.countdownState === 'ended').length;
  }

  get isLive(): boolean {
    if (!this.auctionStartUtcMs || !this.auctionEndUtcMs) return false;
    const now = Date.now() + this.clockSkewMs;
    return now >= this.auctionStartUtcMs && now <= this.auctionEndUtcMs;
  }

  toggleFavourite(card: LotCard): void {
    const userId = this.bidderAuth.currentUser?.userId ?? null;
    if (!userId) {
      console.warn('[fav] No logged-in bidder, ignoring favourite click.');
      return;
    }

    const invAucId =
      (card.invAuc as any).inventoryAuctionId ??
      (card.invAuc as any).InventoryAuctionId ??
      (card.invAuc as any).inventoryauctionId;

    if (invAucId == null) {
      console.warn('[fav] inventoryAuctionId missing on card.invAuc', card);
      return;
    }

    if (!card.isFavourite) {
      const existing = this.favMap.get(invAucId);

      if (existing) {
        const favId =
          (existing as any).BidderInventoryAuctionFavoriteId ??
          (existing as any).bidderInventoryAuctionFavoriteId ??
          card.favouriteId;

        if (!favId) {
          console.warn('[fav] Existing favourite has no id, falling back to add().', existing);
        } else {
          this.favSvc
            .activate({ FavouriteId: favId, Active: true, ModifiedById: userId })
            .subscribe({
              next: ok => {
                if (ok) {
                  card.isFavourite = true;
                  card.favouriteId = favId;
                  (existing as any).Active = true;
                  (existing as any).active = true;
                }
              },
              error: e => {
                console.error('[fav] REACTIVATE failed', e);
              }
            });

          return;
        }
      }

      const nowIso = new Date().toISOString();
      const payload: Favourite = {
        bidderInventoryAuctionFavoriteId: 0,
        userId: userId,
        inventoryAuctionId: invAucId,
        createdById: userId,
        createdDate: nowIso,
        modifiedById: 0,
        modifiedDate: nowIso,
        active: true
      };

      this.favSvc.add(payload).subscribe({
        next: id => {
          card.isFavourite = true;
          card.favouriteId = id;

          const favStub: any = {
            ...payload,
            BidderInventoryAuctionFavoriteId: id,
            bidderInventoryAuctionFavoriteId: id,
            UserId: userId,
            InventoryAuctionId: invAucId,
            Active: true
          };
          this.favMap.set(invAucId, favStub as Favourite);
        },
        error: e => {
          console.error('[fav] ADD failed', e);
        }
      });

      return;
    }

    if (card.isFavourite && card.favouriteId != null) {
      const payload = {
        FavouriteId: card.favouriteId,
        Active: false,
        ModifiedById: userId
      };

      this.favSvc.activate(payload).subscribe({
        next: ok => {
          if (ok) {
            card.isFavourite = false;
            const existing = this.favMap.get(invAucId);
            if (existing) {
              (existing as any).Active = false;
              (existing as any).active = false;
            }
          }
        },
        error: e => {
          console.error('[fav] DEACTIVATE failed', e);
        }
      });
    }
  }

  get filteredLots(): LotCard[] {
    const q = this.q.trim().toLowerCase();
    return this.lots.filter(c => {
      const hay =
        `${c.title} ${c.sub} ${c.makeName ?? ''} ${c.modelName ?? ''} ${c.yearName ?? ''} ${c.categoryName ?? ''}`.toLowerCase();
      if (q && !hay.includes(q)) return false;

      if (this.filters.make && (c.makeName ?? '') !== this.filters.make) return false;
      if (this.filters.model && (c.modelName ?? '') !== this.filters.model) return false;
      if (this.filters.year && String(c.yearName ?? '') !== this.filters.year) return false;
      if (this.filters.category && (c.categoryName ?? '') !== this.filters.category) return false;

      return true;
    });
  }

  get results(): LotCard[] {
    const list = [...this.filteredLots];

    const priceOf = (c: LotCard) =>
      (c.auctionStartPrice ?? undefined) ??
      (c.buyNow ?? undefined) ??
      (c.reserve ?? undefined) ??
      Number.POSITIVE_INFINITY;

    switch (this.sortBy) {
      case 'price_low':
        return list.sort((a, b) => priceOf(a) - priceOf(b));
      case 'price_high':
        return list.sort((a, b) => priceOf(b) - priceOf(a));
      case 'year_new':
        return list.sort(
          (a, b) => parseInt(String(b.yearName || 0)) - parseInt(String(a.yearName || 0))
        );
      case 'year_old':
        return list.sort(
          (a, b) => parseInt(String(a.yearName || 0)) - parseInt(String(b.yearName || 0))
        );
      default:
        return list.sort((a, b) =>
          this.dateDesc(
            ((a.inventory as any)?.modifiedDate || (a.inventory as any)?.createdDate) ?? null,
            ((b.inventory as any)?.modifiedDate || (b.inventory as any)?.createdDate) ?? null
          )
        );
    }
  }

  clearAll(): void {
    this.q = '';
    this.filters = { make: '', model: '', year: '', category: '' };
    this.sortBy = 'newest';
  }

  clearOne(key: keyof typeof this.filters): void {
    this.filters[key] = '';
  }

  private buildFilterOptions(): void {
    const uniq = (arr: (string | null | undefined)[]) =>
      Array.from(new Set(arr.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));

    this.options.makes = uniq(this.lots.map(l => l.makeName));
    this.options.models = uniq(this.lots.map(l => l.modelName));
    this.options.years = uniq(this.lots.map(l => (l.yearName ?? null) as any));
    this.options.categories = uniq(this.lots.map(l => l.categoryName));
  }

  private startTicker(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.tickHandle = setInterval(() => this.updateCountdowns(), 1000);
  }

  private startResync(): void {
    this.resyncSub = interval(120000).subscribe(() => {
      this.auctionsSvc.getTimebox(this.auctionId).subscribe({
        next: tb => {
          if (!tb) return;
          this.auctionStartUtcMs = Number(tb.startEpochMsUtc);
          this.auctionEndUtcMs = Number(tb.endEpochMsUtc);
          this.clockSkewMs = Number(tb.nowEpochMsUtc) - Date.now();
          this.updateCountdowns();
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
          this.updateCountdowns();
        }
      });
    }
  };

  private wireVisibility(): void {
    document.addEventListener('visibilitychange', this.onVisChange);
  }

  private updateCountdowns(): void {
    if (!this.auctionStartUtcMs || !this.auctionEndUtcMs) {
      for (const c of this.lots) {
        c.countdownState = 'scheduled';
        c.countdownText = '—';
      }
      return;
    }

    const now = Date.now() + this.clockSkewMs;

    for (const c of this.lots) {
      const start = this.auctionStartUtcMs;
      const end = this.auctionEndUtcMs;

      if (now < start) {
        c.countdownState = 'scheduled';
        c.countdownText = 'Starts ' + this.fmtCountdown(start - now);
      } else if (now <= end) {
        c.countdownState = 'live';
        c.countdownText = this.fmtCountdown(end - now);
      } else {
        c.countdownState = 'ended';
        c.countdownText = 'Ended';
      }
    }
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

  private applyBidMetrics(cards: LotCard[], bids: AuctionBid[]): void {
    const currentUserId = this.bidderAuth.currentUser?.userId ?? null;

    cards.forEach(card => {
      const lotId =
        (card.invAuc as any).inventoryAuctionId ??
        (card.invAuc as any).InventoryAuctionId ??
        (card.invAuc as any).inventoryauctionId;

      const lotBids = (bids || []).filter(b => {
        const iaId =
          (b as any).inventoryAuctionId ??
          (b as any).InventoryAuctionId ??
          (b as any).inventoryauctionId;
        const aucId =
          (b as any).auctionId ?? (b as any).AuctionId ?? (b as any).auctionID;
        return iaId === lotId && aucId === this.auctionId;
      });

      const highestBid = lotBids.length
        ? Math.max(
            ...lotBids.map(b =>
              Number((b as any).bidAmount ?? (b as any).BidAmount ?? (b as any).Amount ?? 0)
            )
          )
        : null;

      const yourBids =
        currentUserId != null
          ? lotBids.filter(b => {
              const createdBy = (b as any).createdById ?? (b as any).CreatedById ?? null;
              return createdBy === currentUserId;
            })
          : [];

      const yourHighest = yourBids.length
        ? Math.max(
            ...yourBids.map(b =>
              Number((b as any).bidAmount ?? (b as any).BidAmount ?? (b as any).Amount ?? 0)
            )
          )
        : null;

      const startPrice = card.auctionStartPrice ?? null;
      card.currentPrice = highestBid != null ? highestBid : startPrice;
      card.yourMaxBid = yourHighest;

      const reserve = card.reserve ?? null;
      card.reserveMet =
        reserve != null &&
        reserve > 0 &&
        card.currentPrice != null &&
        card.currentPrice >= reserve;
    });
  }

  private refreshAllBids(): void {
    this.bidsSvc
      .getList()
      .pipe(catchError(() => of([] as AuctionBid[])))
      .subscribe(bids => {
        this.applyBidMetrics(this.lots, bids || []);
      });
  }

  onQuickBid(card: LotCard): void {
    if (!this.isLive) {
      this.snack.open('Bidding is only available while the auction is live.', 'OK', {
        duration: 3000
      });
      return;
    }

    const userId = this.bidderAuth.currentUser?.userId ?? null;
    if (!userId) {
      this.snack.open('Please log in as a bidder to place bids.', 'OK', { duration: 3000 });
      return;
    }

    if (card.bidCooldownActive || card.placingBid) return;

    const inc = card.bidIncrement ?? 100;
    const base =
      card.currentPrice ?? card.auctionStartPrice ?? card.buyNow ?? card.reserve ?? 0;
    const amount = base + (inc > 0 ? inc : 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      this.snack.open('Unable to compute a valid quick bid amount.', 'OK', { duration: 3000 });
      return;
    }

    (card as any).__pendingAmount = amount;

    card.bidCooldownActive = true;
    card.bidCooldownRemaining = 5;

    if (card.cooldownHandle) {
      clearInterval(card.cooldownHandle);
      card.cooldownHandle = null;
    }

    card.cooldownHandle = setInterval(() => {
      if (!card.bidCooldownActive) {
        clearInterval(card.cooldownHandle);
        card.cooldownHandle = null;
        return;
      }

      card.bidCooldownRemaining = (card.bidCooldownRemaining || 0) - 1;

      if ((card.bidCooldownRemaining || 0) <= 0) {
        this.executeQuickBid(card);
      }
    }, 1000);
  }

  cancelQuickBid(card: LotCard): void {
    if (card.cooldownHandle) {
      clearInterval(card.cooldownHandle);
      card.cooldownHandle = null;
    }
    card.bidCooldownActive = false;
    card.bidCooldownRemaining = 0;
    delete (card as any).__pendingAmount;
  }

  private executeQuickBid(card: LotCard): void {
    if (card.cooldownHandle) {
      clearInterval(card.cooldownHandle);
      card.cooldownHandle = null;
    }

    card.bidCooldownActive = false;

    const userId = this.bidderAuth.currentUser?.userId ?? null;
    if (!userId) return;

    const lotId =
      (card.invAuc as any).inventoryAuctionId ??
      (card.invAuc as any).InventoryAuctionId ??
      (card.invAuc as any).inventoryauctionId ??
      0;

    const amount = Number((card as any).__pendingAmount ?? 0);
    delete (card as any).__pendingAmount;

    if (!Number.isFinite(amount) || amount <= 0) {
      this.snack.open('Failed to place bid: invalid amount.', 'OK', { duration: 3000 });
      return;
    }

    card.placingBid = true;

    const payload: any = {
      createdById: userId,
      active: true,
      auctionBidId: 0,
      auctionId: this.auctionId,
      auctionBidStatusId: 0,
      inventoryAuctionId: lotId,
      bidAmount: amount,
      auctionBidStatusName: 'Winning'
    };

    this.bidsSvc.add(payload).subscribe({
      next: () => {
        this.snack.open('Quick bid placed successfully.', 'OK', { duration: 2500 });
        this.refreshAllBids();
      },
      error: err => {
        const msg =
          err && err.error
            ? typeof err.error === 'string'
              ? err.error
              : JSON.stringify(err.error)
            : 'Unknown error';
        this.snack.open('Failed to place bid: ' + msg, 'OK', { duration: 5000 });
      },
      complete: () => {
        card.placingBid = false;
      }
    });
  }

  private buildImagesMap(files: InventoryDocumentFile[]): Map<number, string[]> {
    const m = new Map<number, string[]>();

    const isImg = (u?: string | null, n?: string | null) => {
      const s = (u || n || '').toLowerCase();
      return ['.jpg', '.jpeg', '.png', 'jpg', 'jpeg', 'png'].some(x => s.endsWith(x));
    };

    (files || [])
      .filter(f => {
        const active = (f as any).active ?? (f as any).Active ?? true;
        const invId = (f as any).inventoryId ?? (f as any).InventoryId;
        const thumbUrl =
          (f as any).documentThumbnailUrl ?? (f as any).DocumentThumbnailUrl ?? null;
        const name = (f as any).documentName ?? (f as any).DocumentName ?? null;

        return active && !!invId && !!thumbUrl && isImg(thumbUrl, name);
      })
      .forEach(f => {
        const invId = (f as any).inventoryId ?? (f as any).InventoryId;
        const thumbUrl =
          (f as any).documentThumbnailUrl ?? (f as any).DocumentThumbnailUrl ?? null;

        if (!thumbUrl) return;

        const list = m.get(invId) || [];
        list.push(thumbUrl);
        m.set(invId, list);
      });

    return m;
  }

  private pickRandom(arr?: string[]): string | undefined {
    if (!arr?.length) return undefined;
    const i = Math.floor(Math.random() * arr.length);
    return arr[i];
  }

  private dateDesc(a?: string | null, b?: string | null): number {
    const ta = a ? Date.parse(a) : 0;
    const tb = b ? Date.parse(b) : 0;
    return tb - ta;
  }

  private safeParse(json?: string | null): any | null {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  formatRange(a?: string | Date | null, b?: string | Date | null): string {
    const s = a ? new Date(a) : null;
    const e = b ? new Date(b) : null;
    const fmt = (d: Date) =>
      new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
    return `${s ? fmt(s) : '—'} → ${e ? fmt(e) : '—'}`;
  }

  money(n?: number | null): string {
    if (n == null) return '—';
    return n.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
  }

  trackById = (_: number, c: LotCard) =>
    (c.invAuc as any).inventoryAuctionId ?? (c.invAuc as any).InventoryAuctionId ?? c.sub;
}
