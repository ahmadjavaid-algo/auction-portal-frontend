import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

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

import { AuctionService } from '../../../../../services/auctions.service';
import { InventoryAuctionService } from '../../../../../services/inventoryauctions.service';
import { InventoryDocumentFileService } from '../../../../../services/inventorydocumentfile.service';
import { InventoryService } from '../../../../../services/inventory.service';
import { ProductsService } from '../../../../../services/products.service';
import { AuctionTimebox } from '../../../../../models/auction-timebox.model';

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
    MatProgressBarModule
  ],
  templateUrl: './auctions-details.html',
  styleUrls: ['./auctions-details.scss']
})
export class AuctionsDetails implements OnDestroy {
  private route = inject(ActivatedRoute);

  private auctionsSvc = inject(AuctionService);
  private invAucSvc   = inject(InventoryAuctionService);
  private filesSvc    = inject(InventoryDocumentFileService);
  private invSvc      = inject(InventoryService);
  private productsSvc = inject(ProductsService);

  loading = true;
  error: string | null = null;

  auctionId!: number;
  auction: Auction | null = null;

  heroUrl =
    'https://images.unsplash.com/photo-1517940310602-75e447f00b52?q=80&w=1400&auto=format&fit=crop';

  lots: LotCard[] = [];

  q = '';
  filters = { make: '', model: '', year: '', category: '' };
  sortBy: 'newest' | 'price_low' | 'price_high' | 'year_new' | 'year_old' = 'newest';
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

    forkJoin({
      timebox : this.auctionsSvc
        .getTimebox(this.auctionId)
        .pipe(catchError(() => of(null as AuctionTimebox | null))),
      auctions: this.auctionsSvc
        .getList()
        .pipe(catchError(() => of([] as Auction[]))),
      invAucs : this.invAucSvc
        .getList()
        .pipe(catchError(() => of([] as InventoryAuction[]))),
      files   : this.filesSvc
        .getList()
        .pipe(catchError(() => of([] as InventoryDocumentFile[]))),
      invs    : this.invSvc
        .getList()
        .pipe(catchError(() => of([] as Inventory[]))),
      products: this.productsSvc
        .getList()
        .pipe(catchError(() => of([] as Product[])))
    })
      .pipe(
        map(({ timebox, auctions, invAucs, files, invs, products }) => {
          if (timebox) {
            this.auctionStartUtcMs = Number(timebox.startEpochMsUtc);
            this.auctionEndUtcMs = Number(timebox.endEpochMsUtc);
            if (Number.isFinite(timebox.nowEpochMsUtc)) {
              this.clockSkewMs = Number(timebox.nowEpochMsUtc) - Date.now();
            }
          } else {
            this.clockSkewMs = 0;
          }

          this.auction =
            (auctions || []).find(a => a.auctionId === this.auctionId) || null;

          const rows = (invAucs || []).filter(
            x => (x as any).auctionId === this.auctionId && (x.active ?? true)
          );
          const imageMap = this.buildImagesMap(files);

          const invMap = new Map<number, Inventory>();
          (invs || []).forEach(i => invMap.set(i.inventoryId, i));

          const prodMap = new Map<number, Product>();
          (products || []).forEach(p => prodMap.set(p.productId, p));

          const cards: LotCard[] = rows.map(r => {
            const inv = invMap.get(r.inventoryId) || null;
            const prod = inv ? prodMap.get(inv.productId) || null : null;
            const snap = this.safeParse(inv?.productJSON);

            const yearName =
              (prod?.yearName ?? snap?.Year ?? snap?.year) ?? null;
            const makeName =
              (prod?.makeName ?? snap?.Make ?? snap?.make) ?? null;
            const modelName =
              (prod?.modelName ?? snap?.Model ?? snap?.model) ?? null;
            const categoryName =
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

            const cover = this.pickRandom(imageMap.get(r.inventoryId)) || this.heroUrl;

            return {
              invAuc: r,
              inventory: inv,
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
              categoryName
            };
          });

          const firstImg = cards.find(c => !!c.imageUrl)?.imageUrl;
          if (firstImg) this.heroUrl = firstImg;

          this.lots = cards.sort((a, b) =>
            this.dateDesc(
              (a.inventory?.modifiedDate || a.inventory?.createdDate) ?? null,
              (b.inventory?.modifiedDate || b.inventory?.createdDate) ?? null
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
  }

  
  get filteredLots(): LotCard[] {
    const q = this.q.trim().toLowerCase();
    return this.lots.filter(c => {
      const hay = `${c.title} ${c.sub} ${c.makeName ?? ''} ${c.modelName ?? ''} ${
        c.yearName ?? ''
      } ${c.categoryName ?? ''}`.toLowerCase();
      if (q && !hay.includes(q)) return false;

      if (this.filters.make && (c.makeName ?? '') !== this.filters.make) {
        return false;
      }
      if (this.filters.model && (c.modelName ?? '') !== this.filters.model) {
        return false;
      }
      if (this.filters.year && String(c.yearName ?? '') !== this.filters.year) {
        return false;
      }
      if (
        this.filters.category &&
        (c.categoryName ?? '') !== this.filters.category
      ) {
        return false;
      }

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
      default:
        return list.sort((a, b) =>
          this.dateDesc(
            (a.inventory?.modifiedDate || a.inventory?.createdDate) ?? null,
            (b.inventory?.modifiedDate || b.inventory?.createdDate) ?? null
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
      Array.from(new Set(arr.filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b)
      );

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
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(d);
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
    (c.invAuc as any).inventoryAuctionId ?? c.sub;
}
