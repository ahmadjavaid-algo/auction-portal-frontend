import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { forkJoin, of, interval, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Auction } from '../../../../../models/auction.model';
import { InventoryAuction } from '../../../../../models/inventoryauction.model';
import { InventoryDocumentFile } from '../../../../../models/inventorydocumentfile.model';
import { Inventory } from '../../../../../models/inventory.model';
import { Product } from '../../../../../models/product.model';
import { AuctionTimebox } from '../../../../../models/auction-timebox.model';

import { AuctionService } from '../../../../../services/auctions.service';
import { InventoryAuctionService } from '../../../../../services/inventoryauctions.service';
import { InventoryDocumentFileService } from '../../../../../services/inventorydocumentfile.service';
import { InventoryService } from '../../../../../services/inventory.service';
import { ProductsService } from '../../../../../services/products.service';

type LotCard = {
  // identity
  inventoryAuctionId: number;
  auctionId: number;
  auctionName: string | null;

  // visuals
  title: string;
  sub: string;
  imageUrl: string;

  // prices / meta
  buyNow?: number | null;
  reserve?: number | null;
  bidIncrement?: number | null;
  yearName?: string | null;
  makeName?: string | null;
  modelName?: string | null;
  categoryName?: string | null;

  // countdown
  countdownText?: string;
  countdownState?: 'scheduled' | 'live' | 'ended';
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
    MatProgressBarModule
  ],
  templateUrl: './allauctions-details.html',
  styleUrls: ['./allauctions-details.scss']
})
export class AllauctionsDetails implements OnDestroy {
  // services
  private auctionsSvc = inject(AuctionService);
  private invAucSvc   = inject(InventoryAuctionService);
  private filesSvc    = inject(InventoryDocumentFileService);
  private invSvc      = inject(InventoryService);
  private productsSvc = inject(ProductsService);

  // ui state
  loading = true;
  error: string | null = null;

  lots: LotCard[] = [];

  q = '';
  filters = { auction: '', make: '', model: '', year: '', category: '' };
  sortBy: 'newest' | 'price_low' | 'price_high' | 'year_new' | 'year_old' | 'start_time' = 'newest';

  options = {
    auctions: [] as string[],
    makes: [] as string[],
    models: [] as string[],
    years: [] as string[],
    categories: [] as string[]
  };

  // hero
  heroUrl = 'https://images.unsplash.com/photo-1517940310602-75e447f00b52?q=80&w=1400&auto=format&fit=crop';

  // timing
  private tickHandle: any = null;
  private resyncSub?: Subscription;
  private clockSkewMs = 0; // serverNow - clientNow
  private timeboxes = new Map<number, AuctionTimebox>(); // auctionId -> timebox

  ngOnInit(): void {
    this.loading = true;

    forkJoin({
      auctions: this.auctionsSvc.getList().pipe(catchError(() => of([] as Auction[]))),
      invAucs : this.invAucSvc.getList().pipe(catchError(() => of([] as InventoryAuction[]))),
      files   : this.filesSvc.getList().pipe(catchError(() => of([] as InventoryDocumentFile[]))),
      invs    : this.invSvc.getList().pipe(catchError(() => of([] as Inventory[]))),
      products: this.productsSvc.getList().pipe(catchError(() => of([] as Product[])))
    })
    .pipe(
      map(({ auctions, invAucs, files, invs, products }) => {
        const auctionMap = new Map<number, Auction>();
        (auctions || []).forEach(a => auctionMap.set(a.auctionId, a));

        // images: inventoryId -> urls[]
        const imageMap = this.buildImagesMap(files);

        // lookup maps
        const invMap = new Map<number, Inventory>();
        (invs || []).forEach(i => invMap.set(i.inventoryId, i));

        const prodMap = new Map<number, Product>();
        (products || []).forEach(p => prodMap.set(p.productId, p));

        // ALL inventory-auctions (no filtering by a specific auctionId)
        const rows = (invAucs || []).filter(x => (x.active ?? true));

        const cards: LotCard[] = rows.map(r => {
          const aid = (r as any).auctionId as number;
          const inv = invMap.get(r.inventoryId) || null;
          const prod = inv ? prodMap.get(inv.productId) || null : null;
          const snap = this.safeParse(inv?.productJSON);

          const yearName  = (prod?.yearName ?? snap?.Year ?? snap?.year) ?? null;
          const makeName  = (prod?.makeName ?? snap?.Make ?? snap?.make) ?? null;
          const modelName = (prod?.modelName ?? snap?.Model ?? snap?.model) ?? null;
          const category  = (prod?.categoryName ?? snap?.Category ?? snap?.category) ?? null;

          const titleFromMeta = [yearName, makeName, modelName].filter(Boolean).join(' ');
          const title = titleFromMeta ||
                        inv?.displayName ||
                        snap?.DisplayName || snap?.displayName ||
                        `Inventory #${r.inventoryId}`;

          const chassis = inv?.chassisNo || null;
          const sub = chassis ? `Chassis ${chassis} • #${r.inventoryId}` : `#${r.inventoryId}`;

          const cover = this.pickRandom(imageMap.get(r.inventoryId)) || this.heroUrl;
          const aucName = auctionMap.get(aid)?.auctionName ?? (auctionMap.has(aid) ? `Auction #${aid}` : null);

          return {
            inventoryAuctionId: (r as any).inventoryAuctionId,
            auctionId: aid,
            auctionName: aucName,
            title,
            sub,
            imageUrl: cover,
            buyNow: r.buyNowPrice ?? null,
            reserve: r.reservePrice ?? null,
            bidIncrement: r.bidIncrement ?? null,
            yearName, makeName, modelName, categoryName: category
          };
        });

        const firstImg = cards.find(c => !!c.imageUrl)?.imageUrl;
        if (firstImg) this.heroUrl = firstImg;

        this.lots = cards; // sort is applied later via computed getter

        // build filter menus (incl. auction names)
        this.buildFilterOptions();

        // collect distinct auctionIds for timeboxes
        const uniqAuctionIds = Array.from(new Set(this.lots.map(c => c.auctionId))).filter(Boolean) as number[];
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
      error: () => { this.error = 'Failed to load all auctions.'; this.loading = false; }
    });
  }

  ngOnDestroy(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.resyncSub?.unsubscribe();
    document.removeEventListener('visibilitychange', this.onVisChange);
  }

  /* ===== filters/sort ===== */
  get filteredLots(): LotCard[] {
    const q = this.q.trim().toLowerCase();
    return this.lots.filter(c => {
      const hay = `${c.title} ${c.sub} ${c.auctionName ?? ''} ${c.makeName ?? ''} ${c.modelName ?? ''} ${c.yearName ?? ''} ${c.categoryName ?? ''}`.toLowerCase();
      if (q && !hay.includes(q)) return false;

      if (this.filters.auction && (c.auctionName ?? `Auction #${c.auctionId}`) !== this.filters.auction) return false;
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
      (c.buyNow ?? undefined) ?? (c.reserve ?? undefined) ?? Number.POSITIVE_INFINITY;

    switch (this.sortBy) {
      case 'price_low' : return list.sort((a, b) => (priceOf(a) - priceOf(b)));
      case 'price_high': return list.sort((a, b) => (priceOf(b) - priceOf(a)));
      case 'year_new'  : return list.sort((a, b) => (parseInt(String(b.yearName||0)) - parseInt(String(a.yearName||0))));
      case 'year_old'  : return list.sort((a, b) => (parseInt(String(a.yearName||0)) - parseInt(String(b.yearName||0))));
      case 'start_time': {
        const start = (c: LotCard) => this.timeboxes.get(c.auctionId)?.startEpochMsUtc ?? Number.MAX_SAFE_INTEGER;
        return list.sort((a, b) => (start(a) - start(b)));
      }
      default: return list; // keep original insertion order for “newest” (or add createdDate-based sort if you prefer)
    }
  }

  clearAll(): void {
    this.q = '';
    this.filters = { auction: '', make: '', model: '', year: '', category: '' };
    this.sortBy = 'newest';
  }
  clearOne(key: keyof typeof this.filters): void { this.filters[key] = ''; }

  private buildFilterOptions(): void {
    const uniq = (arr: (string | null | undefined)[]) =>
      Array.from(new Set(arr.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));

    this.options.auctions   = uniq(this.lots.map(l => l.auctionName ?? `Auction #${l.auctionId}`));
    this.options.makes      = uniq(this.lots.map(l => l.makeName));
    this.options.models     = uniq(this.lots.map(l => l.modelName));
    this.options.years      = uniq(this.lots.map(l => (l.yearName ?? null) as any));
    this.options.categories = uniq(this.lots.map(l => l.categoryName));
  }

  /* ===== countdown & resync ===== */
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
  if (!auctionIds.length) { done?.(); return; }

  // Build an array of observables that each return { id, tb }
  const lookups$ = auctionIds.map(id =>
    this.auctionsSvc.getTimebox(id).pipe(
      catchError(() => of(null as AuctionTimebox | null)),
      map(tb => ({ id, tb }))
    )
  );

  forkJoin(lookups$).subscribe({
    next: (pairs) => {
      // use the first non-null timebox to compute skew
      const first = pairs.find(p => !!p.tb)?.tb as AuctionTimebox | undefined;
      if (first && Number.isFinite(first.nowEpochMsUtc as any)) {
        this.clockSkewMs = Number(first.nowEpochMsUtc) - Date.now();
      }

      // stash all returned timeboxes by auctionId
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
      if (!tb) { c.countdownState = 'scheduled'; c.countdownText = '—'; continue; }

      const start = Number(tb.startEpochMsUtc);
      const end   = Number(tb.endEpochMsUtc);

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
    const hh = Math.floor(s / 3600); s -= hh * 3600;
    const mm = Math.floor(s / 60);   s -= mm * 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${hh}:${pad(mm)}:${pad(s)}`;
  }

  /* ===== helpers ===== */
  private buildImagesMap(files: InventoryDocumentFile[]): Map<number, string[]> {
    const m = new Map<number, string[]>();
    const isImg = (u?: string | null, n?: string | null) => {
      const s = (u || n || '').toLowerCase();
      return ['.jpg', '.jpeg', '.png', 'jpg', 'jpeg', 'png'].some(x => s.endsWith(x));
    };
    (files || [])
      .filter(f => (f.active ?? true) && !!f.inventoryId && !!f.documentUrl && isImg(f.documentUrl!, f.documentName))
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
    try { return JSON.parse(json); } catch { return null; }
  }

  trackById = (_: number, c: LotCard) => c.inventoryAuctionId ?? c.sub;
}
