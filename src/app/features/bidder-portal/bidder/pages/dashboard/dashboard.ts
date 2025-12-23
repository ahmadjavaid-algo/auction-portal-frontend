import { Component, inject, OnInit, OnDestroy } from '@angular/core';
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
export class Dashboard implements OnInit, OnDestroy {
  readonly Math = Math;

  private auth = inject(BidderAuthService);
  private auctionSvc = inject(InventoryAuctionService);
  private fileSvc = inject(InventoryDocumentFileService);
  private inventorySvc = inject(InventoryService);

  loading = true;
  error: string | null = null;

  slides: Slide[] = [];
  index = 0;

  private autoTimer: any = null;
  private readonly autoIntervalMs = 4800;

  isAnimating = false;
  private readonly animationDurationMs = 720;

  private fallbackHero =
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920';

  stats = [
    { value: '50K+', label: 'Vehicles Auctioned' },
    { value: '98%', label: 'Satisfaction Rate' },
    { value: '24/7', label: 'AI Bidding Active' },
    { value: '150+', label: 'Countries Served' }
  ];

  features = [
    {
      icon: 'psychology',
      title: 'AI Auto-Bidding',
      desc: 'Set your max bid and let our AI handle the rest with intelligent, strategic bidding'
    },
    {
      icon: 'speed',
      title: 'Quick Bid System',
      desc: 'Lightning-fast bidding interface designed for split-second decisions'
    },
    {
      icon: 'verified',
      title: 'Verified Inspections',
      desc: 'Comprehensive inspection sheets from certified professionals you can trust'
    },
    {
      icon: 'security',
      title: 'Secure Transactions',
      desc: 'Bank-grade security with escrow protection for every purchase'
    }
  ];

  testimonials = [
    {
      name: 'Marcus Chen',
      role: 'Collector',
      avatar: 'MC',
      text: 'Found my dream 911 through Algo. The AI bidding saved me hours of manual tracking.',
      rating: 5
    },
    {
      name: 'Sarah Mitchell',
      role: 'Dealer',
      avatar: 'SM',
      text: 'Best auction platform for serious buyers. Inspection reports are incredibly detailed.',
      rating: 5
    },
    {
      name: 'David Park',
      role: 'Enthusiast',
      avatar: 'DP',
      text: 'The quick bid feature is a game-changer. Won 3 auctions in one week!',
      rating: 5
    }
  ];

  ngOnInit(): void {
    this.loading = true;

    forkJoin({
      auctions: this.auctionSvc.getList().pipe(catchError(() => of([] as InventoryAuction[]))),
      files: this.fileSvc.getList().pipe(catchError(() => of([] as InventoryDocumentFile[])))
    })
      .pipe(
        switchMap(({ auctions, files }) => {
          const active = (auctions || []).filter(a => a.active ?? true);

          const recent = [...active]
            .sort((a, b) =>
              this.dateDesc(a.createdDate || a.modifiedDate, b.createdDate || b.modifiedDate)
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

          if (this.slides.length) {
            this.playAnimation();
            this.startAutoRotation();
          }
        },
        error: () => {
          this.error = 'Failed to load dashboard.';
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.clearAutoRotation();
  }

  // ====== Slider controls ======
  prev(): void {
    this.advanceSlide(true, -1);
  }

  next(): void {
    this.advanceSlide(true, 1);
  }

  goTo(i: number): void {
    if (!this.slides.length) return;
    this.clearAutoRotation();
    this.index = Math.max(0, Math.min(i, this.slides.length - 1));
    this.playAnimation();
    this.startAutoRotation();
  }

  public startAutoRotation(): void {
    this.clearAutoRotation();
    if (this.slides.length <= 1) return;

    this.autoTimer = setInterval(() => {
      this.advanceSlide(false, 1);
    }, this.autoIntervalMs);
  }

  public clearAutoRotation(): void {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
  }

  public playAnimation(): void {
    this.isAnimating = false;
    setTimeout(() => {
      this.isAnimating = true;
      setTimeout(() => (this.isAnimating = false), this.animationDurationMs);
    }, 0);
  }

  private advanceSlide(userTriggered: boolean, direction: 1 | -1): void {
    if (!this.slides.length) return;

    if (userTriggered) this.clearAutoRotation();

    this.index = (this.index + direction + this.slides.length) % this.slides.length;
    this.playAnimation();

    if (userTriggered) this.startAutoRotation();
  }

  // ====== Data helpers ======
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
      .filter(f => (f.active ?? true) && !!f.inventoryId && !!f.documentUrl && this.isImageFile(f))
      .forEach(f => {
        const list = map.get(f.inventoryId) || [];
        list.push(f.documentUrl!);
        map.set(f.inventoryId, list);
      });

    return map;
  }

  private pickRandom(arr?: string[]): string | undefined {
    if (!arr || !arr.length) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
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

  formatMoney(n?: number | null): string {
    if (n == null) return '$0';
    return n.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
  }
}
