import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  inject,
  PLATFORM_ID,
  AfterViewInit,
  ElementRef
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
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss'
})
export class LandingPage implements OnInit, OnDestroy, AfterViewInit {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private elementRef = inject(ElementRef);

  private auctionSvc = inject(InventoryAuctionService);
  private fileSvc = inject(InventoryDocumentFileService);
  private inventorySvc = inject(InventoryService);
  private router = inject(Router);

  public readonly algoLogoUrl =
    'https://media.licdn.com/dms/image/v2/C560BAQGJ-j7r23Z79Q/company-logo_200_200/company-logo_200_200/0/1656698792543/algoai_logo?e=2147483647&v=beta&t=QaHGa0R70yu1J352TZfGUk4z2PUigcta-pMyLIznFG8';

  loading = true;
  error: string | null = null;

  featuredAuctions: EnrichedAuction[] = [];
  heroAuction: EnrichedAuction | null = null;

  scrollY = 0;
  scrollProgress = 0;

  isDarkMode = false;
  isThemeTransitioning = false;

  private observers: IntersectionObserver[] = [];
  private animationFrame?: number;
  private scrollTicking = false;

  public readonly fallbackHeroImage =
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920&q=80';

  // Narrative content
  painPoints = [
    {
      icon: 'warning',
      title: 'The Inspection Gamble',
      description: '"150-point inspection" sounds thorough. Until you discover it\'s missing the transmission leak that costs $40,000 to fix.',
      color: '#FF3366'
    },
    {
      icon: 'local_fire_department',
      title: 'The Bidding War Trap',
      description: 'You\'re winning at $175K. You refresh. Someone bid $185K. You panic-bid $195K. You wake up with regret.',
      color: '#FFB020'
    },
    {
      icon: 'visibility_off',
      title: 'The Invisible Competition',
      description: 'How many bidders are serious? How many are tire-kickers? You\'re bidding blind against ghosts.',
      color: '#7C5CFF'
    }
  ];

  aiFeatures = [
    {
      id: 'report',
      icon: 'psychology',
      title: 'AI Report & Prediction',
      tagline: 'The Truth Machine',
      description: 'While others squint at inspection photos, AlgoX AI reads between the lines.',
      features: [
        'Analyzes 342 inspection checkpoints in 3 seconds',
        'Cross-references with 50,000 comparable vehicles',
        'Predicts final hammer price within 5%',
        'Flags hidden risks even inspectors miss'
      ],
      testimonial: {
        quote: 'It told me the reserve was set too high. I waited. Three days later, the seller dropped it by $20K. I won at $165K.',
        author: 'Marcus Chen',
        role: 'Porsche Collector',
        location: 'San Francisco'
      },
      stat: '94%',
      statLabel: 'Prediction Accuracy',
      color: '#2F7BFF'
    },
    {
      id: 'comparison',
      icon: 'compare',
      title: 'AI Vehicle Comparison',
      tagline: 'The Clarity Engine',
      description: 'Two similar vehicles. Different histories. Which one? AlgoX AI doesn\'t just compare specs—it compares destinies.',
      features: [
        'Side-by-side deep analysis across 17 variables',
        'Hidden insight detection (service gaps, market sentiment)',
        'Winner declaration with confidence scoring',
        'Value justification for price differences'
      ],
      testimonial: {
        quote: 'I was about to bid on the cheaper one. The AI comparison saved me from a $15K mistake.',
        author: 'Sarah Kim',
        role: 'Classic Car Investor',
        location: 'Toronto'
      },
      stat: '87%',
      statLabel: 'Cost Avoidance Rate',
      color: '#00FF88'
    },
    {
      id: 'autobid',
      icon: 'shield_moon',
      title: 'AI AutoBid',
      tagline: 'The Guardian',
      description: 'It\'s 3 AM. The auction ends in 4 minutes. You\'re asleep. Your AI isn\'t.',
      features: [
        'Strategic incremental bidding (never reveals max early)',
        'Last-second sniper countermeasures',
        'Timezone-agnostic 24/7 monitoring',
        'Budget protection with zero panic bidding'
      ],
      testimonial: {
        quote: 'I set a $125K max on a 1984 Countach. Went to dinner. Came back. I\'d won at $118K. The AI knew when to pounce.',
        author: 'David Walsh',
        role: 'Exotic Car Dealer',
        location: 'Miami'
      },
      stat: '96.2%',
      statLabel: 'Win Rate',
      color: '#FF3366'
    }
  ];

  trustMetrics = [
    { value: '2,847', label: 'Verified Bidders', icon: 'verified_user' },
    { value: '$127K', label: 'Avg. Purchase Value', icon: 'attach_money' },
    { value: '94%', label: 'Success Rate', icon: 'trending_up' },
    { value: '24/7', label: 'AI Monitoring', icon: 'schedule' }
  ];

  ngOnInit(): void {
    this.loadRealAuctionData();

    if (this.isBrowser) {
      // Check for saved theme preference
      const savedTheme = localStorage.getItem('algoTheme');
      if (savedTheme === 'dark') {
        this.isDarkMode = true;
      }

      setTimeout(() => {
        this.initScrollAnimations();
        this.startParallaxEffects();
      }, 500);
    }
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.initAdvancedScrollEffects();
      this.initNeuralNetworkCanvas();
    }
  }

  ngOnDestroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!this.isBrowser || this.scrollTicking) return;

    this.scrollTicking = true;
    window.requestAnimationFrame(() => {
      this.scrollY = window.pageYOffset;
      this.updateScrollProgress();
      this.updateParallaxElements();
      this.updateHorizontalScrollSections();
      this.scrollTicking = false;
    });
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
          const enriched: EnrichedAuction[] = sorted.slice(0, 8).map(a => ({
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
              });
              return enriched;
            })
          );
        })
      )
      .subscribe({
        next: (enriched) => {
          this.featuredAuctions = enriched;
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
    const observerOptions = { 
      threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5], 
      rootMargin: '0px 0px -100px 0px' 
    };

    // Scroll reveal observer
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          
          // Stagger children
          const children = entry.target.querySelectorAll('.stagger-child');
          children.forEach((child, index) => {
            setTimeout(() => child.classList.add('visible'), index * 100);
          });
        }
      });
    }, observerOptions);

    setTimeout(() => {
      const elements = document.querySelectorAll('.scroll-reveal');
      elements.forEach(el => revealObserver.observe(el));
    }, 300);

    this.observers.push(revealObserver);
  }

  private initAdvancedScrollEffects(): void {
    // Horizontal scroll sections
    const horizontalSections = document.querySelectorAll('.horizontal-scroll-content');
    
    const horizontalObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const section = entry.target as HTMLElement;
          const rect = entry.boundingClientRect;
          const progress = 1 - (rect.top / window.innerHeight);
          const translateX = Math.max(-100, Math.min(0, (progress - 0.5) * 200));
          
          section.style.transform = `translateX(${translateX}%)`;
        }
      });
    }, { threshold: Array.from({ length: 100 }, (_, i) => i / 100) });

    horizontalSections.forEach(section => horizontalObserver.observe(section));
    this.observers.push(horizontalObserver);
  }

  private updateScrollProgress(): void {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    this.scrollProgress = (this.scrollY / totalHeight) * 100;
  }

  private updateParallaxElements(): void {
    const parallaxElements = document.querySelectorAll('[data-parallax-speed]');
    
    parallaxElements.forEach((el: any) => {
      const speed = parseFloat(el.dataset.parallaxSpeed) || 0.5;
      const yPos = -(this.scrollY * speed);
      el.style.transform = `translate3d(0, ${yPos}px, 0)`;
    });
  }

  private updateHorizontalScrollSections(): void {
    const leftScrolls = document.querySelectorAll('.scroll-left');
    const rightScrolls = document.querySelectorAll('.scroll-right');

    leftScrolls.forEach((el: any) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        const progress = 1 - (rect.top / window.innerHeight);
        const translateX = Math.min(0, -50 + (progress * 50));
        el.style.transform = `translateX(${translateX}%)`;
        el.style.opacity = Math.min(1, progress * 2).toString();
      }
    });

    rightScrolls.forEach((el: any) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        const progress = 1 - (rect.top / window.innerHeight);
        const translateX = Math.max(0, 50 - (progress * 50));
        el.style.transform = `translateX(${translateX}%)`;
        el.style.opacity = Math.min(1, progress * 2).toString();
      }
    });
  }

  private startParallaxEffects(): void {
    const animate = () => {
      this.updateParallaxElements();
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  private initNeuralNetworkCanvas(): void {
    const canvas = document.getElementById('neuralCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Neural network nodes
    const nodes: { x: number; y: number; vx: number; vy: number }[] = [];
    const nodeCount = 80;
    
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5
      });
    }

    const drawNetwork = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw nodes
      nodes.forEach((node, i) => {
        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Draw connections
        nodes.forEach((otherNode, j) => {
          if (i === j) return;
          
          const dx = node.x - otherNode.x;
          const dy = node.y - otherNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const opacity = (1 - distance / 150) * 0.15;
            ctx.strokeStyle = `rgba(47, 123, 255, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.stroke();
          }
        });

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(47, 123, 255, 0.4)';
        ctx.fill();
      });

      requestAnimationFrame(drawNetwork);
    };

    drawNetwork();

    // Handle resize
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
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
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/bidder', 'login']);
  }

  navigateToSignup(): void {
    this.router.navigate(['/bidder', 'signup']);
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

  toggleDarkMode(): void {
    if (!this.isBrowser) return;

    // Trigger transition overlay
    this.isThemeTransitioning = true;

    // Toggle after brief delay for smooth transition
    setTimeout(() => {
      this.isDarkMode = !this.isDarkMode;
      localStorage.setItem('algoTheme', this.isDarkMode ? 'dark' : 'light');
    }, 150);

    // Remove transition overlay
    setTimeout(() => {
      this.isThemeTransitioning = false;
    }, 800);
  }
}