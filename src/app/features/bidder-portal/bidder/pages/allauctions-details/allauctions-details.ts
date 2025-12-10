// src/app/pages/bidder/auctions/allauctions-details/allauctions-details.ts
import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

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
import { Favourite } from '../../../../../models/favourite.model';
import { AuctionBid } from '../../../../../models/auctionbid.model';

import { AuctionService } from '../../../../../services/auctions.service';
import { InventoryAuctionService } from '../../../../../services/inventoryauctions.service';
import { InventoryDocumentFileService } from '../../../../../services/inventorydocumentfile.service';
import { InventoryService } from '../../../../../services/inventory.service';
import { ProductsService } from '../../../../../services/products.service';
import { FavouriteService } from '../../../../../services/favourites.service';
import { AuctionBidService } from '../../../../../services/auctionbids.service';
import { BidderAuthService } from '../../../../../services/bidderauth';

type LotCard = {
  // identity
  inventoryAuctionId: number;
  auctionId: number;
  auctionName: string | null;

  // display
  title: string;
  sub: string;
  imageUrl: string;

  // pricing / meta
  auctionStartPrice?: number | null;
  buyNow?: number | null;
  reserve?: number | null;
  bidIncrement?: number | null;
  yearName?: string | null;
  makeName?: string | null;
  modelName?: string | null;
  categoryName?: string | null;

  // favourites
  isFavourite?: boolean;
  favouriteId?: number | null;

  // live state / countdown
  countdownText?: string;
  countdownState?: 'scheduled' | 'live' | 'ended';

  // bidding metrics
  currentPrice?: number | null;
  yourMaxBid?: number | null;
  reserveMet?: boolean;
  isLeading?: boolean;
  minNextBid?: number | null;

  // quick-bid UX
  bidCooldownActive?: boolean;
  bidCooldownRemaining?: number;
  cooldownHandle?: any;
  placingBid?: boolean;
};

@Component({
  selector: 'app-allauctions-details',
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
  templateUrl: './allauctions-details.html',
  styleUrls: ['./allauctions-details.scss']
})
export class AllauctionsDetails implements OnDestroy {
  private auctionsSvc = inject(AuctionService);
  private invAucSvc = inject(InventoryAuctionService);
  private filesSvc = inject(InventoryDocumentFileService);
  private invSvc = inject(InventoryService);
  private productsSvc = inject(ProductsService);
  private favSvc = inject(FavouriteService);
  private bidsSvc = inject(AuctionBidService);
  private bidderAuth = inject(BidderAuthService);
  private snack = inject(MatSnackBar);

  loading = true;
  error: string | null = null;

  lots: LotCard[] = [];

  q = '';
  filters = { auction: '', make: '', model: '', year: '', category: '' };
  sortBy:
    | 'newest'
    | 'price_low'
    | 'price_high'
    | 'year_new'
    | 'year_old'
    | 'start_time' = 'newest';

  options = {
    auctions: [] as string[],
    makes: [] as string[],
    models: [] as string[],
    years: [] as string[],
    categories: [] as string[]
  };

  heroUrl =
    'https://images.unsplash.com/photo-1517940310602-75e447f00b52?q=80&w=1400&auto=format&fit=crop';

  private tickHandle: any = null;
  private resyncSub?: Subscription;
  private clockSkewMs = 0;
  private timeboxes = new Map<number, AuctionTimebox>();

  private favMap = new Map<number, Favourite>();

  ngOnInit(): void {
    this.loading = true;
    const currentUserId = this.bidderAuth.currentUser?.userId ?? null;

    forkJoin({
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
      favs: this.favSvc.getList().pipe(catchError(() => of([] as Favourite[]))),
      bids: this.bidsSvc
        .getList()
        .pipe(catchError(() => of([] as AuctionBid[])))
    })
      .pipe(
        map(({ auctions, invAucs, files, invs, products, favs, bids }) => {
          const auctionMap = new Map<number, Auction>();
          (auctions || []).forEach(a => auctionMap.set(a.auctionId, a));

          // favourites map – only for current user
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

          const imageMap = this.buildImagesMap(files);

          const invMap = new Map<number, Inventory>();
          (invs || []).forEach(i => invMap.set(i.inventoryId, i));

          const prodMap = new Map<number, Product>();
          (products || []).forEach(p => prodMap.set(p.productId, p));

          // only active rows
          const rows = (invAucs || []).filter(x => x.active ?? true);

          const cards: LotCard[] = rows.map(r => {
            const aid = (r as any).auctionId as number;
            const inv = invMap.get(r.inventoryId) || null;
            const prod = inv ? prodMap.get(inv.productId) || null : null;
            const snap = this.safeParse(inv?.productJSON);

            const yearName =
              (prod?.yearName ?? snap?.Year ?? snap?.year) ?? null;
            const makeName =
              (prod?.makeName ?? snap?.Make ?? snap?.make) ?? null;
            const modelName =
              (prod?.modelName ?? snap?.Model ?? snap?.model) ?? null;
            const category =
              (prod?.categoryName ?? snap?.Category ?? snap?.category) ?? null;

            const titleFromMeta = [yearName, makeName, modelName]
              .filter(Boolean)
              .join(' ');
            const title =
              titleFromMeta ||
              inv?.displayName ||
              snap?.DisplayName ||
              snap?.displayName ||
              `Inventory #${r.inventoryId}`;

            const chassis = inv?.chassisNo || null;
            const sub = chassis
              ? `Chassis ${chassis} • #${r.inventoryId}`
              : `#${r.inventoryId}`;

            const cover =
              this.pickRandom(imageMap.get(r.inventoryId)) || this.heroUrl;
            const aucName =
              auctionMap.get(aid)?.auctionName ??
              (auctionMap.has(aid) ? `Auction #${aid}` : null);

            const invAucId =
              (r as any).inventoryAuctionId ??
              (r as any).InventoryAuctionId ??
              (r as any).inventoryauctionId;

            const favRecord = this.favMap.get(invAucId);
            const isActive =
              (favRecord as any)?.active ??
              (favRecord as any)?.Active ??
              favRecord?.active;
            const isFav = !!favRecord && isActive !== false;
            const favId =
              (favRecord as any)?.BidderInventoryAuctionFavoriteId ??
              (favRecord as any)?.bidderInventoryAuctionFavoriteId ??
              null;

            return {
              inventoryAuctionId: invAucId,
              auctionId: aid,
              auctionName: aucName,
              title,
              sub,
              imageUrl: cover,
              auctionStartPrice: (r as any).auctionStartPrice ?? null,
              buyNow: r.buyNowPrice ?? null,
              reserve: r.reservePrice ?? null,
              bidIncrement: r.bidIncrement ?? null,
              yearName,
              makeName,
              modelName,
              categoryName: category,
              isFavourite: isFav,
              favouriteId: favId,
              countdownText: '—',
              countdownState: 'scheduled',
              currentPrice: null,
              yourMaxBid: null,
              reserveMet: false,
              isLeading: false,
              minNextBid: null,
              bidCooldownActive: false,
              bidCooldownRemaining: 0,
              placingBid: false
            };
          });

          const firstImg = cards.find(c => !!c.imageUrl)?.imageUrl;
          if (firstImg) this.heroUrl = firstImg;

          // apply bidding metrics: current bid, your max, reserveMet, isLeading, minNextBid
          this.applyBidMetrics(cards, bids || []);

          this.lots = cards;

          this.buildFilterOptions();

          const uniqAuctionIds = Array.from(
            new Set(this.lots.map(c => c.auctionId))
          ).filter(Boolean) as number[];

          return { uniqAuctionIds };
        })
      )
      .subscribe({
        next: ({ uniqAuctionIds }) => {
          this.refreshTimeboxes(uniqAuctionIds, () => {
            this.updateCountdowns();
            this.startTicker();
            this.startResync(uniqAuctionIds);
            this.wireVisibility(uniqAuctionIds);
            this.loading = false;
          });
        },
        error: () => {
          this.error = 'Failed to load all auctions.';
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.resyncSub?.unsubscribe();
    document.removeEventListener('visibilitychange', this.onVisChange);

    // clear any active cooldown timers
    for (const c of this.lots) {
      if (c.cooldownHandle) {
        clearInterval(c.cooldownHandle);
        c.cooldownHandle = null;
      }
    }
  }

  // ---------- favourites ----------

  toggleFavourite(card: LotCard): void {
    const userId = this.bidderAuth.currentUser?.userId ?? null;
    if (!userId) {
      console.warn('[fav] No logged-in bidder, ignoring favourite click.');
      return;
    }

    // add / reactivate
    if (!card.isFavourite) {
      const existing = this.favMap.get(card.inventoryAuctionId);

      if (existing) {
        const favId =
          (existing as any).BidderInventoryAuctionFavoriteId ??
          (existing as any).bidderInventoryAuctionFavoriteId ??
          card.favouriteId;

        if (!favId) {
          console.warn(
            '[fav] Existing favourite has no id, falling back to add().',
            existing
          );
        } else {
          this.favSvc
            .activate({
              FavouriteId: favId,
              Active: true,
              ModifiedById: userId
            })
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
        inventoryAuctionId: card.inventoryAuctionId,
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
            InventoryAuctionId: card.inventoryAuctionId,
            Active: true
          };
          this.favMap.set(card.inventoryAuctionId, favStub as Favourite);
        },
        error: e => {
          console.error('[fav] ADD failed', e);
        }
      });

      return;
    }

    // deactivate
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
            const existing = this.favMap.get(card.inventoryAuctionId);
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

  // ---------- QUICK BID (replicated behaviour) ----------

  onQuickBid(card: LotCard): void {
    if (card.countdownState !== 'live') {
      this.snack.open(
        'Quick bid is only available while the auction is live.',
        'OK',
        { duration: 3000 }
      );
      return;
    }

    const userId = this.bidderAuth.currentUser?.userId ?? null;
    if (!userId) {
      this.snack.open('Please log in as a bidder to place bids.', 'OK', {
        duration: 3000
      });
      return;
    }

    if (card.bidCooldownActive || card.placingBid) return;

    // compute minNextBid if not set
    if (card.minNextBid == null) {
      const inc = card.bidIncrement ?? 100;
      const base =
        card.currentPrice ??
        card.auctionStartPrice ??
        card.buyNow ??
        card.reserve ??
        0;
      card.minNextBid = base + (inc > 0 ? inc : 0);
    }

    if (!card.minNextBid || card.minNextBid <= 0) {
      this.snack.open('Unable to compute a valid quick bid amount.', 'OK', {
        duration: 3000
      });
      return;
    }

    (card as any).__pendingAmount = card.minNextBid;

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

    const amount = Number((card as any).__pendingAmount ?? 0);
    delete (card as any).__pendingAmount;

    if (!Number.isFinite(amount) || amount <= 0) {
      this.snack.open('Failed to place bid: invalid amount.', 'OK', {
        duration: 3000
      });
      return;
    }

    const payload: any = {
      createdById: userId,
      active: true,
      auctionBidId: 0,
      auctionId: card.auctionId,
      auctionBidStatusId: 0,
      inventoryAuctionId: card.inventoryAuctionId,
      bidAmount: amount,
      auctionBidStatusName: 'Winning'
    };

    card.placingBid = true;

    this.bidsSvc.add(payload).subscribe({
      next: () => {
        this.snack.open('Quick bid placed successfully.', 'OK', {
          duration: 2500
        });
        this.refreshAllBids();
      },
      error: err => {
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
        card.placingBid = false;
      }
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

  // ---------- filters & sorting ----------

  get filteredLots(): LotCard[] {
    const q = this.q.trim().toLowerCase();
    return this.lots.filter(c => {
      const hay = `${c.title} ${c.sub} ${c.auctionName ?? ''} ${
        c.makeName ?? ''
      } ${c.modelName ?? ''} ${c.yearName ?? ''} ${
        c.categoryName ?? ''
      }`.toLowerCase();
      if (q && !hay.includes(q)) return false;

      if (
        this.filters.auction &&
        (c.auctionName ?? `Auction #${c.auctionId}`) !== this.filters.auction
      )
        return false;
      if (this.filters.make && (c.makeName ?? '') !== this.filters.make)
        return false;
      if (this.filters.model && (c.modelName ?? '') !== this.filters.model)
        return false;
      if (this.filters.year && String(c.yearName ?? '') !== this.filters.year)
        return false;
      if (
        this.filters.category &&
        (c.categoryName ?? '') !== this.filters.category
      )
        return false;

      return true;
    });
  }

  get results(): LotCard[] {
    const list = [...this.filteredLots];

    const priceOf = (c: LotCard) =>
      (c.currentPrice ?? undefined) ??
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
          (a, b) =>
            parseInt(String(b.yearName || 0)) -
            parseInt(String(a.yearName || 0))
        );
      case 'year_old':
        return list.sort(
          (a, b) =>
            parseInt(String(a.yearName || 0)) -
            parseInt(String(b.yearName || 0))
        );
      case 'start_time': {
        const start = (c: LotCard) =>
          this.timeboxes.get(c.auctionId)?.startEpochMsUtc ??
          Number.MAX_SAFE_INTEGER;
        return list.sort((a, b) => start(a) - start(b));
      }
      default:
        return list; // keep default ordering
    }
  }

  clearAll(): void {
    this.q = '';
    this.filters = { auction: '', make: '', model: '', year: '', category: '' };
    this.sortBy = 'newest';
  }

  clearOne(key: keyof typeof this.filters): void {
    this.filters[key] = '';
  }

  private buildFilterOptions(): void {
    const uniq = (arr: (string | null | undefined)[]) =>
      Array.from(new Set(arr.filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b)
      );

    this.options.auctions = uniq(
      this.lots.map(l => l.auctionName ?? `Auction #${l.auctionId}`)
    );
    this.options.makes = uniq(this.lots.map(l => l.makeName));
    this.options.models = uniq(this.lots.map(l => l.modelName));
    this.options.years = uniq(this.lots.map(l => (l.yearName ?? null) as any));
    this.options.categories = uniq(this.lots.map(l => l.categoryName));
  }

  // ---------- countdown / timeboxes ----------

  private startTicker(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.tickHandle = setInterval(() => this.updateCountdowns(), 1000);
  }

  private startResync(auctionIds: number[]): void {
    this.resyncSub = interval(120000).subscribe(() => {
      this.refreshTimeboxes(auctionIds, () => this.updateCountdowns());
    });
  }

  private onVisChange = () => {
    if (document.visibilityState === 'visible') {
      const ids = Array.from(new Set(this.lots.map(l => l.auctionId)));
      this.refreshTimeboxes(ids, () => this.updateCountdowns());
    }
  };

  private wireVisibility(_auctionIds: number[]): void {
    document.addEventListener('visibilitychange', this.onVisChange);
  }

  private refreshTimeboxes(auctionIds: number[], done?: () => void) {
    if (!auctionIds.length) {
      done?.();
      return;
    }

    const lookups$ = auctionIds.map(id =>
      this.auctionsSvc
        .getTimebox(id)
        .pipe(
          catchError(() => of(null as AuctionTimebox | null)),
          map(tb => ({ id, tb }))
        )
    );

    forkJoin(lookups$).subscribe({
      next: pairs => {
        const first = pairs.find(p => !!p.tb)?.tb as
          | AuctionTimebox
          | undefined;
        if (first && Number.isFinite(first.nowEpochMsUtc as any)) {
          this.clockSkewMs = Number(first.nowEpochMsUtc) - Date.now();
        }

        for (const { id, tb } of pairs) {
          if (tb) this.timeboxes.set(id, tb);
        }

        done?.();
      },
      error: () => done?.()
    });
  }

  private updateCountdowns(): void {
    const now = Date.now() + this.clockSkewMs;

    for (const c of this.lots) {
      const tb = this.timeboxes.get(c.auctionId);
      if (!tb) {
        c.countdownState = 'scheduled';
        c.countdownText = '—';
        continue;
      }

      const start = Number(tb.startEpochMsUtc);
      const end = Number(tb.endEpochMsUtc);

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

  // ---------- bidding metrics (replicating auctions-details logic) ----------

  private applyBidMetrics(cards: LotCard[], bids: AuctionBid[]): void {
    const currentUserId = this.bidderAuth.currentUser?.userId ?? null;

    cards.forEach(card => {
      const lotId = card.inventoryAuctionId;

      const lotBids = (bids || []).filter(b => {
        const iaId =
          (b as any).inventoryAuctionId ??
          (b as any).InventoryAuctionId ??
          (b as any).inventoryauctionId;
        const aucId =
          (b as any).auctionId ??
          (b as any).AuctionId ??
          (b as any).auctionID;
        return iaId === lotId && aucId === card.auctionId;
      });

      const highestBid = lotBids.length
        ? Math.max(
            ...lotBids.map(b =>
              Number(
                (b as any).bidAmount ??
                  (b as any).BidAmount ??
                  (b as any).Amount ??
                  0
              )
            )
          )
        : null;

      const yourBids =
        currentUserId != null
          ? lotBids.filter(b => {
              const createdBy =
                (b as any).createdById ??
                (b as any).CreatedById ??
                null;
              return createdBy === currentUserId;
            })
          : [];

      const yourHighest = yourBids.length
        ? Math.max(
            ...yourBids.map(b =>
              Number(
                (b as any).bidAmount ??
                  (b as any).BidAmount ??
                  (b as any).Amount ??
                  0
              )
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

      card.isLeading =
        card.currentPrice != null &&
        card.yourMaxBid != null &&
        card.currentPrice === card.yourMaxBid &&
        !!yourHighest;

      const inc = card.bidIncrement ?? 100;
      const base =
        card.currentPrice ??
        card.auctionStartPrice ??
        card.buyNow ??
        card.reserve ??
        0;
      card.minNextBid = inc > 0 ? base + inc : null;
    });
  }

  // ---------- helpers ----------

  private buildImagesMap(
    files: InventoryDocumentFile[]
  ): Map<number, string[]> {
    const m = new Map<number, string[]>();
    const isImg = (u?: string | null, n?: string | null) => {
      const s = (u || n || '').toLowerCase();
      return ['.jpg', '.jpeg', '.png', 'jpg', 'jpeg', 'png'].some(x =>
        s.endsWith(x)
      );
    };
    (files || [])
      .filter(
        f =>
          (f.active ?? true) &&
          !!f.inventoryId &&
          !!f.documentUrl &&
          isImg(f.documentUrl!, f.documentName)
      )
      .forEach(f => {
        const list = m.get(f.inventoryId) || [];
        list.push(f.documentUrl!);
        m.set(f.inventoryId, list);
      });
    return m;
  }

  private pickRandom(arr?: string[]): string | undefined {
    if (!arr?.length) return undefined;
    const i = Math.floor(Math.random() * arr.length);
    return arr[i];
  }

  private safeParse(json?: string | null): any | null {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  trackById = (_: number, c: LotCard) => c.inventoryAuctionId ?? c.sub;
}
