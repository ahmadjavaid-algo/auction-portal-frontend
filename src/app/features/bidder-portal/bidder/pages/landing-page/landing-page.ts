import { 
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  inject,
  PLATFORM_ID,
  AfterViewInit,
  ElementRef,
  ViewChild
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
import * as THREE from 'three';

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
  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef<HTMLDivElement>;

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

  private observers: IntersectionObserver[] = [];
  private animationFrame?: number;
  private scrollTicking = false;

  // Three.js properties
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private floatingShapes: THREE.Mesh[] = [];
  private particles!: THREE.Points;
  private time = 0;
  private mouse = { x: 0, y: 0 };

  public readonly fallbackHeroImage =
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920&q=80';

  // AI Features with expanded content
  aiFeatures = [
    {
      id: 'report',
      icon: 'psychology',
      title: 'AI Report & Prediction',
      tagline: 'Know Before You Bid',
      description: 'Our AI analyzes every detail in seconds, giving you confidence that takes humans hours to build.',
      features: [
        'Scans 342+ inspection checkpoints instantly',
        'Cross-references 50,000+ comparable vehicles',
        'Predicts final hammer price within 5% accuracy',
        'Flags hidden risks inspectors miss',
        'Generates comprehensive condition reports',
        'Historical price trend analysis'
      ],
      stats: [
        { value: '94%', label: 'Prediction Accuracy' },
        { value: '342', label: 'Checkpoints Analyzed' },
        { value: '3s', label: 'Analysis Time' }
      ],
      testimonial: {
        quote: 'The AI caught a transmission issue the inspector missed. Saved me $40K on what looked like a perfect car.',
        author: 'Marcus Chen',
        role: 'Porsche Collector',
        location: 'San Francisco'
      }
    },
    {
      id: 'comparison',
      icon: 'compare',
      title: 'AI Vehicle Comparison',
      tagline: 'Choose With Confidence',
      description: 'Two similar cars, different histories. Our AI doesn\'t just compare specs—it reveals which one is truly the better investment.',
      features: [
        'Side-by-side analysis across 17+ variables',
        'Service history pattern recognition',
        'Market sentiment analysis',
        'Value-to-price ratio calculation',
        'Ownership cost projections',
        'Investment potential scoring'
      ],
      stats: [
        { value: '87%', label: 'Cost Avoidance Rate' },
        { value: '17', label: 'Analysis Variables' },
        { value: '$15K', label: 'Avg. Savings' }
      ],
      testimonial: {
        quote: 'I was about to bid on the cheaper one. The AI comparison showed me why the other was worth $8K more.',
        author: 'Sarah Kim',
        role: 'Classic Car Investor',
        location: 'Toronto'
      }
    },
    {
      id: 'autobid',
      icon: 'shield_moon',
      title: 'AI AutoBid',
      tagline: 'Win While You Sleep',
      description: 'Set your max, walk away. Our AI monitors 24/7 and bids strategically so you never overpay or miss out.',
      features: [
        'Strategic incremental bidding',
        'Last-second sniper countermeasures',
        '24/7 timezone-agnostic monitoring',
        'Budget protection algorithms',
        'Competitive intelligence tracking',
        'Instant win notifications'
      ],
      stats: [
        { value: '96.2%', label: 'Win Rate' },
        { value: '24/7', label: 'Active Monitoring' },
        { value: '$7K', label: 'Avg. Under Budget' }
      ],
      testimonial: {
        quote: 'Set a $125K max on a Countach. Had dinner, came back, won at $118K. The AI knew exactly when to strike.',
        author: 'David Walsh',
        role: 'Exotic Car Dealer',
        location: 'Miami'
      }
    }
  ];

  ngOnInit(): void {
    this.loadRealAuctionData();

    if (this.isBrowser) {
      const savedTheme = localStorage.getItem('algoTheme');
      if (savedTheme === 'dark') {
        this.isDarkMode = true;
      }

      window.addEventListener('mousemove', this.onMouseMove.bind(this));

      setTimeout(() => {
        this.initScrollAnimations();
        this.initParallaxEffects();
      }, 500);
    }
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      setTimeout(() => {
        this.initThreeJS();
        this.animate();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (this.isBrowser) {
      window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!this.isBrowser || this.scrollTicking) return;

    this.scrollTicking = true;
    window.requestAnimationFrame(() => {
      this.scrollY = window.pageYOffset;
      this.updateScrollProgress();
      this.updateParallaxElements();
      this.scrollTicking = false;
    });
  }

  private updateScrollProgress(): void {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    this.scrollProgress = (this.scrollY / totalHeight) * 100;
  }

  private updateParallaxElements(): void {
    const parallaxElements = document.querySelectorAll('[data-parallax]');
    
    parallaxElements.forEach((el: any) => {
      const speed = parseFloat(el.dataset.parallax) || 0.5;
      const yPos = -(this.scrollY * speed);
      el.style.transform = `translate3d(0, ${yPos}px, 0)`;
    });
  }

  private initParallaxEffects(): void {
    // Parallax will be handled by scroll event
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private initThreeJS(): void {
    if (!this.canvasContainer) return;

    const container = this.canvasContainer.nativeElement;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(this.isDarkMode ? 0x000000 : 0xfafafa, 5, 50);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 20);

    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x000000, 3, 60);
    pointLight1.position.set(15, 15, 15);
    this.scene.add(pointLight1);

    this.createFloatingGeometry();
    this.createParticleField();

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private createFloatingGeometry(): void {
    const geometries = [
      { geo: new THREE.IcosahedronGeometry(1.2, 1), pos: [-6, 3, -8], color: 0x000000 },
      { geo: new THREE.OctahedronGeometry(1, 0), pos: [7, -2, -10], color: 0x000000 },
      { geo: new THREE.TetrahedronGeometry(1.1, 0), pos: [-5, -4, -6], color: 0x262626 },
      { geo: new THREE.BoxGeometry(1.8, 1.8, 1.8), pos: [6, 4, -9], color: 0x404040 },
      { geo: new THREE.TorusGeometry(1, 0.35, 16, 32), pos: [-7, -1, -12], color: 0x000000 },
      { geo: new THREE.ConeGeometry(0.9, 1.8, 6), pos: [0, 5, -7], color: 0x171717 }
    ];

    geometries.forEach((data) => {
      const material = new THREE.MeshStandardMaterial({
        color: data.color,
        metalness: 0.85,
        roughness: 0.15,
        emissive: data.color,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.8,
        wireframe: false
      });

      const mesh = new THREE.Mesh(data.geo, material);
      mesh.position.set(data.pos[0], data.pos[1], data.pos[2]);
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      mesh.userData['rotationSpeed'] = {
        x: (Math.random() - 0.5) * 0.015,
        y: (Math.random() - 0.5) * 0.015,
        z: (Math.random() - 0.5) * 0.015
      };
      mesh.userData['floatOffset'] = Math.random() * Math.PI * 2;
      mesh.userData['floatSpeed'] = 0.3 + Math.random() * 0.4;
      mesh.userData['originalY'] = data.pos[1];

      this.floatingShapes.push(mesh);
      this.scene.add(mesh);

      const edges = new THREE.EdgesGeometry(data.geo);
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x000000,
        transparent: true,
        opacity: 0.3
      });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(wireframe);
    });
  }

  private createParticleField(): void {
    const particleCount = 1500;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorPalette = [
      new THREE.Color(0x000000),
      new THREE.Color(0x262626),
      new THREE.Color(0x404040),
      new THREE.Color(0x737373)
    ];

    for (let i = 0; i < particleCount; i++) {
      const radius = 12 + Math.random() * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi) - 5;

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private animate(): void {
    this.animationFrame = requestAnimationFrame(() => this.animate());
    this.time += 0.008;

    this.floatingShapes.forEach((shape, index) => {
      const rotSpeed = shape.userData['rotationSpeed'];
      shape.rotation.x += rotSpeed.x;
      shape.rotation.y += rotSpeed.y;
      shape.rotation.z += rotSpeed.z;

      const floatOffset = shape.userData['floatOffset'];
      const floatSpeed = shape.userData['floatSpeed'];
      const originalY = shape.userData['originalY'];
      shape.position.y = originalY + Math.sin(this.time * floatSpeed + floatOffset) * 1.2;
      shape.position.x += Math.cos(this.time * 0.3 + index) * 0.008;

      const pulseScale = 1 + Math.sin(this.time * 2 + index * 0.5) * 0.04;
      shape.scale.set(pulseScale, pulseScale, pulseScale);
    });

    if (this.particles) {
      this.particles.rotation.y += 0.0002;
      this.particles.rotation.x = Math.sin(this.time * 0.2) * 0.1;
    }

    this.camera.position.x += (this.mouse.x * 2 - this.camera.position.x) * 0.03;
    this.camera.position.y += ((-this.mouse.y * 2) - this.camera.position.y) * 0.03;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
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
      threshold: [0, 0.1, 0.2, 0.3], 
      rootMargin: '0px 0px -100px 0px' 
    };

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          
          // Stagger children
          const children = entry.target.querySelectorAll('.stagger-item');
          children.forEach((child, index) => {
            setTimeout(() => {
              child.classList.add('visible');
            }, index * 100);
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
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('algoTheme', this.isDarkMode ? 'dark' : 'light');
  }
}