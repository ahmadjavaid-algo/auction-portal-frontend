import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { forkJoin, of } from 'rxjs';
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

type LotCard = {
  invAuc: InventoryAuction;
  inventory: Inventory | null;
  title: string;            // "2023 Mercedes G63" (or fallbacks)
  sub: string;              // "Chassis 123 • #45" etc.
  imageUrl: string;
  buyNow?: number | null;
  reserve?: number | null;
  bidIncrement?: number | null;
};

@Component({
  selector: 'app-auctions-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  templateUrl: './auctions-details.html',
  styleUrls: ['./auctions-details.scss']
})
export class AuctionsDetails {
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

  heroUrl = 'https://images.unsplash.com/photo-1517940310602-75e447f00b52?q=80&w=1200&auto=format&fit=crop';
  lots: LotCard[] = [];

  ngOnInit(): void {
    this.auctionId = Number(this.route.snapshot.paramMap.get('auctionId') || this.route.snapshot.paramMap.get('id'));
    if (!this.auctionId) {
      this.error = 'Invalid auction id.';
      this.loading = false;
      return;
    }

    this.loading = true;

    forkJoin({
      auctions : this.auctionsSvc.getList().pipe(catchError(() => of([] as Auction[]))),
      invAucs  : this.invAucSvc.getList().pipe(catchError(() => of([] as InventoryAuction[]))),
      files    : this.filesSvc.getList().pipe(catchError(() => of([] as InventoryDocumentFile[]))),
      invs     : this.invSvc.getList().pipe(catchError(() => of([] as Inventory[]))),
      products : this.productsSvc.getList().pipe(catchError(() => of([] as Product[])))
    })
    .pipe(
      map(({ auctions, invAucs, files, invs, products }) => {
        // find auction row
        this.auction = (auctions || []).find(a => a.auctionId === this.auctionId) || null;

        // inventories in this auction
        const rows = (invAucs || []).filter(x => (x as any).auctionId === this.auctionId && (x.active ?? true));

        // map: inventoryId -> images[]
        const imageMap = this.buildImagesMap(files);

        // map: inventoryId -> inventory
        const invMap = new Map<number, Inventory>();
        (invs || []).forEach(i => invMap.set(i.inventoryId, i));

        // map: productId -> product (for Year/Make/Model/Category names)
        const prodMap = new Map<number, Product>();
        (products || []).forEach(p => prodMap.set(p.productId, p));

        // build lot cards
        const cards: LotCard[] = rows.map(r => {
          const inv = invMap.get(r.inventoryId) || null;
          const prod = inv ? prodMap.get(inv.productId) || null : null;
          const snap = this.safeParse(inv?.productJSON);

          // Prefer true Product metadata -> "YYYY Make Model"
          const y = (prod?.yearName ?? snap?.Year ?? snap?.year) ?? '';
          const mk = (prod?.makeName ?? snap?.Make ?? snap?.make) ?? '';
          const md = (prod?.modelName ?? snap?.Model ?? snap?.model) ?? '';

          const titleFromMeta = [y, mk, md].filter(Boolean).join(' ');
          const title =
            titleFromMeta ||
            inv?.displayName ||
            snap?.DisplayName || snap?.displayName ||
            `Inventory #${r.inventoryId}`;

          const chassis = inv?.chassisNo || null;
          const sub = chassis ? `Chassis ${chassis} • #${r.inventoryId}` : `#${r.inventoryId}`;

          const cover = this.pickRandom(imageMap.get(r.inventoryId)) || this.heroUrl;

          return {
            invAuc: r,
            inventory: inv,
            title,
            sub,
            imageUrl: cover,
            buyNow: r.buyNowPrice ?? null,
            reserve: r.reservePrice ?? null,
            bidIncrement: r.bidIncrement ?? null
          };
        });

        // hero image from first card that has an image
        const firstImg = cards.find(c => !!c.imageUrl)?.imageUrl;
        if (firstImg) this.heroUrl = firstImg;

        // newest first by created/modified
        this.lots = cards.sort((a, b) =>
          this.dateDesc(
            (a.inventory?.modifiedDate || a.inventory?.createdDate) ?? null,
            (b.inventory?.modifiedDate || b.inventory?.createdDate) ?? null
          )
        );
      })
    )
    .subscribe({
      next: () => { this.loading = false; },
      error: () => { this.error = 'Failed to load auction details.'; this.loading = false; }
    });
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

  private dateDesc(a?: string | null, b?: string | null): number {
    const ta = a ? Date.parse(a) : 0;
    const tb = b ? Date.parse(b) : 0;
    return tb - ta;
  }

  private safeParse(json?: string | null): any | null {
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
  }

  formatRange(a?: string | Date | null, b?: string | Date | null): string {
    const s = a ? new Date(a) : null;
    const e = b ? new Date(b) : null;
    const fmt = (d: Date) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
    return `${s ? fmt(s) : '—'} → ${e ? fmt(e) : '—'}`;
  }

  money(n?: number | null): string {
    if (n == null) return '—';
    return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  }
}
