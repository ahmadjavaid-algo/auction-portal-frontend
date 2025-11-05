import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormsModule } from '@angular/forms';

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

type SpecRow = { label: string; value: string | number | null | undefined };

type RelatedCard = {
  link: any[];
  title: string;
  imageUrl: string;
  sub: string;
  auctionStartPrice?: number | null;
  buyNow?: number | null;
  reserve?: number | null;
};

@Component({
  selector: 'app-product-details',
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
  templateUrl: './product-details.html',
  styleUrls: ['./product-details.scss']
})
export class ProductDetails {
  private route = inject(ActivatedRoute);

  private auctionsSvc = inject(AuctionService);
  private invAucSvc   = inject(InventoryAuctionService);
  private filesSvc    = inject(InventoryDocumentFileService);
  private invSvc      = inject(InventoryService);
  private productsSvc = inject(ProductsService);

  auctionId!: number;
  inventoryAuctionId!: number;

  loading = true;
  error: string | null = null;

  auction: Auction | null = null;
  lot: InventoryAuction | null = null;
  inventory: Inventory | null = null;
  product: Product | null = null;

  images: string[] = [];
  activeImage = '';

  title = 'Listing';
  subtitle = '';
  money = (n?: number | null) =>
    n == null
      ? '—'
      : n.toLocaleString(undefined, {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0
        });

  specs: SpecRow[] = [];
  related: RelatedCard[] = [];

  ngOnInit(): void {
    this.route.paramMap.subscribe(pm => {
      this.auctionId = Number(pm.get('auctionId') || 0);
      this.inventoryAuctionId = Number(pm.get('inventoryAuctionId') ?? pm.get('id'));

      this.load();
    });
  }

  private load(): void {
    if (!this.inventoryAuctionId) {
      this.error = 'Invalid listing id.';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;
    this.images = [];
    this.activeImage = '';
    this.related = [];
    this.specs = [];
    this.title = 'Listing';
    this.subtitle = '';
    this.auction = null;
    this.lot = null;
    this.inventory = null;
    this.product = null;

    forkJoin({
      auctions : this.auctionsSvc.getList().pipe(catchError(() => of([] as Auction[]))),
      invAucs  : this.invAucSvc.getList().pipe(catchError(() => of([] as InventoryAuction[]))),
      files    : this.filesSvc.getList().pipe(catchError(() => of([] as InventoryDocumentFile[]))),
      invs     : this.invSvc.getList().pipe(catchError(() => of([] as Inventory[]))),
      products : this.productsSvc.getList().pipe(catchError(() => of([] as Product[])))
    })
      .pipe(
        map(({ auctions, invAucs, files, invs, products }) => {
          
          this.lot =
            (invAucs || []).find(
              a =>
                ((a as any).inventoryAuctionId ?? (a as any).inventoryauctionId) ===
                this.inventoryAuctionId
            ) || null;
          if (!this.lot) throw new Error('Listing not found');

          
          const currentAuctionId = (this.lot as any).auctionId ?? this.auctionId;
          this.auctionId = currentAuctionId;
          this.auction = (auctions || []).find(a => a.auctionId === currentAuctionId) || null;

          
          this.inventory =
            (invs || []).find(i => i.inventoryId === this.lot!.inventoryId) || null;
          this.product = this.inventory
            ? (products || []).find(p => p.productId === this.inventory!.productId) || null
            : null;

          
          const snap = this.safeParse(this.inventory?.productJSON);
          const year = this.product?.yearName ?? snap?.Year ?? snap?.year;
          const make = this.product?.makeName ?? snap?.Make ?? snap?.make;
          const model = this.product?.modelName ?? snap?.Model ?? snap?.model;
          this.title =
            [year, make, model].filter(Boolean).join(' ') ||
            (this.inventory?.displayName ?? 'Listing');

          const chassis = this.inventory?.chassisNo || snap?.Chassis || snap?.chassis;
          this.subtitle = chassis
            ? `Chassis ${chassis} • Lot #${
                (this.lot as any).inventoryAuctionId ?? ''
              }`
            : `Lot #${(this.lot as any).inventoryAuctionId ?? ''}`;

          
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
          if (this.images.length) this.activeImage = this.images[0];

          
          const colorExterior = snap?.ExteriorColor ?? snap?.exteriorColor ?? null;
          const colorInterior = snap?.InteriorColor ?? snap?.interiorColor ?? null;
          const drivetrain = snap?.Drivetrain ?? snap?.drivetrain ?? null;
          const transmission = snap?.Transmission ?? snap?.transmission ?? null;
          const bodyStyle = snap?.BodyStyle ?? snap?.bodyStyle ?? null;
          const engine = snap?.Engine ?? snap?.engine ?? null;
          const mileage = snap?.Mileage ?? snap?.mileage ?? null;
          const location = snap?.Location ?? snap?.location ?? null;
          const titleStatus = snap?.TitleStatus ?? snap?.titleStatus ?? null;
          const sellerType = snap?.SellerType ?? snap?.sellerType ?? null;
          const categoryName =
            this.product?.categoryName ?? snap?.Category ?? snap?.category ?? null;

          const rows: SpecRow[] = [
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
          this.specs = rows;

          
          const allLots = (invAucs || []).filter(x => x.active ?? true);
          const makeName = this.product?.makeName ?? make ?? '';
          const catName = categoryName ?? '';
          const byScore = (x: InventoryAuction) => {
            const inv = (invs || []).find(i => i.inventoryId === x.inventoryId) || null;
            const prod = inv
              ? (products || []).find(p => p.productId === inv.productId) || null
              : null;
            const sameAuction =
              ((x as any).auctionId ?? 0) === currentAuctionId ? 2 : 0;
            const sameMake = (prod?.makeName ?? '') === makeName ? 2 : 0;
            const sameCat = (prod?.categoryName ?? '') === catName ? 1 : 0;
            return sameAuction + sameMake + sameCat;
          };

          const imageMap = new Map<number, string[]>();
          (files || []).forEach(f => {
            if (!f.inventoryId || !(f.active ?? true) || !f.documentUrl) return;
            const arr = imageMap.get(f.inventoryId) || [];
            arr.push(f.documentUrl);
            imageMap.set(f.inventoryId, arr);
          });

          this.related = allLots
            .filter(
              x =>
                ((x as any).inventoryAuctionId ?? (x as any).inventoryauctionId) !==
                this.inventoryAuctionId
            )
            .map(x => {
              const inv =
                (invs || []).find(i => i.inventoryId === x.inventoryId) || null;
              const prod = inv
                ? (products || []).find(p => p.productId === inv.productId) || null
                : null;
              const snap2 = this.safeParse(inv?.productJSON);
              const yy = prod?.yearName ?? snap2?.Year ?? '';
              const mk = prod?.makeName ?? snap2?.Make ?? '';
              const md = prod?.modelName ?? snap2?.Model ?? '';
              const title =
                [yy, mk, md].filter(Boolean).join(' ') ||
                (inv?.displayName ?? 'Listing');
              const img =
                (imageMap.get(x.inventoryId) || [])[0] || (this.images[0] || '');
              const chassis2 = inv?.chassisNo || snap2?.Chassis || '';
              const sub = chassis2
                ? `Chassis ${chassis2} • #${
                    (x as any).inventoryAuctionId ?? ''
                  }`
                : `#${(x as any).inventoryAuctionId ?? ''}`;
              return {
                link: [
                  '/bidder/auctions',
                  (x as any).auctionId ?? currentAuctionId,
                  (x as any).inventoryAuctionId ??
                    (x as any).inventoryauctionId
                ],
                title,
                imageUrl: img,
                sub,
                auctionStartPrice: (x as any).auctionStartPrice ?? null,
                buyNow: x.buyNowPrice ?? null,
                reserve: x.reservePrice ?? null,
                _score: byScore(x)
              } as any;
            })
            .sort((a: any, b: any) => b._score - a._score)
            .slice(0, 6)
            .map(({ _score, ...rest }: any) => rest as RelatedCard);

          try {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch {}
        })
      )
      .subscribe({
        next: () => (this.loading = false),
        error: () => {
          this.error = 'Failed to load listing.';
          this.loading = false;
        }
      });
  }

  selectImage(url: string): void {
    this.activeImage = url;
  }

  private safeParse(json?: string | null): any | null {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  get lotId(): number | null {
    const l = this.lot as any;
    return l?.inventoryAuctionId ?? l?.inventoryauctionId ?? null;
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
