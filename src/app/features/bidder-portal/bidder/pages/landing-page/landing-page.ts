import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { InventoryAuctionService } from '../../../../../services/inventoryauctions.service';
import { InventoryDocumentFileService } from '../../../../../services/inventorydocumentfile.service';
import { InventoryService } from '../../../../../services/inventory.service';

import { InventoryAuction } from '../../../../../models/inventoryauction.model';
import { InventoryDocumentFile } from '../../../../../models/inventorydocumentfile.model';
import { Inventory } from '../../../../../models/inventory.model';

import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

interface EnrichedAuction {
  auction: InventoryAuction;
  imageUrl: string | null;
  year?: string | number | null;
  make?: string | null;
  model?: string | null;
  vehicleDetails?: any;
}

type TiltHandlers = {
  onMove: (ev: MouseEvent) => void;
  onLeave: (ev: MouseEvent) => void;
};

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss'
})
export class LandingPage implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private auctionSvc = inject(InventoryAuctionService);
  private fileSvc = inject(InventoryDocumentFileService);
  private inventorySvc = inject(InventoryService);

  private router = inject(Router);

  public readonly homeLink = ['/bidder'];
  public readonly loginLink = ['/bidder', 'login'];
  public readonly signupLink = ['/bidder', 'signup'];

  public readonly algoLogoUrl =
    'https://media.licdn.com/dms/image/v2/C560BAQGJ-j7r23Z79Q/company-logo_200_200/company-logo_200_200/0/1656698792543/algoai_logo?e=2147483647&v=beta&t=QaHGa0R70yu1J352TZfGUk4z2PUigcta-pMyLIznFG8';

  loading = true;
  error: string | null = null;

  liveAuctions: EnrichedAuction[] = [];
  featuredAuctions: EnrichedAuction[] = [];
  heroAuction: EnrichedAuction | null = null;

  mouseX = 0;
  mouseY = 0;
  scrollY = 0;

  // Cursor position for magnetic effects
  cursorX = 0;
  cursorY = 0;

  // ✅ Tilt tracking (store actual attached listeners so we can remove them)
  private tiltHandlers: Map<HTMLElement, TiltHandlers> = new Map();

  heroRevealed = false;
  statsRevealed = false;
  contentRevealed = false;

  autoBidStats = {
    winRate: 94,
    averageSavings: 47000,
    activeMonitoring: '24/7',
    fastestBid: '180ms',
    totalBids: 2847,
    successRate: 96.2
  };

  inspectionTypes = [
    {
      icon: 'engineering',
      name: 'Mechanical Deep-Dive',
      checkpoints: 147,
      description:
        'Engine compression, transmission health, drivetrain integrity, suspension geometry, brake pad depth',
      color: '#00D9FF'
    },
    {
      icon: 'brush',
      name: 'Exterior Forensics',
      checkpoints: 89,
      description:
        'Paint depth meter readings, bodywork assessment, panel gap measurements, glass condition matrix',
      color: '#FF3366'
    },
    {
      icon: 'airline_seat_recline_extra',
      name: 'Interior Analysis',
      checkpoints: 72,
      description:
        'Upholstery condition, electronic system tests, climate control calibration, dashboard diagnostics',
      color: '#FFE600'
    },
    {
      icon: 'description',
      name: 'Documentation Audit',
      checkpoints: 34,
      description:
        'Service history verification, ownership records, accident reports, maintenance log analysis',
      color: '#00FF88'
    }
  ];

  testimonials = [
    {
      quote:
        'The inspection reports are insanely detailed. 147 mechanical checkpoints gave me confidence to bid $280K sight unseen. AutoBid won it while I was in meetings.',
      author: 'Marcus Ashford',
      role: 'Private Collector',
      location: 'London',
      avatar: 'MA',
      highlight: 'Won 12 vehicles via AutoBid',
      verified: true
    },
    {
      quote:
        'As a dealer, the structured inspection system is revolutionary. No more guessing from photos. Clear risk assessment on every lot. AutoBid handles timezone differences perfectly.',
      author: 'Yuki Tanaka',
      role: 'Exotic Car Dealer',
      location: 'Tokyo',
      avatar: 'YT',
      highlight: '€2.4M in transactions',
      verified: true
    },
    {
      quote:
        'Checkpoint-based inspections changed everything. I can see exactly where the car stands on paint depth, mechanical health, documentation. AutoBid got me a 1967 Shelby at 3 AM my time.',
      author: 'David Chen',
      role: 'Vintage Collector',
      location: 'Singapore',
      avatar: 'DC',
      highlight: '23 auctions won',
      verified: true
    }
  ];

  differentiators = [
    {
      id: 'autobid',
      icon: 'psychology',
      title: 'AI AutoBid Engine',
      tagline: 'Your Relentless 24/7 Bidding Intelligence',
      features: [
        'Machine learning from 50,000+ historical auction patterns',
        'Strategic bid timing based on competitor behavioral analysis',
        'Timezone-agnostic monitoring across global auctions',
        'Budget-protected increments that never exceed limits',
        'Real-time push notifications on every milestone',
        'Predictive win probability scoring'
      ],
      stat: '94%',
      statLabel: 'Win Rate',
      statContext: 'when AutoBid is activated vs. manual bidding'
    },
    {
      id: 'inspections',
      icon: 'verified',
      title: 'Inspection-First Bidding',
      tagline: 'Structured Checkpoints. Zero Guesswork.',
      features: [
        'Up to 147 mechanical checkpoints per vehicle',
        'Certified inspector reports with photo documentation',
        'Paint depth readings and panel gap measurements',
        'Fluid analysis and compression testing',
        'Service history verification and ownership docs',
        'AI-powered risk scoring for instant clarity'
      ],
      stat: '342',
      statLabel: 'Avg Checkpoints',
      statContext: 'average per vehicle across all inspection types'
    }
  ];

  processSteps = [
    {
      step: '01',
      title: 'Access Inspection Intel',
      description:
        'Review detailed checkpoint data, photos, and AI risk scores before placing any bid',
      icon: 'search'
    },
    {
      step: '02',
      title: 'Configure AutoBid',
      description: 'Define your max bid, increment strategy, and time constraints with precision',
      icon: 'settings'
    },
    {
      step: '03',
      title: 'AI Takes Control',
      description:
        'AutoBid monitors 24/7, analyzes competitors, places strategic bids at optimal moments',
      icon: 'smart_toy'
    },
    {
      step: '04',
      title: 'Win & Transact',
      description: 'Secure your vehicle at the best price with full transparency and documentation',
      icon: 'emoji_events'
    }
  ];

  private observers: IntersectionObserver[] = [];
  private animationFrame?: number;
  private scrollTicking = false;
  private magneticElements: HTMLElement[] = [];

  public fallbackHeroImage =
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920&q=80';

  ngOnInit(): void {
    this.loading = true;
    this.loadRealAuctionData();

    if (this.isBrowser) {
      setTimeout(() => (this.heroRevealed = true), 200);
      setTimeout(() => (this.statsRevealed = true), 600);

      setTimeout(() => {
        this.contentRevealed = true;
        this.initScrollAnimations();
        this.initParallaxEffects();
        this.initMagneticButtons();
        this.initTiltCards();
        this.startBackgroundAnimation();
        this.initCursorEffects();
      }, 800);
    }
  }

  ngOnDestroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);

    // ✅ Proper cleanup: remove the same function refs we added
    this.tiltHandlers.forEach((handlers, element) => {
      element.removeEventListener('mousemove', handlers.onMove);
      element.removeEventListener('mouseleave', handlers.onLeave);
    });
    this.tiltHandlers.clear();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!this.isBrowser || this.scrollTicking) return;

    this.scrollTicking = true;
    window.requestAnimationFrame(() => {
      this.scrollY = window.pageYOffset;
      this.updateParallax();
      this.updateScrollProgress();
      this.scrollTicking = false;
    });
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isBrowser) return;

    this.mouseX = (event.clientX / window.innerWidth) * 100;
    this.mouseY = (event.clientY / window.innerHeight) * 100;
    this.cursorX = event.clientX;
    this.cursorY = event.clientY;

    this.updateMagneticButtons(event);
    this.updateCustomCursor(event);
  }

  private loadRealAuctionData(): void {
    forkJoin({
      auctions: this.auctionSvc.getList().pipe(catchError(() => of([] as InventoryAuction[]))),
      files: this.fileSvc.getList().pipe(catchError(() => of([] as InventoryDocumentFile[])))
    })
      .pipe(
        switchMap(({ auctions, files }) => {
          const active = (auctions || []).filter(a => a.active ?? true);

          const sorted = [...active].sort((a, b) =>
            this.dateDesc(a.createdDate || a.modifiedDate, b.createdDate || b.modifiedDate)
          );

          const imagesMap = this.buildImagesMap(files);

          const enriched: EnrichedAuction[] = sorted.slice(0, 20).map(a => ({
            auction: a,
            imageUrl: this.pickRandom(imagesMap.get(a.inventoryId)) ?? null
          }));

          const inventoryCalls = enriched.map(e =>
            this.inventorySvc
              .getById(e.auction.inventoryId)
              .pipe(catchError(() => of(null as Inventory | null)))
          );

          if (!inventoryCalls.length) return of(enriched);

          return forkJoin(inventoryCalls).pipe(
            map((inventories: (Inventory | null)[]) => {
              inventories.forEach((inv, i) => {
                const details = this.safeParse(inv?.productJSON);
                enriched[i].year = details?.Year ?? details?.year ?? null;
                enriched[i].make = details?.Make ?? details?.make ?? null;
                enriched[i].model = details?.Model ?? details?.model ?? null;
                enriched[i].vehicleDetails = details;
              });
              return enriched;
            })
          );
        })
      )
      .subscribe({
        next: (enriched) => {
          this.liveAuctions = enriched.slice(0, 12);
          this.featuredAuctions = enriched.slice(0, 8);
          this.heroAuction = enriched.length > 0 ? enriched[0] : null;
          this.loading = false;
        },
        error: () => {
          this.error = 'Failed to load auction data.';
          this.loading = false;
        }
      });
  }

  private initScrollAnimations(): void {
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -80px 0px' };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');

          const children = entry.target.querySelectorAll('.stagger-item');
          children.forEach((child, index) => {
            setTimeout(() => child.classList.add('in-view'), index * 80);
          });
        }
      });
    }, observerOptions);

    setTimeout(() => {
      const elements = document.querySelectorAll('.scroll-reveal');
      elements.forEach(el => observer.observe(el));
    }, 300);

    this.observers.push(observer);
  }

  private initParallaxEffects(): void {
    this.updateParallax();
  }

  private updateParallax(): void {
    const scrolled = this.scrollY;

    const parallaxElements = document.querySelectorAll('[data-parallax]');
    parallaxElements.forEach((el: any) => {
      const speed = parseFloat(el.dataset.parallax) || 0.5;
      const yPos = -(scrolled * speed);
      el.style.transform = `translate3d(0, ${yPos}px, 0)`;
    });

    const hero = document.querySelector('.hero-section') as HTMLElement;
    if (hero) {
      const transformValue = Math.min(scrolled * 0.3, 100);
      hero.style.transform = `perspective(1000px) rotateX(${transformValue * 0.05}deg)`;
    }
  }

  private initMagneticButtons(): void {
    const buttons = document.querySelectorAll('.magnetic-btn');
    buttons.forEach(btn => this.magneticElements.push(btn as HTMLElement));
  }

  private updateMagneticButtons(event: MouseEvent): void {
    this.magneticElements.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distanceX = event.clientX - centerX;
      const distanceY = event.clientY - centerY;
      const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);

      const magnetDistance = 100;

      if (distance < magnetDistance) {
        const strength = 0.3;
        const moveX = distanceX * strength;
        const moveY = distanceY * strength;
        btn.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
      } else {
        btn.style.transform = 'translate(0, 0) scale(1)';
      }
    });
  }

  private initTiltCards(): void {
    setTimeout(() => {
      const cards = document.querySelectorAll('.tilt-card');
      cards.forEach(card => {
        const element = card as HTMLElement;

        const onMove = (ev: MouseEvent) => this.handleTilt(ev, element);
        const onLeave = (_ev: MouseEvent) => this.resetTilt(element);

        this.tiltHandlers.set(element, { onMove, onLeave });

        element.addEventListener('mousemove', onMove);
        element.addEventListener('mouseleave', onLeave);
      });
    }, 1000);
  }

  private handleTilt(event: MouseEvent, element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    element.style.transform =
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

    const glowX = (x / rect.width) * 100;
    const glowY = (y / rect.height) * 100;
    element.style.setProperty('--glow-x', `${glowX}%`);
    element.style.setProperty('--glow-y', `${glowY}%`);
  }

  private resetTilt(element: HTMLElement): void {
    element.style.transform =
      'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  }

  private startBackgroundAnimation(): void {
    let time = 0;
    const animate = () => {
      time += 0.0008;

      const meshes = document.querySelectorAll('.mesh-gradient');
      meshes.forEach((mesh: any, index) => {
        const offset = index * 2.5;
        const x = Math.sin(time + offset) * 80;
        const y = Math.cos(time + offset * 0.8) * 60;
        const scale = 1 + Math.sin(time * 0.5 + offset) * 0.15;
        const rotate = Math.sin(time * 0.3 + offset) * 10;

        mesh.style.transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)`;
      });

      const particles = document.querySelectorAll('.particle');
      particles.forEach((particle: any, index) => {
        const offset = index * 1.5;
        const x = Math.sin(time * 0.5 + offset) * 30;
        const y = Math.cos(time * 0.3 + offset) * 40;
        particle.style.transform = `translate(${x}px, ${y}px)`;
      });

      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  private initCursorEffects(): void {
    const cursor = document.querySelector('.custom-cursor') as HTMLElement;
    const cursorDot = document.querySelector('.custom-cursor-dot') as HTMLElement;

    if (cursor && cursorDot) {
      document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        cursorDot.style.left = e.clientX + 'px';
        cursorDot.style.top = e.clientY + 'px';
      });

      const interactives = document.querySelectorAll('a, button, .auction-card');
      interactives.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('cursor-expanded'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-expanded'));
      });
    }
  }

  private updateCustomCursor(event: MouseEvent): void {
    const cursor = document.querySelector('.custom-cursor') as HTMLElement;
    const dot = document.querySelector('.custom-cursor-dot') as HTMLElement;

    if (cursor && dot) {
      cursor.style.left = event.clientX + 'px';
      cursor.style.top = event.clientY + 'px';
      dot.style.left = event.clientX + 'px';
      dot.style.top = event.clientY + 'px';
    }
  }

  private updateScrollProgress(): void {
    const scrollProgress = document.querySelector('.scroll-progress') as HTMLElement;
    if (scrollProgress) {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (this.scrollY / totalHeight) * 100;
      scrollProgress.style.width = `${progress}%`;
    }
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

  private isImageFile(f: InventoryDocumentFile): boolean {
    const url = (f.documentUrl || '').toLowerCase();
    const name = (f.documentName || '').toLowerCase();

    const extFromUrl = url.match(/\.(\w+)(?:\?|#|$)/)?.[1] || '';
    const extFromName = name.match(/\.(\w+)(?:\?|#|$)/)?.[1] || '';
    const ext = (extFromUrl || extFromName).replace(/[^a-z0-9]/g, '');

    const ok = ['jpg', 'jpeg', 'png', 'webp'];
    return !!url && (ok.includes(ext) || ok.some(e => url.endsWith('.' + e)));
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

  get heroBackground(): string {
    const url = this.heroAuction?.imageUrl || this.fallbackHeroImage;
    return `url('${url}')`;
  }

  get parallaxStyle(): any {
    return {
      transform: `translate3d(0, ${this.scrollY * 0.5}px, 0)`
    };
  }

  formatCurrency(amount?: number | null): string {
    if (amount == null) return '$0';
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  scrollToSection(sectionId: string): void {
    if (this.isBrowser) {
      const element = document.getElementById(sectionId);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  navigateToLogin(): void {
    this.router.navigate(this.loginLink);
  }

  navigateToSignup(): void {
    this.router.navigate(this.signupLink);
  }

  getTimeRemaining(auction: InventoryAuction): string {
    if (!auction.endDate) return 'Ending soon';

    const now = new Date().getTime();
    const end = new Date(auction.endDate).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }

    return `${hours}h ${minutes}m`;
  }

  getBidCount(_auction: InventoryAuction): number {
    return Math.floor(Math.random() * 80) + 20;
  }
}
