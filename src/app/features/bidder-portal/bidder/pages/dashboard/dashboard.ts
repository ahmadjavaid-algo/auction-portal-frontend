import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { BidderAuthService } from '../../../../../services/bidderauth';
import { InventoryAuctionService } from '../../../../../services/inventoryauctions.service';
import { InventoryDocumentFileService } from '../../../../../services/inventorydocumentfile.service';
import { InventoryService } from '../../../../../services/inventory.service';

import { InventoryAuction } from '../../../../../models/inventoryauction.model';
import { InventoryDocumentFile } from '../../../../../models/inventorydocumentfile.model';
import { Inventory } from '../../../../../models/inventory.model';

import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

type Slide = {
  auction: InventoryAuction;
  imageUrl: string | null;
  year?: string | number | null;
  make?: string | null;
  model?: string | null;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard {
  readonly Math = Math;

  private auth = inject(BidderAuthService);
  private auctionSvc = inject(InventoryAuctionService);
  private fileSvc = inject(InventoryDocumentFileService);
  private inventorySvc = inject(InventoryService);

  loading = true;
  error: string | null = null;

  slides: Slide[] = [];
  index = 0;

  // fallback if no image is found
  private fallbackHero =
    'https://carwow-uk-wp-3.imgix.net/GT-R-driving-front.jpg';

  get adminName(): string {
    const u = this.auth.currentUser;
    if (!u) return 'Admin';
    const name = [u.firstName].filter(Boolean).join(' ').trim();
    return name || u.userName || 'Admin';
  }

  ngOnInit(): void {
    this.loading = true;

    forkJoin({
      auctions: this.auctionSvc
        .getList()
        .pipe(catchError(() => of([] as InventoryAuction[]))),
      files: this.fileSvc
        .getList()
        .pipe(catchError(() => of([] as InventoryDocumentFile[])))
    })
      .pipe(
        switchMap(({ auctions, files }) => {
          const active = (auctions || []).filter(a => a.active ?? true);

          // newest 10
          const recent = [...active]
            .sort((a, b) =>
              this.dateDesc(
                a.createdDate || a.modifiedDate,
                b.createdDate || b.modifiedDate
              )
            )
            .slice(0, 10);

          const imagesMap = this.buildImagesMap(files);

          const baseSlides: Slide[] = recent.map(a => ({
            auction: a,
            imageUrl: this.pickRandom(imagesMap.get(a.inventoryId)) ?? null
          }));

          const calls = baseSlides.map(s =>
            this.inventorySvc
              .getById(s.auction.inventoryId)
              .pipe(catchError(() => of(null as Inventory | null)))
          );

          if (!calls.length) return of(baseSlides);

          return forkJoin(calls).pipe(
            map((inventories: (Inventory | null)[]) => {
              inventories.forEach((inv, i) => {
                const snap = this.safeParse(inv?.productJSON);
                baseSlides[i].year = snap?.Year ?? snap?.year ?? null;
                baseSlides[i].make = snap?.Make ?? snap?.make ?? null;
                baseSlides[i].model = snap?.Model ?? snap?.model ?? null;
              });
              return baseSlides;
            })
          );
        })
      )
      .subscribe({
        next: slides => {
          this.slides = slides ?? [];
          this.index = 0;
          this.loading = false;
        },
        error: () => {
          this.error = 'Failed to load dashboard.';
          this.loading = false;
        }
      });
  }

  /* ===== helpers ===== */

  private isImageFile(f: InventoryDocumentFile): boolean {
    const url = (f.documentUrl || '').toLowerCase();
    const name = (f.documentName || '').toLowerCase();

    const extFromUrl = url.match(/\.(\w+)(?:\?|#|$)/)?.[1] || '';
    const extFromName = name.match(/\.(\w+)(?:\?|#|$)/)?.[1] || '';

    const ext = (extFromUrl || extFromName).replace(/[^a-z0-9]/g, '');
    const ok = ['jpg', 'jpeg', 'png', 'webp'];

    return !!url && (ok.includes(ext) || ok.some(e => url.endsWith('.' + e)));
  }

  private buildImagesMap(files: InventoryDocumentFile[]): Map<number, string[]> {
    const map = new Map<number, string[]>();

    (files || [])
      .filter(
        f =>
          (f.active ?? true) &&
          !!f.inventoryId &&
          !!f.documentUrl &&
          this.isImageFile(f)
      )
      .forEach(f => {
        const list = map.get(f.inventoryId) || [];
        list.push(f.documentUrl!);
        map.set(f.inventoryId, list);
      });

    return map;
  }

  private pickRandom(arr?: string[]): string | undefined {
    if (!arr || !arr.length) return undefined;
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

  get current(): Slide | null {
    return this.slides.length ? this.slides[this.index] : null;
  }

  get bgUrl(): string {
    const url = this.current?.imageUrl || this.fallbackHero;
    return `url('${url}')`;
  }

  prev(): void {
    if (!this.slides.length) return;
    this.index = (this.index - 1 + this.slides.length) % this.slides.length;
  }

  next(): void {
    if (!this.slides.length) return;
    this.index = (this.index + 1) % this.slides.length;
  }

  formatMoney(n?: number | null): string {
    if (n == null) return '$0';
    return n.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
  }
}
