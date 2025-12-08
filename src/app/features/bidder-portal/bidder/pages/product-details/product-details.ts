import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule } from '@angular/forms';

import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Auction } from '../../../../../models/auction.model';
import { InventoryAuction } from '../../../../../models/inventoryauction.model';
import { InventoryDocumentFile } from '../../../../../models/inventorydocumentfile.model';
import { Inventory } from '../../../../../models/inventory.model';
import { Product } from '../../../../../models/product.model';
import { InspectionType } from '../../../../../models/inspectiontype.model';
import { InspectionCheckpoint } from '../../../../../models/inspectioncheckpoint.model';
import { Inspection } from '../../../../../models/inspection.model';

import { AuctionService } from '../../../../../services/auctions.service';
import { InventoryAuctionService } from '../../../../../services/inventoryauctions.service';
import { InventoryDocumentFileService } from '../../../../../services/inventorydocumentfile.service';
import { InventoryService } from '../../../../../services/inventory.service';
import { ProductsService } from '../../../../../services/products.service';
import { InspectionTypesService } from '../../../../../services/inspectiontypes.service';
import { InspectionCheckpointsService } from '../../../../../services/inspectioncheckpoints.service';
import { InspectionsService } from '../../../../../services/inspection.service';

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

interface InspectionCheckpointRow {
  inspectionId?: number;
  inspectionTypeId: number;
  inspectionTypeName: string;
  inspectionCheckpointId: number;
  inspectionCheckpointName: string;
  inputType?: string | null;
  resultValue: string;
  /** Parsed image URLs when inputType === 'image' */
  imageUrls?: string[];
}

interface InspectionTypeGroupForUI {
  inspectionTypeId: number;
  inspectionTypeName: string;
  weightage?: number | null;
  checkpoints: InspectionCheckpointRow[];
}

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
    MatProgressBarModule,
    MatDividerModule,
    MatTabsModule
  ],
  templateUrl: './product-details.html',
  styleUrls: ['./product-details.scss']
})
export class ProductDetails {
  private route = inject(ActivatedRoute);

  private auctionsSvc = inject(AuctionService);
  private invAucSvc = inject(InventoryAuctionService);
  private filesSvc = inject(InventoryDocumentFileService);
  private invSvc = inject(InventoryService);
  private productsSvc = inject(ProductsService);

  private inspTypesSvc = inject(InspectionTypesService);
  private cpSvc = inject(InspectionCheckpointsService);
  private inspectionsSvc = inject(InspectionsService);

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

  // Inspection report (read-only for bidders)
  allTypes: InspectionType[] = [];
  allCheckpoints: InspectionCheckpoint[] = [];
  reportGroups: InspectionTypeGroupForUI[] = [];
  reportLoading = false;
  reportLoaded = false;

  // shared image viewer (for inspection checkpoint images)
  selectedImageGallery: string[] = [];
  selectedImageIndex = 0;
  showImageViewer = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe(pm => {
      this.auctionId = Number(pm.get('auctionId') || 0);
      this.inventoryAuctionId = Number(
        pm.get('inventoryAuctionId') ?? pm.get('id')
      );

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

    // reset inspection state when listing changes
    this.reportGroups = [];
    this.reportLoaded = false;
    this.reportLoading = false;

    forkJoin({
      auctions: this.auctionsSvc.getList().pipe(catchError(() => of([] as Auction[]))),
      invAucs: this.invAucSvc.getList().pipe(catchError(() => of([] as InventoryAuction[]))),
      files: this.filesSvc.getList().pipe(catchError(() => of([] as InventoryDocumentFile[]))),
      invs: this.invSvc.getList().pipe(catchError(() => of([] as Inventory[]))),
      products: this.productsSvc.getList().pipe(catchError(() => of([] as Product[])))
    })
      .pipe(
        map(({ auctions, invAucs, files, invs, products }) => {
          // find lot
          this.lot =
            (invAucs || []).find(
              a =>
                ((a as any).inventoryAuctionId ??
                  (a as any).inventoryauctionId) === this.inventoryAuctionId
            ) || null;
          if (!this.lot) throw new Error('Listing not found');

          // auction
          const currentAuctionId = (this.lot as any).auctionId ?? this.auctionId;
          this.auctionId = currentAuctionId;
          this.auction =
            (auctions || []).find(a => a.auctionId === currentAuctionId) ||
            null;

          // inventory & product
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
            (this.inventory?.displayName ?? 'Listing');

          const chassis =
            this.inventory?.chassisNo || snap?.Chassis || snap?.chassis;
          this.subtitle = chassis
            ? `Chassis ${chassis} • Lot #${
                (this.lot as any).inventoryAuctionId ?? ''
              }`
            : `Lot #${(this.lot as any).inventoryAuctionId ?? ''}`;

          // images
          const isImg = (u?: string | null, n?: string | null) => {
            const s = (u || n || '').toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.webp'].some(x =>
              s.endsWith(x)
            );
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

          // specs
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

          // related
          const allLots = (invAucs || []).filter(x => x.active ?? true);
          const makeName = this.product?.makeName ?? make ?? '';
          const catName = categoryName ?? '';
          const byScore = (x: InventoryAuction) => {
            const inv =
              (invs || []).find(i => i.inventoryId === x.inventoryId) || null;
            const prod = inv
              ? (products || []).find(p => p.productId === inv.productId) ||
                null
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
                ((x as any).inventoryAuctionId ??
                  (x as any).inventoryauctionId) !== this.inventoryAuctionId
            )
            .map(x => {
              const inv =
                (invs || []).find(i => i.inventoryId === x.inventoryId) ||
                null;
              const prod = inv
                ? (products || []).find(
                    p => p.productId === inv.productId
                  ) || null
                : null;
              const snap2 = this.safeParse(inv?.productJSON);
              const yy = prod?.yearName ?? snap2?.Year ?? '';
              const mk = prod?.makeName ?? snap2?.Make ?? '';
              const md = prod?.modelName ?? snap2?.Model ?? '';
              const title2 =
                [yy, mk, md].filter(Boolean).join(' ') ||
                (inv?.displayName ?? 'Listing');
              const img =
                (imageMap.get(x.inventoryId) || [])[0] ||
                (this.images[0] || '');
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
                title: title2,
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

          // kick off inspection report load (after we know inventory)
          this.loadInspectionReport();

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

  // ---------- INSPECTION REPORT BUILDING ----------

  private loadInspectionReport(): void {
    if (!this.inventory || !this.inventory.inventoryId) {
      this.reportLoaded = true;
      this.reportGroups = [];
      return;
    }

    this.reportLoading = true;
    this.reportLoaded = false;
    this.reportGroups = [];

    const inventoryId = this.inventory.inventoryId;

    forkJoin({
      types: this.inspTypesSvc.getList().pipe(
        catchError(() => of([] as InspectionType[]))
      ),
      checkpoints: this.cpSvc.getList().pipe(
        catchError(() => of([] as InspectionCheckpoint[]))
      ),
      inspections: this.inspectionsSvc.getByInventory(inventoryId).pipe(
        catchError(() => of([] as Inspection[]))
      )
    }).subscribe({
      next: ({ types, checkpoints, inspections }) => {
        this.allTypes = types ?? [];
        this.allCheckpoints = checkpoints ?? [];
        this.reportGroups = this.buildGroupsForInventory(
          this.inventory!,
          inspections ?? []
        );
      },
      error: err => {
        console.error('Failed to load inspection report', err);
      },
      complete: () => {
        this.reportLoading = false;
        this.reportLoaded = true;
      }
    });
  }

  private isActiveInspection(i: Inspection): boolean {
    const raw =
      (i as any).active ??
      (i as any).Active ??
      (i as any).isActive ??
      true;
    return raw !== false && raw !== 0;
  }

  private buildGroupsForInventory(
    inventory: Inventory,
    existing: Inspection[]
  ): InspectionTypeGroupForUI[] {
    if (!inventory) return [];

    const groups: InspectionTypeGroupForUI[] = [];
    const activeTypes = (this.allTypes ?? []).filter(t => t.active !== false);
    const activeInspections = (existing ?? []).filter(i =>
      this.isActiveInspection(i)
    );

    activeTypes.forEach(t => {
      const cps = (this.allCheckpoints ?? []).filter(
        cp =>
          (((cp as any).inspectionTypeId === t.inspectionTypeId) ||
            ((cp as any).InspectionTypeId === t.inspectionTypeId)) &&
          cp.active !== false
      );

      if (!cps.length) return;

      const rows: InspectionCheckpointRow[] = cps.map(cp => {
        const cpId =
          (cp as any).inspectionCheckpointId ??
          (cp as any).inspectioncheckpointId;

        const cpInspectionsAll = activeInspections.filter(
          i =>
            i.inspectionTypeId === t.inspectionTypeId &&
            i.inspectionCheckpointId === cpId &&
            i.inventoryId === inventory.inventoryId
        );

        const inputType = cp.inputType;
        const norm = this.normalizeInputType(inputType);

        let resultValue = '';
        let inspectionId: number | undefined;
        let imageUrls: string[] | undefined;

        if (norm === 'image') {
          // collect all image urls for this checkpoint
          imageUrls = cpInspectionsAll
            .flatMap(i => this.extractImageUrls(i.result ?? ''))
            .filter(u => !!u);
          inspectionId = cpInspectionsAll[0]?.inspectionId;
        } else {
          const match = cpInspectionsAll[0];
          inspectionId = match?.inspectionId;
          resultValue = match?.result ?? '';
        }

        return {
          inspectionId,
          inspectionTypeId: t.inspectionTypeId,
          inspectionTypeName: t.inspectionTypeName,
          inspectionCheckpointId: cpId,
          inspectionCheckpointName:
            (cp as any).inspectionCheckpointName ??
            (cp as any).inspectioncheckpointName ??
            '',
          inputType,
          resultValue,
          imageUrls: imageUrls ?? []
        };
      });

      if (rows.length) {
        groups.push({
          inspectionTypeId: t.inspectionTypeId,
          inspectionTypeName: t.inspectionTypeName,
          weightage: t.weightage,
          checkpoints: rows
        });
      }
    });

    return groups;
  }

  /**
   * Normalize inputType for display/render logic.
   * Now includes 'image' for photo checkpoints.
   */
  normalizeInputType(
    inputType?: string | null
  ): 'text' | 'textarea' | 'number' | 'yesno' | 'image' {
    const v = (inputType || '').toLowerCase();
    if (v === 'textarea' || v === 'multiline') return 'textarea';
    if (v === 'number' || v === 'numeric' || v === 'score') return 'number';
    if (v === 'yesno' || v === 'boolean' || v === 'bool') return 'yesno';
    if (v === 'image' || v === 'photo' || v === 'picture' || v === 'file')
      return 'image';
    return 'text';
  }

  isAnswered(value?: string | null): boolean {
    return !!(value && value.toString().trim().length);
  }

  isRowAnswered(row: InspectionCheckpointRow): boolean {
    const t = this.normalizeInputType(row.inputType);
    if (t === 'image') {
      return !!(row.imageUrls && row.imageUrls.length);
    }
    return this.isAnswered(row.resultValue);
  }

  getGroupCompleted(group: InspectionTypeGroupForUI): number {
    return group.checkpoints.filter(r => this.isRowAnswered(r)).length;
  }

  getGroupTotal(group: InspectionTypeGroupForUI): number {
    return group.checkpoints.length;
  }

  get totalCheckpoints(): number {
    return this.reportGroups.reduce(
      (sum, g) => sum + g.checkpoints.length,
      0
    );
  }

  get totalCompleted(): number {
    return this.reportGroups.reduce(
      (sum, g) => sum + this.getGroupCompleted(g),
      0
    );
  }

  get overallProgressPercent(): number {
    if (!this.totalCheckpoints) return 0;
    return Math.round((this.totalCompleted / this.totalCheckpoints) * 100);
  }

  getCompletionStatus(): 'Not Started' | 'In Progress' | 'Completed' {
    if (!this.totalCheckpoints || !this.totalCompleted) return 'Not Started';
    if (this.totalCompleted < this.totalCheckpoints) return 'In Progress';
    return 'Completed';
  }

  getCompletionStatusColor(): string {
    switch (this.getCompletionStatus()) {
      case 'Completed':
        return '#16a34a';
      case 'In Progress':
        return '#f59e0b';
      default:
        return '#9ca3af';
    }
  }

  selectImage(url: string): void {
    this.activeImage = url;
  }

  /**
   * Parse Inspection.result into an array of image URLs.
   * Supports:
   * - JSON array: '["url1","url2"]'
   * - Pipe/comma/semicolon separated: 'url1|url2' or 'url1,url2'
   * - Single URL string
   */
  private extractImageUrls(val?: string | null): string[] {
    if (!val) return [];
    const trimmed = val.trim();
    if (!trimmed) return [];

    // JSON array case
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map(x => (typeof x === 'string' ? x.trim() : ''))
            .filter(x => !!x);
        }
      } catch {
        // fall through
      }
    }

    // pipe / comma / semicolon separated OR single url
    const parts = trimmed.split(/[|,;]/g).map(x => x.trim());
    const urls = parts.filter(p => !!p);

    const looksLikeImage = (s: string) => {
      const lower = s.toLowerCase();
      if (
        lower.startsWith('http://') ||
        lower.startsWith('https://') ||
        lower.startsWith('blob:') ||
        lower.startsWith('data:image/')
      ) {
        return true;
      }
      return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(ext =>
        lower.includes(ext)
      );
    };

    return urls.filter(looksLikeImage);
  }

  // ---------- IMAGE VIEWER (inspection photos) ----------

  openImageViewer(images: string[], startIndex: number = 0): void {
    if (!images || !images.length) return;
    this.selectedImageGallery = images;
    this.selectedImageIndex = Math.min(
      Math.max(startIndex, 0),
      images.length - 1
    );
    this.showImageViewer = true;
  }

  closeImageViewer(): void {
    this.showImageViewer = false;
    this.selectedImageGallery = [];
    this.selectedImageIndex = 0;
  }

  nextImage(): void {
    if (this.selectedImageIndex < this.selectedImageGallery.length - 1) {
      this.selectedImageIndex++;
    }
  }

  prevImage(): void {
    if (this.selectedImageIndex > 0) {
      this.selectedImageIndex--;
    }
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
