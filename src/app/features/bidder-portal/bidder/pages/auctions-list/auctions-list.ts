// src/app/pages/bidder/auctions/auctions-list/auctions-list.ts
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Auction } from '../../../../../models/auction.model';
import { InventoryAuction } from '../../../../../models/inventoryauction.model';
import { InventoryDocumentFile } from '../../../../../models/inventorydocumentfile.model';

import { AuctionService } from '../../../../../services/auctions.service';
import { InventoryAuctionService } from '../../../../../services/inventoryauctions.service';
import { InventoryDocumentFileService } from '../../../../../services/inventorydocumentfile.service';

import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

type AuctionCard = {
  auction: Auction;
  coverUrl: string;
  lots: number;
  start?: Date | null;
  end?: Date | null;
  status?: string | null;

  // Details-theme badges
  countdownText?: string;
  countdownState?: 'scheduled' | 'live' | 'ended';
};

@Component({
  selector: 'app-auctions-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  templateUrl: './auctions-list.html',
  styleUrls: ['./auctions-list.scss']
})
export class AuctionsList implements OnInit, OnDestroy {
  private auctionsSvc = inject(AuctionService);
  private invAucSvc = inject(InventoryAuctionService);
  private filesSvc = inject(InventoryDocumentFileService);

  loading = true;
  error: string | null = null;

  cards: AuctionCard[] = [];

  // HERO (dashboard-like full-bleed)
  heroUrl =
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920';

  // Toolbar
  q = '';
  statusFilter: 'all' | 'live' | 'scheduled' | 'ended' = 'all';
  sortBy: 'newest' | 'starting_soon' | 'ending_soon' | 'lots_high' = 'newest';

  private tickHandle: any = null;

  private fallback =
    'https://images.unsplash.com/photo-1517940310602-75e447f00b52?q=80&w=1200&auto=format&fit=crop';

  ngOnInit(): void {
    this.loading = true;
    this.error = null;

    forkJoin({
      auctions: this.auctionsSvc.getList().pipe(catchError(() => of([] as Auction[]))),
      invAucs: this.invAucSvc.getList().pipe(catchError(() => of([] as InventoryAuction[]))),
      files: this.filesSvc.getList().pipe(catchError(() => of([] as InventoryDocumentFile[])))
    })
      .pipe(
        map(({ auctions, invAucs, files }) => {
          const activeAuctions = (auctions || []).filter(a => (a as any).active ?? true);

          // auctionId -> inventoryId[]
          const byAuction = new Map<number, number[]>();
          (invAucs || []).forEach(ia => {
            const aid = (ia as any).auctionId as number;
            if (!aid) return;
            const list = byAuction.get(aid) || [];
            list.push((ia as any).inventoryId);
            byAuction.set(aid, list);
          });

          // inventoryId -> [thumbUrls]
          const imageMap = this.buildImagesMap(files);

          const cards: AuctionCard[] = activeAuctions
            .sort((a, b) =>
              this.dateDesc(
                (a as any).createdDate || (a as any).modifiedDate,
                (b as any).createdDate || (b as any).modifiedDate
              )
            )
            .map(a => {
              const invIds = byAuction.get((a as any).auctionId) || [];
              const allImages = invIds.flatMap(id => imageMap.get(id) || []);
              const cover = this.pickRandom(allImages) || this.fallback;

              return {
                auction: a,
                coverUrl: cover,
                lots: invIds.length,
                start: (a as any).startDateTime ? new Date((a as any).startDateTime) : null,
                end: (a as any).endDateTime ? new Date((a as any).endDateTime) : null,
                status: (a as any).auctionStatusName || (a as any).auctionStatusCode || null,
                countdownText: '—',
                countdownState: 'scheduled'
              };
            });

          // pick hero
          const firstImg = cards.find(c => !!c.coverUrl)?.coverUrl;
          if (firstImg) this.heroUrl = firstImg;

          this.cards = cards;

          // initial badge compute
          this.updateCountdowns();

          // ticker
          this.startTicker();
        })
      )
      .subscribe({
        next: () => {
          this.loading = false;
        },
        error: () => {
          this.error = 'Failed to load auctions.';
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
  }

  // ===== Derived stats =====
  get liveCount(): number {
    return this.cards.filter(c => c.countdownState === 'live').length;
  }
  get scheduledCount(): number {
    return this.cards.filter(c => c.countdownState === 'scheduled').length;
  }
  get endedCount(): number {
    return this.cards.filter(c => c.countdownState === 'ended').length;
  }

  // ===== Filtering & Sorting =====
  get filteredCards(): AuctionCard[] {
    const q = this.q.trim().toLowerCase();

    return this.cards.filter(c => {
      const name =
        (c.auction as any).auctionName || `Auction #${(c.auction as any).auctionId}`;
      const hay = `${name} ${c.status ?? ''} ${c.lots} lots`.toLowerCase();

      if (q && !hay.includes(q)) return false;

      if (this.statusFilter !== 'all') {
        if ((c.countdownState || 'scheduled') !== this.statusFilter) return false;
      }

      return true;
    });
  }

  get results(): AuctionCard[] {
    const list = [...this.filteredCards];

    const startMs = (c: AuctionCard) => (c.start ? c.start.getTime() : Number.POSITIVE_INFINITY);
    const endMs = (c: AuctionCard) => (c.end ? c.end.getTime() : Number.POSITIVE_INFINITY);

    switch (this.sortBy) {
      case 'starting_soon':
        return list.sort((a, b) => startMs(a) - startMs(b));
      case 'ending_soon':
        return list.sort((a, b) => endMs(a) - endMs(b));
      case 'lots_high':
        return list.sort((a, b) => (b.lots || 0) - (a.lots || 0));
      default:
        return list.sort((a, b) =>
          this.dateDesc(
            ((a.auction as any).createdDate || (a.auction as any).modifiedDate) ?? null,
            ((b.auction as any).createdDate || (b.auction as any).modifiedDate) ?? null
          )
        );
    }
  }

  clearAll(): void {
    this.q = '';
    this.statusFilter = 'all';
    this.sortBy = 'newest';
  }

  // ===== Countdown / State =====
  private startTicker(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.tickHandle = setInterval(() => this.updateCountdowns(), 1000);
  }

  private updateCountdowns(): void {
    const now = Date.now();

    for (const c of this.cards) {
      const s = c.start?.getTime() ?? null;
      const e = c.end?.getTime() ?? null;

      if (!s || !e) {
        c.countdownState = 'scheduled';
        c.countdownText = '—';
        continue;
      }

      if (now < s) {
        c.countdownState = 'scheduled';
        c.countdownText = 'Starts ' + this.fmtCountdown(s - now);
      } else if (now <= e) {
        c.countdownState = 'live';
        c.countdownText = this.fmtCountdown(e - now);
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

  // ===== Images (unchanged logic) =====
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
          (f as any).documentThumbnailUrl ??
          (f as any).DocumentThumbnailUrl ??
          null;

        const name =
          (f as any).documentName ??
          (f as any).DocumentName ??
          null;

        return active && !!invId && !!thumbUrl && isImg(thumbUrl, name);
      })
      .forEach(f => {
        const invId = (f as any).inventoryId ?? (f as any).InventoryId;

        const thumbUrl =
          (f as any).documentThumbnailUrl ??
          (f as any).DocumentThumbnailUrl ??
          null;

        if (!thumbUrl) return;

        const list = m.get(invId) || [];
        list.push(thumbUrl);
        m.set(invId, list);
      });

    return m;
  }

  private pickRandom(arr: string[]): string | undefined {
    if (!arr?.length) return undefined;
    const i = Math.floor(Math.random() * arr.length);
    return arr[i];
  }

  private dateDesc(a?: string | null, b?: string | null): number {
    const ta = a ? Date.parse(a) : 0;
    const tb = b ? Date.parse(b) : 0;
    return tb - ta;
  }

  formatRange(s?: Date | null, e?: Date | null): string {
    const a = s
      ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(s)
      : '—';
    const b = e
      ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(e)
      : '—';
    return `${a} → ${b}`;
  }

  trackByAuction = (_: number, c: AuctionCard) => (c.auction as any).auctionId ?? c.coverUrl;
}
