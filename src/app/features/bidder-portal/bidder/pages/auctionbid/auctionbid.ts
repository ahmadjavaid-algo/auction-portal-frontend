import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';

import { forkJoin, of, interval, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Auction } from '../../../../../models/auction.model';
import { InventoryAuction } from '../../../../../models/inventoryauction.model';
import { Inventory } from '../../../../../models/inventory.model';
import { InventoryDocumentFile } from '../../../../../models/inventorydocumentfile.model';
import { Product } from '../../../../../models/product.model';
import { AuctionTimebox } from '../../../../../models/auction-timebox.model';
import { AuctionBid } from '../../../../../models/auctionbid.model';

import { InspectionType } from '../../../../../models/inspectiontype.model';
import { InspectionCheckpoint } from '../../../../../models/inspectioncheckpoint.model';
import { Inspection } from '../../../../../models/inspection.model';

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

import { InspectionTypesService } from '../../../../../services/inspectiontypes.service';
import { InspectionCheckpointsService } from '../../../../../services/inspectioncheckpoints.service';
import { InspectionsService } from '../../../../../services/inspection.service';

type SpecRow = { label: string; value: string | number | null | undefined };

type BidView = {
  auctionBidId: number;
  amount: number;
  createdDate: string | null;
  createdById: number | null;
  isMine: boolean;
  statusName: string | null | undefined;

  isAutoBid: boolean;
  autoBidAmount: number | null;
};

type RelatedLotCard = {
  invAuc: InventoryAuction;

  inventoryAuctionId: number;
  inventoryId: number | null;

  title: string;
  sub: string;
  imageUrl: string;

  auctionStartPrice?: number | null;
  buyNow?: number | null;
  reserve?: number | null;
  bidIncrement?: number | null;

  countdownText?: string;
  countdownState?: 'scheduled' | 'live' | 'ended';

  currentPrice?: number | null;
  reserveMet?: boolean;

  bidCooldownActive?: boolean;
  bidCooldownRemaining?: number;
  cooldownHandle?: any;
  placingBid?: boolean;
};

interface InspectionCheckpointRow {
  inspectionId?: number;
  inspectionTypeId: number;
  inspectionTypeName: string;
  inspectionCheckpointId: number;
  inspectionCheckpointName: string;
  inputType?: string | null;
  resultValue: string;

  imageUrls?: string[];
}

interface InspectionTypeGroupForUI {
  inspectionTypeId: number;
  inspectionTypeName: string;
  weightage?: number | null;
  checkpoints: InspectionCheckpointRow[];
}

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
    MatSnackBarModule,
    MatDividerModule,
    MatTabsModule
  ],
  templateUrl: './auctionbid.html',
  styleUrls: ['./auctionbid.scss']
})
export class Auctionbid implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  private auctionsSvc = inject(AuctionService);
  private invAucSvc = inject(InventoryAuctionService);
  private filesSvc = inject(InventoryDocumentFileService);
  private invSvc = inject(InventoryService);
  private productsSvc = inject(ProductsService);
  private bidsSvc = inject(AuctionBidService);
  private bidderAuth = inject(BidderAuthService);
  private notifHub = inject(NotificationHubService);

  private inspTypesSvc = inject(InspectionTypesService);
  private cpSvc = inject(InspectionCheckpointsService);
  private inspectionsSvc = inject(InspectionsService);

  private routeSub?: Subscription;
  private resyncSub?: Subscription;
  private notifStreamSub?: Subscription;
  private tickHandle: any = null;

  auctionId!: number;
  inventoryAuctionId!: number;

  auction: Auction | null = null;
  lot: InventoryAuction | null = null;
  inventory: Inventory | null = null;
  product: Product | null = null;

  loading = true;
  error: string | null = null;

  images: string[] = [];
  bannerImage = '';
  title = 'Auction lot';
  subtitle = '';

  specs: SpecRow[] = [];

  private auctionStartUtcMs: number | null = null;
  private auctionEndUtcMs: number | null = null;
  private clockSkewMs = 0;

  auctionState: 'scheduled' | 'live' | 'ended' | 'unknown' = 'unknown';
  auctionCountdown = '—';

  bids: BidView[] = [];
  currentPrice: number | null = null;
  yourMaxBid: number | null = null;
  yourStatus: 'Winning' | 'Outbid' | 'Won' | 'Lost' | 'No Bids' = 'No Bids';

  newBidAmount: number | null = null;
  placingBid = false;

  autoBidEnabled = false;
  autoBidMaxAmount: number | null = null;
  autoBidCeiling: number | null = null;

  allTypes: InspectionType[] = [];
  allCheckpoints: InspectionCheckpoint[] = [];
  reportGroups: InspectionTypeGroupForUI[] = [];
  reportLoading = false;
  reportLoaded = false;

  selectedImageGallery: string[] = [];
  selectedImageIndex = 0;
  showImageViewer = false;

  relatedLots: RelatedLotCard[] = [];

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

  get isReserveMet(): boolean {
    const reserve = this.lotReservePrice;
    const current = this.currentPrice;
    if (reserve == null || reserve <= 0 || current == null) return false;
    return current >= reserve;
  }

  get hasAutoBidHistory(): boolean {
    return this.autoBidCeiling != null;
  }

  get isLive(): boolean {
    return this.auctionState === 'live';
  }

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe(pm => {
      this.auctionId = Number(pm.get('auctionId') || 0);
      this.inventoryAuctionId = Number(pm.get('inventoryAuctionId') ?? pm.get('id') ?? 0);

      if (!this.auctionId || !this.inventoryAuctionId) {
        this.error = 'Invalid auction or lot id.';
        this.loading = false;
        return;
      }

      this.loadAll();

      if (!this.notifStreamSub) {
        this.notifStreamSub = this.notifHub.stream$.subscribe(n => this.handleNotification(n));
      }
    });
  }

  ngOnDestroy(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);

    this.routeSub?.unsubscribe();
    this.resyncSub?.unsubscribe();
    this.notifStreamSub?.unsubscribe();
    document.removeEventListener('visibilitychange', this.onVisChange);

    for (const c of this.relatedLots) {
      if (c.cooldownHandle) {
        clearInterval(c.cooldownHandle);
        c.cooldownHandle = null;
      }
    }
  }

  private loadAll(): void {
    this.loading = true;
    this.error = null;

    this.images = [];
    this.bannerImage = '';
    this.specs = [];

    this.bids = [];
    this.currentPrice = null;
    this.yourMaxBid = null;
    this.yourStatus = 'No Bids';
    this.newBidAmount = null;

    this.autoBidEnabled = false;
    this.autoBidMaxAmount = null;
    this.autoBidCeiling = null;

    this.reportGroups = [];
    this.reportLoaded = false;
    this.reportLoading = false;
    this.allTypes = [];
    this.allCheckpoints = [];

    this.showImageViewer = false;
    this.selectedImageGallery = [];
    this.selectedImageIndex = 0;

    for (const c of this.relatedLots) {
      if (c.cooldownHandle) clearInterval(c.cooldownHandle);
    }
    this.relatedLots = [];

    forkJoin({
      timebox: this.auctionsSvc
        .getTimebox(this.auctionId)
        .pipe(catchError(() => of(null as AuctionTimebox | null))),
      auctions: this.auctionsSvc.getList().pipe(catchError(() => of([] as Auction[]))),
      invAucs: this.invAucSvc.getList().pipe(catchError(() => of([] as InventoryAuction[]))),
      files: this.filesSvc.getList().pipe(catchError(() => of([] as InventoryDocumentFile[]))),
      invs: this.invSvc.getList().pipe(catchError(() => of([] as Inventory[]))),
      products: this.productsSvc.getList().pipe(catchError(() => of([] as Product[]))),
      bids: this.bidsSvc.getList().pipe(catchError(() => of([] as AuctionBid[])))
    })
      .pipe(
        map(({ timebox, auctions, invAucs, files, invs, products, bids }) => {
          if (timebox) {
            this.auctionStartUtcMs = Number(timebox.startEpochMsUtc);
            this.auctionEndUtcMs = Number(timebox.endEpochMsUtc);
            this.clockSkewMs = Number.isFinite(timebox.nowEpochMsUtc as any)
              ? Number(timebox.nowEpochMsUtc) - Date.now()
              : 0;
          } else {
            this.auctionStartUtcMs = null;
            this.auctionEndUtcMs = null;
            this.clockSkewMs = 0;
          }

          this.auction = (auctions || []).find(a => a.auctionId === this.auctionId) || null;

          this.lot =
            (invAucs || []).find(a => {
              const ia = (a as any).inventoryAuctionId ?? (a as any).inventoryauctionId;
              return ia === this.inventoryAuctionId;
            }) || null;

          if (!this.lot) throw new Error('Listing not found');

          this.inventory =
            (invs || []).find(i => i.inventoryId === (this.lot as any).inventoryId) || null;

          this.product = this.inventory
            ? (products || []).find(p => p.productId === (this.inventory as any).productId) || null
            : null;

          const snap = this.safeParse((this.inventory as any)?.productJSON);

          const year = (this.product as any)?.yearName ?? snap?.Year ?? snap?.year;
          const make = (this.product as any)?.makeName ?? snap?.Make ?? snap?.make;
          const model = (this.product as any)?.modelName ?? snap?.Model ?? snap?.model;

          this.title =
            [year, make, model].filter(Boolean).join(' ') ||
            ((this.inventory as any)?.displayName ?? 'Auction lot');

          const chassis = (this.inventory as any)?.chassisNo || snap?.Chassis || snap?.chassis;
          this.subtitle = chassis
            ? `Chassis ${chassis} • Lot #${this.lotId ?? ''}`
            : `Lot #${this.lotId ?? ''}`;

          const isImg = (u?: string | null, n?: string | null) => {
            const s = (u || n || '').toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.webp'].some(x => s.endsWith(x));
          };

          const imageMap = this.buildImagesMap(files || []);

          this.images = (files || [])
            .filter(f => {
              const active = (f as any).active ?? (f as any).Active ?? true;
              return (
                active &&
                (f as any).inventoryId === (this.inventory as any)?.inventoryId &&
                !!(f as any).documentUrl &&
                isImg((f as any).documentUrl, (f as any).documentName)
              );
            })
            .map(f => (f as any).documentUrl!)
            .slice(0, 32);

          // Select random banner image from available images
          this.bannerImage = this.images.length 
            ? this.images[Math.floor(Math.random() * this.images.length)]
            : this.heroUrl;

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
            (this.product as any)?.categoryName ?? snap?.Category ?? snap?.category ?? null;

          this.specs = [
            { label: 'Make', value: make || (this.product as any)?.makeName || '—' },
            { label: 'Model', value: model || (this.product as any)?.modelName || '—' },
            { label: 'Year', value: year || (this.product as any)?.yearName || '—' },
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

          this.bids = this.mapBidsForLot(bids || []);
          this.recomputeBidMetrics();

          this.relatedLots = this.buildRelatedLots(
            invAucs || [],
            invs || [],
            products || [],
            imageMap,
            bids || []
          );

          this.updateCountdown();
          this.startTicker();
          this.startResync();
          this.wireVisibility();

          this.loadInspectionReport();

          try {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch {}
        })
      )
      .subscribe({
        next: () => (this.loading = false),
        error: () => {
          this.error = 'Failed to load auction.';
          this.loading = false;
        }
      });
  }

  // ===================== RELATED LOTS =====================

  private buildImagesMap(files: InventoryDocumentFile[]): Map<number, string[]> {
    const map = new Map<number, string[]>();

    const isImg = (u?: string | null, n?: string | null) => {
      const s = (u || n || '').toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].some(x => s.endsWith(x));
    };

    for (const f of files || []) {
      const active = (f as any).active ?? (f as any).Active ?? true;
      const invId = (f as any).inventoryId ?? null;
      const url = (f as any).documentUrl ?? null;
      const name = (f as any).documentName ?? null;

      if (!active || !invId || !url || !isImg(url, name)) continue;

      if (!map.has(invId)) map.set(invId, []);
      map.get(invId)!.push(url);
    }

    return map;
  }

  private pickCover(urls?: string[]): string | null {
    if (!urls || !urls.length) return null;
    return urls[0];
  }

  private buildRelatedLots(
    invAucs: InventoryAuction[],
    invs: Inventory[],
    products: Product[],
    imageMap: Map<number, string[]>,
    bids: AuctionBid[]
  ): RelatedLotCard[] {
    const invMap = new Map<number, Inventory>();
    (invs || []).forEach(i => invMap.set((i as any).inventoryId, i));

    const prodMap = new Map<number, Product>();
    (products || []).forEach(p => prodMap.set((p as any).productId, p));

    const currentInvAucId = this.lotId ?? this.inventoryAuctionId;

    const rows = (invAucs || [])
      .filter(r => ((r as any).auctionId ?? (r as any).AuctionId) === this.auctionId)
      .filter(r => ((r as any).active ?? (r as any).Active ?? true) !== false)
      .filter(r => {
        const invAucId =
          (r as any).inventoryAuctionId ??
          (r as any).InventoryAuctionId ??
          (r as any).inventoryauctionId;
        return Number(invAucId) !== Number(currentInvAucId);
      });

    const cards: RelatedLotCard[] = rows.map(r => {
      const invAucId =
        (r as any).inventoryAuctionId ??
        (r as any).InventoryAuctionId ??
        (r as any).inventoryauctionId ??
        0;
      const inventoryId = (r as any).inventoryId ?? null;

      const inv = inventoryId ? invMap.get(inventoryId) || null : null;
      const prod = inv ? prodMap.get((inv as any).productId) || null : null;
      const snap = this.safeParse((inv as any)?.productJSON);

      const yearName = ((prod as any)?.yearName ?? snap?.Year ?? snap?.year) ?? null;
      const makeName = ((prod as any)?.makeName ?? snap?.Make ?? snap?.make) ?? null;
      const modelName = ((prod as any)?.modelName ?? snap?.Model ?? snap?.model) ?? null;

      const titleFromMeta = [yearName, makeName, modelName].filter(Boolean).join(' ');
      const title =
        titleFromMeta ||
        (inv as any)?.displayName ||
        snap?.DisplayName ||
        snap?.displayName ||
        `Inventory #${inventoryId ?? '—'}`;

      const chassis = (inv as any)?.chassisNo || null;
      const sub = chassis ? `Chassis ${chassis}` : `Lot #${invAucId}`;

      const cover = this.pickCover(imageMap.get(inventoryId ?? -1)) || this.heroUrl;

      const auctionStartPrice = (r as any).auctionStartPrice ?? (r as any).AuctionStartPrice ?? null;
      const reserve = (r as any).reservePrice ?? (r as any).ReservePrice ?? null;
      const buyNow = (r as any).buyNowPrice ?? (r as any).BuyNowPrice ?? null;
      const bidIncrement = (r as any).bidIncrement ?? (r as any).BidIncrement ?? null;

      return {
        invAuc: r,
        inventoryAuctionId: Number(invAucId),
        inventoryId: inventoryId != null ? Number(inventoryId) : null,
        title,
        sub,
        imageUrl: cover,
        auctionStartPrice,
        reserve,
        buyNow,
        bidIncrement,
        countdownText: '—',
        countdownState: 'scheduled',
        currentPrice: null,
        reserveMet: false,
        bidCooldownActive: false,
        bidCooldownRemaining: 0,
        cooldownHandle: null,
        placingBid: false
      } as RelatedLotCard;
    });

    this.applyBidMetricsToRelated(cards, bids);

    return cards.slice(0, 12);
  }

  private applyBidMetricsToRelated(cards: RelatedLotCard[], bids: AuctionBid[]): void {
    for (const card of cards) {
      const lotId = card.inventoryAuctionId;

      const lotBids = (bids || []).filter(b => {
        const iaId =
          (b as any).inventoryAuctionId ??
          (b as any).InventoryAuctionId ??
          (b as any).inventoryauctionId;
        const aucId = (b as any).auctionId ?? (b as any).AuctionId ?? (b as any).auctionID;
        return Number(iaId) === Number(lotId) && Number(aucId) === Number(this.auctionId);
      });

      const highestBid = lotBids.length
        ? Math.max(
            ...lotBids.map(b =>
              Number((b as any).bidAmount ?? (b as any).BidAmount ?? (b as any).Amount ?? 0)
            )
          )
        : null;

      const start = card.auctionStartPrice ?? null;
      card.currentPrice = highestBid != null ? highestBid : start;

      const reserve = card.reserve ?? null;
      card.reserveMet =
        reserve != null && reserve > 0 && card.currentPrice != null && card.currentPrice >= reserve;
    }
  }

  openRelated(card: RelatedLotCard): void {
    this.router.navigate(['../', card.inventoryAuctionId], { relativeTo: this.route });
  }

  onQuickBidRelated(card: RelatedLotCard, ev: MouseEvent): void {
    ev.preventDefault();
    ev.stopPropagation();

    if (!this.isLive) {
      this.snack.open('Bidding is only available while the auction is live.', 'OK', { duration: 3000 });
      return;
    }

    const userId = this.bidderAuth.currentUser?.userId ?? null;
    if (!userId) {
      this.snack.open('Please log in as a bidder to place bids.', 'OK', { duration: 3000 });
      return;
    }

    if (card.bidCooldownActive || card.placingBid) return;

    const inc = card.bidIncrement ?? 100;
    const base = card.currentPrice ?? card.auctionStartPrice ?? card.buyNow ?? card.reserve ?? 0;
    const amount = base + (inc > 0 ? inc : 0);

    card.placingBid = true;

    const payload: any = {
      createdById: userId,
      active: true,
      auctionBidId: 0,
      auctionId: this.auctionId,
      auctionBidStatusId: 0,
      inventoryAuctionId: card.inventoryAuctionId,
      bidAmount: amount,
      auctionBidStatusName: 'Winning',
      isAutoBid: false,
      autoBidAmount: null
    };

    this.bidsSvc.add(payload).subscribe({
      next: () => {
        this.snack.open('Quick bid placed.', 'OK', { duration: 2500 });
        this.startRelatedCooldown(card, 3);
        this.refreshBidsAll();
      },
      error: err => {
        const msg =
          err && err.error
            ? typeof err.error === 'string'
              ? err.error
              : JSON.stringify(err.error)
            : 'Unknown error';
        this.snack.open('Failed to quick bid: ' + msg, 'OK', { duration: 4500 });
      },
      complete: () => {
        card.placingBid = false;
      }
    });
  }

  private startRelatedCooldown(card: RelatedLotCard, seconds: number): void {
    card.bidCooldownActive = true;
    card.bidCooldownRemaining = seconds;

    if (card.cooldownHandle) clearInterval(card.cooldownHandle);

    card.cooldownHandle = setInterval(() => {
      card.bidCooldownRemaining = Math.max(0, (card.bidCooldownRemaining ?? 0) - 1);
      if ((card.bidCooldownRemaining ?? 0) <= 0) {
        card.bidCooldownActive = false;
        clearInterval(card.cooldownHandle);
        card.cooldownHandle = null;
      }
    }, 1000);
  }

  private refreshBidsAll(): void {
    this.bidsSvc
      .getList()
      .pipe(catchError(() => of([] as AuctionBid[])))
      .subscribe({
        next: bids => {
          this.bids = this.mapBidsForLot(bids || []);
          this.recomputeBidMetrics();
          this.applyBidMetricsToRelated(this.relatedLots, bids || []);
        },
        error: err => console.error('[bid] refreshBidsAll() failed', err)
      });
  }

  // ===================== BIDS / CORE =====================

  private mapBidsForLot(allBids: AuctionBid[]): BidView[] {
    const currentUserId = this.bidderAuth.currentUser?.userId ?? null;

    const bidsForLot = (allBids || []).filter(b => {
      const iaId =
        (b as any).inventoryAuctionId ??
        (b as any).InventoryAuctionId ??
        (b as any).inventoryauctionId;
      const aucId = (b as any).auctionId ?? (b as any).AuctionId ?? (b as any).auctionID;
      return iaId === this.lotId && aucId === this.auctionId;
    });

    const mapped = bidsForLot.map(b => {
      const createdRaw = (b as any).createdDate ?? (b as any).CreatedDate ?? null;
      const createdBy = (b as any).createdById ?? (b as any).CreatedById ?? null;
      const statusName =
        (b as any).auctionBidStatusName ?? (b as any).AuctionBidStatusName ?? null;

      const isAuto = !!((b as any).isAutoBid ?? (b as any).IsAutoBid ?? false);

      const rawMax = (b as any).autoBidAmount ?? (b as any).AutoBidAmount ?? null;
      const parsedMax = rawMax !== null && rawMax !== undefined && rawMax !== '' ? Number(rawMax) : null;
      const safeMax = parsedMax !== null && Number.isFinite(parsedMax) ? parsedMax : null;

      return {
        auctionBidId: (b as any).auctionBidId ?? (b as any).AuctionBidId ?? 0,
        amount: Number((b as any).bidAmount ?? (b as any).BidAmount ?? 0),
        createdDate: createdRaw,
        createdById: createdBy,
        isMine: currentUserId != null && createdBy === currentUserId,
        statusName,
        isAutoBid: isAuto,
        autoBidAmount: safeMax
      } as BidView;
    });

    return mapped.sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      const ta = a.createdDate ? Date.parse(a.createdDate) : 0;
      const tb = b.createdDate ? Date.parse(b.createdDate) : 0;
      if (tb !== ta) return tb - ta;
      return (b.auctionBidId ?? 0) - (a.auctionBidId ?? 0);
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
    this.resyncSub?.unsubscribe();
    this.resyncSub = interval(120000).subscribe(() => {
      this.auctionsSvc.getTimebox(this.auctionId).pipe(catchError(() => of(null))).subscribe({
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
    if (document.visibilityState !== 'visible') return;
    this.auctionsSvc.getTimebox(this.auctionId).pipe(catchError(() => of(null))).subscribe({
      next: tb => {
        if (!tb) return;
        this.auctionStartUtcMs = Number(tb.startEpochMsUtc);
        this.auctionEndUtcMs = Number(tb.endEpochMsUtc);
        this.clockSkewMs = Number(tb.nowEpochMsUtc) - Date.now();
        this.updateCountdown();
      }
    });
  };

  private wireVisibility(): void {
    document.removeEventListener('visibilitychange', this.onVisChange);
    document.addEventListener('visibilitychange', this.onVisChange);
  }

  private updateCountdown(): void {
    if (!this.auctionStartUtcMs || !this.auctionEndUtcMs) {
      this.auctionState = 'unknown';
      this.auctionCountdown = '—';
      for (const c of this.relatedLots) {
        c.countdownState = 'scheduled';
        c.countdownText = '—';
      }
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

    for (const c of this.relatedLots) {
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

  private recomputeBidMetrics(): void {
    if (!this.lot) return;

    const all = this.bids;
    const currentUserId = this.bidderAuth.currentUser?.userId ?? null;

    const highestBid = all.length ? Math.max(...all.map(b => b.amount)) : null;

    const yourBids = currentUserId ? all.filter(b => b.isMine) : [];
    const yourHighest = yourBids.length ? Math.max(...yourBids.map(b => b.amount)) : null;

    const startPrice = this.lotStartPrice;
    this.currentPrice = highestBid != null ? highestBid : startPrice ?? null;
    this.yourMaxBid = yourHighest;

    const yourAutoBids = yourBids.filter(b => b.isAutoBid && (b.autoBidAmount != null || b.amount != null));
    this.autoBidCeiling = yourAutoBids.length
      ? Math.max(
          ...yourAutoBids.map(b =>
            b.autoBidAmount != null && Number.isFinite(b.autoBidAmount) ? b.autoBidAmount : b.amount
          )
        )
      : null;

    if (this.autoBidCeiling != null && this.autoBidMaxAmount == null) {
      this.autoBidMaxAmount = this.autoBidCeiling;
    }

    if (!yourHighest) {
      this.yourStatus = 'No Bids';
    } else if (this.auctionState === 'ended') {
      this.yourStatus = highestBid != null && yourHighest === highestBid ? 'Won' : 'Lost';
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
    this.newBidAmount = Math.max(0, current + delta);
  }

  toggleAutoBid(): void {
    this.autoBidEnabled = !this.autoBidEnabled;

    if (this.autoBidEnabled) {
      const base = this.newBidAmount ?? this.currentPrice ?? this.lotStartPrice ?? 0;
      const inc = this.lotBidIncrement || 100;
      if (this.autoBidMaxAmount == null || this.autoBidMaxAmount <= base) {
        this.autoBidMaxAmount = base + inc * 3;
      }
    }
  }

  placeBid(): void {
    const userId = this.bidderAuth.currentUser?.userId ?? null;
    if (!userId) {
      this.snack.open('Please log in as a bidder to place bids.', 'OK', { duration: 3000 });
      return;
    }

    if (!this.isLive) {
      this.snack.open('Bidding is only available while the auction is live.', 'OK', { duration: 3000 });
      return;
    }

    if (!this.lot) return;

    const amount = Number(this.newBidAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.snack.open('Enter a valid bid amount.', 'OK', { duration: 2500 });
      return;
    }

    if (this.currentPrice != null && amount <= this.currentPrice) {
      this.snack.open('Your bid must be higher than the current price.', 'OK', { duration: 3000 });
      return;
    }

    const isAutoBid = this.autoBidEnabled;
    let autoMax: number | null = null;

    if (isAutoBid) {
      autoMax = this.autoBidMaxAmount != null ? Number(this.autoBidMaxAmount) : null;

      if (!Number.isFinite(autoMax) || autoMax == null) {
        this.snack.open('Enter a valid maximum amount for AI bidding.', 'OK', { duration: 3000 });
        return;
      }

      if (autoMax <= amount) {
        this.snack.open('Your AI max must be higher than your starting bid.', 'OK', { duration: 3500 });
        return;
      }

      if (this.currentPrice != null && autoMax <= this.currentPrice) {
        this.snack.open('Your AI max must be higher than the current price.', 'OK', { duration: 3500 });
        return;
      }
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
      auctionBidStatusName: 'Winning',

      isAutoBid: isAutoBid,
      autoBidAmount: isAutoBid ? autoMax : null
    };

    this.bidsSvc.add(payload).subscribe({
      next: () => {
        const msg = isAutoBid
          ? 'AI bidding enabled. We will keep bidding for you up to your max.'
          : 'Bid placed successfully.';
        this.snack.open(msg, 'OK', { duration: 3000 });
        this.refreshBidsAll();
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
        this.placingBid = false;
      }
    });
  }

  private handleNotification(n: NotificationItem): void {
    if (!n.auctionId || !n.inventoryAuctionId) return;
    if (n.auctionId !== this.auctionId || n.inventoryAuctionId !== this.lotId) return;

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
        this.snack.open('You have been outbid on this lot. Refreshing bid history…', 'OK', {
          duration: 5000
        });
        break;

      case 'bid-winning':
        this.snack.open('Your bid is currently winning for this lot.', 'OK', { duration: 4000 });
        break;

      case 'auction-won':
        this.snack.open('Congratulations! You have won this lot.', 'View', { duration: 6000 });
        break;

      case 'auction-lost':
        this.snack.open('The auction has ended and your bid was not the winning bid.', 'OK', {
          duration: 6000
        });
        break;
    }

    this.refreshBidsAll();
  }

  formatDate(d?: string | null): string {
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));
    } catch {
      return d;
    }
  }

  formatRange(a?: string | Date | null, b?: string | Date | null): string {
    const s = a ? new Date(a) : null;
    const e = b ? new Date(b) : null;
    const fmt = (d: Date) =>
      new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
    return `${s ? fmt(s) : '—'} → ${e ? fmt(e) : '—'}`;
  }

  // ===================== INSPECTION REPORT =====================

  private isActiveInspection(i: Inspection): boolean {
    const raw = (i as any).active ?? (i as any).Active ?? (i as any).isActive ?? true;
    return raw !== false && raw !== 0;
  }

  private loadInspectionReport(): void {
    if (!this.inventory || !(this.inventory as any).inventoryId) {
      this.reportLoaded = true;
      this.reportGroups = [];
      return;
    }

    this.reportLoading = true;
    this.reportLoaded = false;
    this.reportGroups = [];

    const inventoryId = (this.inventory as any).inventoryId;

    forkJoin({
      types: this.inspTypesSvc.getList().pipe(catchError(() => of([] as InspectionType[]))),
      checkpoints: this.cpSvc.getList().pipe(catchError(() => of([] as InspectionCheckpoint[]))),
      inspections: this.inspectionsSvc.getByInventory(inventoryId).pipe(catchError(() => of([] as Inspection[])))
    }).subscribe({
      next: ({ types, checkpoints, inspections }) => {
        this.allTypes = types ?? [];
        this.allCheckpoints = checkpoints ?? [];
        this.reportGroups = this.buildGroupsForInventory(this.inventory!, inspections ?? []);
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

  private buildGroupsForInventory(inventory: Inventory, existing: Inspection[]): InspectionTypeGroupForUI[] {
    if (!inventory) return [];

    const groups: InspectionTypeGroupForUI[] = [];
    const activeTypes = (this.allTypes ?? []).filter(t => (t as any).active !== false);
    const activeInspections = (existing ?? []).filter(i => this.isActiveInspection(i));

    activeTypes.forEach(t => {
      const cps = (this.allCheckpoints ?? []).filter(cp => {
        const typeId = (cp as any).inspectionTypeId ?? (cp as any).InspectionTypeId;
        const active = (cp as any).active ?? (cp as any).Active ?? true;
        return typeId === (t as any).inspectionTypeId && active !== false && active !== 0;
      });

      if (!cps.length) return;

      const rows: InspectionCheckpointRow[] = cps.map(cp => {
        const cpId = (cp as any).inspectionCheckpointId ?? (cp as any).inspectioncheckpointId;

        const cpInspectionsAll = activeInspections.filter(
          i =>
            (i as any).inspectionTypeId === (t as any).inspectionTypeId &&
            (i as any).inspectionCheckpointId === cpId &&
            (i as any).inventoryId === (inventory as any).inventoryId
        );

        const inputType = (cp as any).inputType ?? (cp as any).InputType ?? null;
        const norm = this.normalizeInputType(inputType);

        let resultValue = '';
        let inspectionId: number | undefined;
        let imageUrls: string[] | undefined;

        if (norm === 'image') {
          imageUrls = cpInspectionsAll
            .flatMap(i => this.extractImageUrls((i as any).result ?? ''))
            .filter(u => !!u);
          inspectionId = (cpInspectionsAll[0] as any)?.inspectionId;
        } else {
          const match = cpInspectionsAll[0] as any;
          inspectionId = match?.inspectionId;
          resultValue = match?.result ?? '';
        }

        return {
          inspectionId,
          inspectionTypeId: (t as any).inspectionTypeId,
          inspectionTypeName: (t as any).inspectionTypeName,
          inspectionCheckpointId: cpId,
          inspectionCheckpointName:
            (cp as any).inspectionCheckpointName ?? (cp as any).inspectioncheckpointName ?? '',
          inputType,
          resultValue,
          imageUrls: imageUrls ?? []
        };
      });

      if (rows.length) {
        groups.push({
          inspectionTypeId: (t as any).inspectionTypeId,
          inspectionTypeName: (t as any).inspectionTypeName,
          weightage: (t as any).weightage ?? null,
          checkpoints: rows
        });
      }
    });

    return groups;
  }

  normalizeInputType(inputType?: string | null): 'text' | 'textarea' | 'number' | 'yesno' | 'image' {
    const v = (inputType || '').toLowerCase();
    if (v === 'textarea' || v === 'multiline') return 'textarea';
    if (v === 'number' || v === 'numeric' || v === 'score') return 'number';
    if (v === 'yesno' || v === 'boolean' || v === 'bool') return 'yesno';
    if (v === 'image' || v === 'photo' || v === 'picture' || v === 'file') return 'image';
    return 'text';
  }

  isAnswered(value?: string | null): boolean {
    return !!(value && value.toString().trim().length);
  }

  isRowAnswered(row: InspectionCheckpointRow): boolean {
    const t = this.normalizeInputType(row.inputType);
    if (t === 'image') return !!(row.imageUrls && row.imageUrls.length);
    return this.isAnswered(row.resultValue);
  }

  getGroupCompleted(group: InspectionTypeGroupForUI): number {
    return group.checkpoints.filter(r => this.isRowAnswered(r)).length;
  }

  getGroupTotal(group: InspectionTypeGroupForUI): number {
    return group.checkpoints.length;
  }

  get totalCheckpoints(): number {
    return this.reportGroups.reduce((sum, g) => sum + g.checkpoints.length, 0);
  }

  get totalCompleted(): number {
    return this.reportGroups.reduce((sum, g) => sum + this.getGroupCompleted(g), 0);
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

  private extractImageUrls(val?: string | null): string[] {
    if (!val) return [];
    const trimmed = val.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map(x => (typeof x === 'string' ? x.trim() : ''))
            .filter(x => !!x);
        }
      } catch {}
    }

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
      return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(ext => lower.includes(ext));
    };

    return urls.filter(looksLikeImage);
  }

  // ===================== IMAGE VIEWER =====================

  openImageViewer(images: string[], startIndex: number = 0): void {
    if (!images || !images.length) return;
    this.selectedImageGallery = images;
    this.selectedImageIndex = Math.min(Math.max(startIndex, 0), images.length - 1);
    this.showImageViewer = true;
  }

  closeImageViewer(): void {
    this.showImageViewer = false;
    this.selectedImageGallery = [];
    this.selectedImageIndex = 0;
  }

  nextImage(): void {
    if (this.selectedImageIndex < this.selectedImageGallery.length - 1) this.selectedImageIndex++;
  }

  prevImage(): void {
    if (this.selectedImageIndex > 0) this.selectedImageIndex--;
  }

  openProductGallery(): void {
    if (this.images && this.images.length > 0) {
      this.openImageViewer(this.images, 0);
    }
  }
}