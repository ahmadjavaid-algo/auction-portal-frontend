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
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Auction } from '../../../../../models/auction.model';
import { InventoryAuction } from '../../../../../models/inventoryauction.model';
import { Inventory } from '../../../../../models/inventory.model';
import { InventoryDocumentFile } from '../../../../../models/inventorydocumentfile.model';
import { Product } from '../../../../../models/product.model';
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
import { InspectionTypesService } from '../../../../../services/inspectiontypes.service';
import { InspectionCheckpointsService } from '../../../../../services/inspectioncheckpoints.service';
import { InspectionsService } from '../../../../../services/inspection.service';

interface VehicleData {
  inventoryAuctionId: number;
  inventoryId: number | null;
  auctionId: number;
  
  title: string;
  subtitle: string;
  imageUrl: string;
  images: string[];
  
  // Pricing
  currentPrice: number | null;
  startPrice: number | null;
  reservePrice: number | null;
  buyNowPrice: number | null;
  bidIncrement: number | null;
  reserveMet: boolean;
  
  // Specs
  specs: { label: string; value: string | number | null | undefined }[];
  
  // Bids
  totalBids: number;
  yourMaxBid: number | null;
  highestBid: number | null;
  
  // Inspection
  inspectionScore: number | null;
  inspectionComplete: boolean;
  totalCheckpoints: number;
  completedCheckpoints: number;
  
  // Raw data
  lot: InventoryAuction | null;
  inventory: Inventory | null;
  product: Product | null;
  bids: AuctionBid[];
  inspections: Inspection[];
}

interface AIComparison {
  winner: 'vehicle1' | 'vehicle2' | 'tie';
  confidence: number;
  summary: string;
  priceAnalysis: string;
  conditionAnalysis: string;
  valueAnalysis: string;
  recommendation: string;
  keyDifferences: string[];
  pros1: string[];
  pros2: string[];
  cons1: string[];
  cons2: string[];
}

@Component({
  selector: 'app-compare',
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
    MatTabsModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './compare.html',
  styleUrl: './compare.scss'
})
export class Compare implements OnInit, OnDestroy {
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
  private inspTypesSvc = inject(InspectionTypesService);
  private cpSvc = inject(InspectionCheckpointsService);
  private inspectionsSvc = inject(InspectionsService);

  private routeSub?: Subscription;

  loading = true;
  loadingAI = false;
  error: string | null = null;

  vehicle1: VehicleData | null = null;
  vehicle2: VehicleData | null = null;

  availableVehicles: { id: number; label: string; auctionId: number }[] = [];
  selectedVehicle2Id: number | null = null;

  aiComparison: AIComparison | null = null;
  showAIPanel = false;

  // AI Animation states
  aiAnalysisProgress = 0;
  aiAnalysisStage = '';
  showConfetti = false;

  allAuctions: Auction[] = [];
  allInvAucs: InventoryAuction[] = [];
  allFiles: InventoryDocumentFile[] = [];
  allInventories: Inventory[] = [];
  allProducts: Product[] = [];
  allBids: AuctionBid[] = [];
  allTypes: InspectionType[] = [];
  allCheckpoints: InspectionCheckpoint[] = [];
  allInspections: Inspection[] = [];

  isLightMode = false;

  money = (n?: number | null) =>
    n == null
      ? '—'
      : n.toLocaleString(undefined, {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0
        });

  ngOnInit(): void {
    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const v1 = params.get('vehicle1');
      const v2 = params.get('vehicle2');

      if (!v1) {
        this.error = 'No vehicle selected for comparison.';
        this.loading = false;
        return;
      }

      this.loadAllData(Number(v1), v2 ? Number(v2) : null);
    });

    // Load theme preference
    try {
      const savedTheme = localStorage.getItem('theme-preference');
      if (savedTheme === 'light') {
        this.isLightMode = true;
        setTimeout(() => {
          const hostElement = document.querySelector('app-compare');
          if (hostElement) {
            hostElement.classList.add('light-mode');
          }
        }, 0);
      }
    } catch (e) {
      console.warn('Could not load theme preference:', e);
    }
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  toggleTheme(): void {
    this.isLightMode = !this.isLightMode;

    const hostElement = document.querySelector('app-compare');
    if (hostElement) {
      if (this.isLightMode) {
        hostElement.classList.add('light-mode');
      } else {
        hostElement.classList.remove('light-mode');
      }
    }

    try {
      localStorage.setItem('theme-preference', this.isLightMode ? 'light' : 'dark');
    } catch (e) {
      console.warn('Could not save theme preference:', e);
    }
  }

  private loadAllData(vehicle1Id: number, vehicle2Id: number | null): void {
    this.loading = true;
    this.error = null;

    forkJoin({
      auctions: this.auctionsSvc.getList().pipe(catchError(() => of([] as Auction[]))),
      invAucs: this.invAucSvc.getList().pipe(catchError(() => of([] as InventoryAuction[]))),
      files: this.filesSvc.getList().pipe(catchError(() => of([] as InventoryDocumentFile[]))),
      invs: this.invSvc.getList().pipe(catchError(() => of([] as Inventory[]))),
      products: this.productsSvc.getList().pipe(catchError(() => of([] as Product[]))),
      bids: this.bidsSvc.getList().pipe(catchError(() => of([] as AuctionBid[]))),
      types: this.inspTypesSvc.getList().pipe(catchError(() => of([] as InspectionType[]))),
      checkpoints: this.cpSvc.getList().pipe(catchError(() => of([] as InspectionCheckpoint[]))),
      inspections: this.inspectionsSvc.getList().pipe(catchError(() => of([] as Inspection[])))
    }).subscribe({
      next: data => {
        this.allAuctions = data.auctions || [];
        this.allInvAucs = data.invAucs || [];
        this.allFiles = data.files || [];
        this.allInventories = data.invs || [];
        this.allProducts = data.products || [];
        this.allBids = data.bids || [];
        this.allTypes = data.types || [];
        this.allCheckpoints = data.checkpoints || [];
        this.allInspections = data.inspections || [];

        // Load vehicle 1
        this.vehicle1 = this.buildVehicleData(vehicle1Id);

        if (!this.vehicle1) {
          this.error = 'Vehicle not found.';
          this.loading = false;
          return;
        }

        // Build available vehicles list (from same auction, excluding vehicle1)
        this.availableVehicles = this.buildAvailableVehicles(this.vehicle1.auctionId, vehicle1Id);

        // Load vehicle 2 if provided
        if (vehicle2Id) {
          this.selectedVehicle2Id = vehicle2Id;
          this.vehicle2 = this.buildVehicleData(vehicle2Id);
          
          // Auto-generate AI comparison
          if (this.vehicle1 && this.vehicle2) {
            this.generateAIComparison();
          }
        }

        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load comparison data.';
        this.loading = false;
      }
    });
  }

  private buildVehicleData(invAucId: number): VehicleData | null {
    const lot = this.allInvAucs.find(ia => {
      const id = (ia as any).inventoryAuctionId ?? (ia as any).inventoryauctionId;
      return id === invAucId;
    });

    if (!lot) return null;

    const inventoryId = (lot as any).inventoryId ?? null;
    const auctionId = (lot as any).auctionId ?? (lot as any).AuctionId ?? 0;

    const inventory = inventoryId
      ? this.allInventories.find(i => (i as any).inventoryId === inventoryId) || null
      : null;

    const product = inventory
      ? this.allProducts.find(p => (p as any).productId === (inventory as any).productId) || null
      : null;

    const snap = this.safeParse((inventory as any)?.productJSON);

    const year = (product as any)?.yearName ?? snap?.Year ?? snap?.year;
    const make = (product as any)?.makeName ?? snap?.Make ?? snap?.make;
    const model = (product as any)?.modelName ?? snap?.Model ?? snap?.model;

    const title =
      [year, make, model].filter(Boolean).join(' ') ||
      ((inventory as any)?.displayName ?? 'Vehicle');

    const chassis = (inventory as any)?.chassisNo || snap?.Chassis || snap?.chassis;
    const subtitle = chassis ? `Chassis ${chassis}` : `Lot #${invAucId}`;

    const isImg = (u?: string | null, n?: string | null) => {
      const s = (u || n || '').toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].some(x => s.endsWith(x));
    };

    const images = this.allFiles
      .filter(f => {
        const active = (f as any).active ?? (f as any).Active ?? true;
        return (
          active &&
          (f as any).inventoryId === inventoryId &&
          !!(f as any).documentUrl &&
          isImg((f as any).documentUrl, (f as any).documentName)
        );
      })
      .map(f => (f as any).documentUrl!)
      .slice(0, 32);

    const imageUrl = images.length
      ? images[0]
      : 'https://images.unsplash.com/photo-1517940310602-75e447f00b52?q=80&w=1400&auto=format&fit=crop';

    // Pricing
    const startPrice = (lot as any).auctionStartPrice ?? (lot as any).AuctionStartPrice ?? null;
    const reservePrice = (lot as any).reservePrice ?? (lot as any).ReservePrice ?? null;
    const buyNowPrice = (lot as any).buyNowPrice ?? (lot as any).BuyNowPrice ?? null;
    const bidIncrement = (lot as any).bidIncrement ?? (lot as any).BidIncrement ?? null;

    // Bids
    const lotBids = this.allBids.filter(b => {
      const iaId =
        (b as any).inventoryAuctionId ??
        (b as any).InventoryAuctionId ??
        (b as any).inventoryauctionId;
      return iaId === invAucId;
    });

    const highestBid = lotBids.length
      ? Math.max(
          ...lotBids.map(b =>
            Number((b as any).bidAmount ?? (b as any).BidAmount ?? (b as any).Amount ?? 0)
          )
        )
      : null;

    const currentUserId = this.bidderAuth.currentUser?.userId ?? null;
    const yourBids = currentUserId ? lotBids.filter(b => (b as any).createdById === currentUserId) : [];
    const yourMaxBid = yourBids.length
      ? Math.max(
          ...yourBids.map(b =>
            Number((b as any).bidAmount ?? (b as any).BidAmount ?? (b as any).Amount ?? 0)
          )
        )
      : null;

    const currentPrice = highestBid != null ? highestBid : startPrice ?? null;
    const reserveMet =
      reservePrice != null && reservePrice > 0 && currentPrice != null && currentPrice >= reservePrice;

    // Specs
    const colorExterior = snap?.ExteriorColor ?? snap?.exteriorColor ?? null;
    const colorInterior = snap?.InteriorColor ?? snap?.interiorColor ?? null;
    const drivetrain = snap?.Drivetrain ?? snap?.drivetrain ?? null;
    const transmission = snap?.Transmission ?? snap?.transmission ?? null;
    const bodyStyle = snap?.BodyStyle ?? snap?.bodyStyle ?? null;
    const engine = snap?.Engine ?? snap?.engine ?? null;
    const mileage = snap?.Mileage ?? snap?.mileage ?? null;
    const location = snap?.Location ?? snap?.location ?? null;
    const titleStatus = snap?.TitleStatus ?? snap?.titleStatus ?? null;
    const categoryName = (product as any)?.categoryName ?? snap?.Category ?? snap?.category ?? null;

    const specs = [
      { label: 'Make', value: make || '—' },
      { label: 'Model', value: model || '—' },
      { label: 'Year', value: year || '—' },
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
      { label: 'Title Status', value: titleStatus || '—' }
    ];

    // Inspection
    const inspections = inventoryId
      ? this.allInspections.filter(i => (i as any).inventoryId === inventoryId)
      : [];

    const activeInspections = inspections.filter(i => {
      const active = (i as any).active ?? (i as any).Active ?? true;
      return active !== false && active !== 0;
    });

    const totalCheckpoints = this.allCheckpoints.filter(cp => {
      const active = (cp as any).active ?? (cp as any).Active ?? true;
      return active !== false && active !== 0;
    }).length;

    const completedCheckpoints = activeInspections.length;
    const inspectionComplete = totalCheckpoints > 0 && completedCheckpoints >= totalCheckpoints;
    const inspectionScore = totalCheckpoints > 0 ? (completedCheckpoints / totalCheckpoints) * 100 : null;

    return {
      inventoryAuctionId: invAucId,
      inventoryId,
      auctionId,
      title,
      subtitle,
      imageUrl,
      images,
      currentPrice,
      startPrice,
      reservePrice,
      buyNowPrice,
      bidIncrement,
      reserveMet,
      specs,
      totalBids: lotBids.length,
      yourMaxBid,
      highestBid,
      inspectionScore,
      inspectionComplete,
      totalCheckpoints,
      completedCheckpoints,
      lot,
      inventory,
      product,
      bids: lotBids,
      inspections: activeInspections
    };
  }

  private buildAvailableVehicles(
    auctionId: number,
    excludeId: number
  ): { id: number; label: string; auctionId: number }[] {
    return this.allInvAucs
      .filter(ia => {
        const aucId = (ia as any).auctionId ?? (ia as any).AuctionId;
        const invAucId = (ia as any).inventoryAuctionId ?? (ia as any).inventoryauctionId;
        const active = (ia as any).active ?? (ia as any).Active ?? true;
        return aucId === auctionId && invAucId !== excludeId && active !== false;
      })
      .map(ia => {
        const invAucId = (ia as any).inventoryAuctionId ?? (ia as any).inventoryauctionId;
        const inventoryId = (ia as any).inventoryId;
        const aucId = (ia as any).auctionId ?? (ia as any).AuctionId;

        const inventory = inventoryId
          ? this.allInventories.find(i => (i as any).inventoryId === inventoryId) || null
          : null;

        const product = inventory
          ? this.allProducts.find(p => (p as any).productId === (inventory as any).productId) || null
          : null;

        const snap = this.safeParse((inventory as any)?.productJSON);

        const year = (product as any)?.yearName ?? snap?.Year ?? snap?.year;
        const make = (product as any)?.makeName ?? snap?.Make ?? snap?.make;
        const model = (product as any)?.modelName ?? snap?.Model ?? snap?.model;

        const label =
          [year, make, model].filter(Boolean).join(' ') ||
          ((inventory as any)?.displayName ?? `Lot #${invAucId}`);

        return { id: invAucId, label, auctionId: aucId };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  onVehicle2Change(): void {
    if (!this.selectedVehicle2Id) {
      this.vehicle2 = null;
      this.aiComparison = null;
      this.showAIPanel = false;
      return;
    }

    this.vehicle2 = this.buildVehicleData(this.selectedVehicle2Id);

    // Update URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { vehicle1: this.vehicle1?.inventoryAuctionId, vehicle2: this.selectedVehicle2Id },
      queryParamsHandling: 'merge'
    });

    // Generate AI comparison
    if (this.vehicle1 && this.vehicle2) {
      this.generateAIComparison();
    }
  }

  async generateAIComparison(): Promise<void> {
    if (!this.vehicle1 || !this.vehicle2) return;

    this.loadingAI = true;
    this.showAIPanel = true;
    this.aiAnalysisProgress = 0;
    this.showConfetti = false;

    // Simulate AI analysis stages with progress
    const stages = [
      { label: 'Analyzing pricing data...', duration: 400 },
      { label: 'Evaluating inspection reports...', duration: 600 },
      { label: 'Processing bid activity...', duration: 500 },
      { label: 'Calculating value metrics...', duration: 700 },
      { label: 'Generating recommendations...', duration: 500 }
    ];

    for (let i = 0; i < stages.length; i++) {
      this.aiAnalysisStage = stages[i].label;
      await new Promise(resolve => setTimeout(resolve, stages[i].duration));
      this.aiAnalysisProgress = ((i + 1) / stages.length) * 100;
    }

    try {
      this.aiComparison = this.performSmartComparison(this.vehicle1, this.vehicle2);
      this.showConfetti = true;
      setTimeout(() => (this.showConfetti = false), 3000);
    } catch (err) {
      console.error('Comparison failed:', err);
      this.snack.open('Failed to generate comparison. Please try again.', 'OK', {
        duration: 4000
      });
    } finally {
      this.loadingAI = false;
    }
  }

  private performSmartComparison(v1: VehicleData, v2: VehicleData): AIComparison {
    // Calculate scoring metrics
    let v1Score = 0;
    let v2Score = 0;
    const keyDifferences: string[] = [];
    const pros1: string[] = [];
    const pros2: string[] = [];
    const cons1: string[] = [];
    const cons2: string[] = [];

    // 1. PRICE COMPARISON (30 points)
    const price1 = v1.currentPrice ?? v1.startPrice ?? 0;
    const price2 = v2.currentPrice ?? v2.startPrice ?? 0;
    
    if (price1 > 0 && price2 > 0) {
      const priceDiff = Math.abs(price1 - price2);
      const avgPrice = (price1 + price2) / 2;
      const diffPercent = (priceDiff / avgPrice) * 100;

      if (diffPercent > 15) {
        keyDifferences.push(`${price1 < price2 ? v1.title : v2.title} is ${diffPercent.toFixed(0)}% more affordable`);
      }

      if (price1 < price2) {
        v1Score += 30;
        pros1.push('Lower current bidding price');
        cons2.push('Higher bidding price may reduce value');
      } else if (price2 < price1) {
        v2Score += 30;
        pros2.push('Lower current bidding price');
        cons1.push('Higher bidding price may reduce value');
      } else {
        v1Score += 15;
        v2Score += 15;
      }
    }

    // 2. INSPECTION COMPLETION (25 points)
    const insp1 = v1.inspectionScore ?? 0;
    const insp2 = v2.inspectionScore ?? 0;

    if (insp1 !== insp2) {
      keyDifferences.push(`${insp1 > insp2 ? v1.title : v2.title} has a more complete inspection report`);
    }

    if (v1.inspectionComplete) {
      v1Score += 25;
      pros1.push('Complete inspection report available');
    } else if (insp1 > 50) {
      v1Score += 15;
      pros1.push(`${insp1.toFixed(0)}% inspection completion`);
    } else {
      cons1.push('Incomplete inspection report');
    }

    if (v2.inspectionComplete) {
      v2Score += 25;
      pros2.push('Complete inspection report available');
    } else if (insp2 > 50) {
      v2Score += 15;
      pros2.push(`${insp2.toFixed(0)}% inspection completion`);
    } else {
      cons2.push('Incomplete inspection report');
    }

    // 3. BID ACTIVITY (20 points)
    if (v1.totalBids > v2.totalBids) {
      const diff = v1.totalBids - v2.totalBids;
      if (diff >= 5) {
        v1Score += 20;
        pros1.push(`Strong bidding interest with ${v1.totalBids} bids`);
        keyDifferences.push(`${v1.title} has ${diff} more bids indicating higher demand`);
      } else {
        v1Score += 10;
      }
      if (v2.totalBids < 3) {
        cons2.push('Limited bidding activity');
      }
    } else if (v2.totalBids > v1.totalBids) {
      const diff = v2.totalBids - v1.totalBids;
      if (diff >= 5) {
        v2Score += 20;
        pros2.push(`Strong bidding interest with ${v2.totalBids} bids`);
        keyDifferences.push(`${v2.title} has ${diff} more bids indicating higher demand`);
      } else {
        v2Score += 10;
      }
      if (v1.totalBids < 3) {
        cons1.push('Limited bidding activity');
      }
    } else {
      v1Score += 10;
      v2Score += 10;
    }

    // 4. RESERVE STATUS (15 points)
    if (v1.reserveMet && !v2.reserveMet) {
      v1Score += 15;
      pros1.push('Reserve price already met');
      cons2.push('Reserve price not yet met');
      keyDifferences.push(`${v1.title} has already met its reserve while ${v2.title} has not`);
    } else if (v2.reserveMet && !v1.reserveMet) {
      v2Score += 15;
      pros2.push('Reserve price already met');
      cons1.push('Reserve price not yet met');
      keyDifferences.push(`${v2.title} has already met its reserve while ${v1.title} has not`);
    } else if (v1.reserveMet && v2.reserveMet) {
      v1Score += 7;
      v2Score += 7;
      pros1.push('Reserve price met');
      pros2.push('Reserve price met');
    }

    // 5. MILEAGE COMPARISON (10 points)
    const mileage1 = this.extractMileage(v1);
    const mileage2 = this.extractMileage(v2);

    if (mileage1 && mileage2) {
      if (mileage1 < mileage2) {
        const diff = mileage2 - mileage1;
        if (diff > 20000) {
          v1Score += 10;
          pros1.push('Significantly lower mileage');
          cons2.push('Higher mileage than competitor');
          keyDifferences.push(`${v1.title} has ${(diff / 1000).toFixed(0)}k fewer miles`);
        } else {
          v1Score += 5;
        }
      } else if (mileage2 < mileage1) {
        const diff = mileage1 - mileage2;
        if (diff > 20000) {
          v2Score += 10;
          pros2.push('Significantly lower mileage');
          cons1.push('Higher mileage than competitor');
          keyDifferences.push(`${v2.title} has ${(diff / 1000).toFixed(0)}k fewer miles`);
        } else {
          v2Score += 5;
        }
      } else {
        v1Score += 5;
        v2Score += 5;
      }
    }

    // Add general pros based on specs
    this.addSpecBasedPros(v1, pros1);
    this.addSpecBasedPros(v2, pros2);

    // Determine winner
    let winner: 'vehicle1' | 'vehicle2' | 'tie' = 'tie';
    const totalScore = v1Score + v2Score;
    const scoreDiff = Math.abs(v1Score - v2Score);
    const confidence = totalScore > 0 ? Math.min(95, 65 + (scoreDiff / totalScore) * 30) : 75;

    if (v1Score > v2Score && scoreDiff >= 10) {
      winner = 'vehicle1';
    } else if (v2Score > v1Score && scoreDiff >= 10) {
      winner = 'vehicle2';
    }

    // Generate natural language summaries
    const summary = this.generateSummary(v1, v2, winner, v1Score, v2Score);
    const priceAnalysis = this.generatePriceAnalysis(v1, v2, price1, price2);
    const conditionAnalysis = this.generateConditionAnalysis(v1, v2);
    const valueAnalysis = this.generateValueAnalysis(v1, v2, winner);
    const recommendation = this.generateRecommendation(v1, v2, winner);

    return {
      winner,
      confidence: Math.round(confidence),
      summary,
      priceAnalysis,
      conditionAnalysis,
      valueAnalysis,
      recommendation,
      keyDifferences: keyDifferences.slice(0, 5),
      pros1: pros1.slice(0, 4),
      pros2: pros2.slice(0, 4),
      cons1: cons1.slice(0, 3),
      cons2: cons2.slice(0, 3)
    };
  }

  private extractMileage(v: VehicleData): number | null {
    const mileageSpec = v.specs.find(s => s.label === 'Mileage');
    if (!mileageSpec || !mileageSpec.value) return null;
    
    const value = String(mileageSpec.value).replace(/[^0-9]/g, '');
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  }

  private addSpecBasedPros(v: VehicleData, pros: string[]): void {
    const trans = v.specs.find(s => s.label === 'Transmission')?.value;
    const drive = v.specs.find(s => s.label === 'Drivetrain')?.value;
    const title = v.specs.find(s => s.label === 'Title Status')?.value;

    if (trans && String(trans).toLowerCase().includes('automatic')) {
      pros.push('Automatic transmission for ease of use');
    }
    if (drive && String(drive).toLowerCase().includes('awd')) {
      pros.push('All-wheel drive capability');
    }
    if (title && String(title).toLowerCase().includes('clean')) {
      pros.push('Clean title status');
    }
  }

  private generateSummary(v1: VehicleData, v2: VehicleData, winner: string, score1: number, score2: number): string {
    if (winner === 'vehicle1') {
      return `Our analysis shows ${v1.title} offers superior value with better inspection completion, competitive pricing, and strong market interest. The data indicates this vehicle presents a more compelling investment opportunity.`;
    } else if (winner === 'vehicle2') {
      return `Our analysis shows ${v2.title} offers superior value with better inspection completion, competitive pricing, and strong market interest. The data indicates this vehicle presents a more compelling investment opportunity.`;
    } else {
      return `Both vehicles present competitive options with similar overall value propositions. ${v1.title} and ${v2.title} each have distinct advantages that may appeal to different buyer preferences.`;
    }
  }

  private generatePriceAnalysis(v1: VehicleData, v2: VehicleData, price1: number, price2: number): string {
    const diff = Math.abs(price1 - price2);
    const cheaper = price1 < price2 ? v1.title : v2.title;
    const expensive = price1 > price2 ? v1.title : v2.title;

    if (diff > 5000) {
      return `${cheaper} is currently priced ${this.money(diff)} lower than ${expensive}, offering potential savings. However, consider that market demand (indicated by bid activity) may reflect perceived value differences beyond just price.`;
    } else {
      return `Both vehicles are priced competitively within ${this.money(diff)} of each other. At these similar price points, other factors like condition and inspection status become more critical differentiators.`;
    }
  }

  private generateConditionAnalysis(v1: VehicleData, v2: VehicleData): string {
    const insp1 = v1.inspectionScore ?? 0;
    const insp2 = v2.inspectionScore ?? 0;

    if (Math.abs(insp1 - insp2) < 10) {
      return `Both vehicles show similar inspection completion levels. ${v1.title} has ${insp1.toFixed(0)}% completion while ${v2.title} has ${insp2.toFixed(0)}% completion. Further verification recommended before bidding.`;
    } else if (insp1 > insp2) {
      return `${v1.title} demonstrates better documentation with ${insp1.toFixed(0)}% inspection completion compared to ${v2.title}'s ${insp2.toFixed(0)}%. More complete inspections typically correlate with transparent sellers and fewer post-purchase surprises.`;
    } else {
      return `${v2.title} demonstrates better documentation with ${insp2.toFixed(0)}% inspection completion compared to ${v1.title}'s ${insp1.toFixed(0)}%. More complete inspections typically correlate with transparent sellers and fewer post-purchase surprises.`;
    }
  }

  private generateValueAnalysis(v1: VehicleData, v2: VehicleData, winner: string): string {
    if (winner === 'vehicle1') {
      return `${v1.title} appears to offer better overall value when considering price, condition documentation, and market demand indicators. The combination of competitive pricing and comprehensive inspection data suggests lower risk for potential buyers.`;
    } else if (winner === 'vehicle2') {
      return `${v2.title} appears to offer better overall value when considering price, condition documentation, and market demand indicators. The combination of competitive pricing and comprehensive inspection data suggests lower risk for potential buyers.`;
    } else {
      return `Both vehicles offer comparable value propositions. Your decision should factor in personal preferences regarding specific features, brand loyalty, and intended use case rather than purely objective metrics.`;
    }
  }

  private generateRecommendation(v1: VehicleData, v2: VehicleData, winner: string): string {
    if (winner === 'vehicle1') {
      return `Based on comprehensive analysis of pricing, inspection data, and market activity, we recommend focusing your bidding strategy on ${v1.title}. This vehicle demonstrates stronger overall fundamentals and may represent a better long-term investment.`;
    } else if (winner === 'vehicle2') {
      return `Based on comprehensive analysis of pricing, inspection data, and market activity, we recommend focusing your bidding strategy on ${v2.title}. This vehicle demonstrates stronger overall fundamentals and may represent a better long-term investment.`;
    } else {
      return `Both vehicles merit serious consideration. We recommend evaluating your specific needs, budget constraints, and timeline. Consider placing conservative bids on both to maximize your chances while staying within budget.`;
    }
  }

  viewVehicle(vehicle: VehicleData): void {
    this.router.navigate(['/bidder/auctions', vehicle.auctionId, vehicle.inventoryAuctionId]);
  }

  private safeParse(json?: string | null): any | null {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  get comparisonTitle(): string {
    if (!this.vehicle1) return 'Compare Vehicles';
    if (!this.vehicle2) return `Compare ${this.vehicle1.title}`;
    return `${this.vehicle1.title} vs ${this.vehicle2.title}`;
  }
}