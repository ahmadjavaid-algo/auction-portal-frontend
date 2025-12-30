import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';

import { forkJoin } from 'rxjs';

import { InventoryService } from '../../../../services/inventory.service';
import { InventoryInspectorService } from '../../../../services/inventoryinspector.service';
import { InspectorsService } from '../../../../services/inspectors.service';
import { InventoryDocumentFileService } from '../../../../services/inventorydocumentfile.service';
import { InspectorAuthService } from '../../../../services/inspectorauth';

import { Inventory } from '../../../../models/inventory.model';
import { InventoryInspector } from '../../../../models/inventoryinspector.model';
import { Inspector } from '../../../../models/inspector.model';
import { InventoryDocumentFile } from '../../../../models/inventorydocumentfile.model';

type SummaryTile = {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  trend?: string;
  trendDirection?: 'up' | 'down';
};

type ReportCard = {
  inventoryId: number;
  title: string;
  subtitle: string;
  thumbnail: string | null;
  status?: string;
  progress?: number;
};

type VehicleCard = {
  inventoryId: number;
  title: string;
  subtitle: string;
  thumbnail: string | null;
  assignedToLabel: string;
  isMine: boolean;
  year?: string;
  status?: 'pending' | 'in-progress' | 'completed';
};

type UpcomingCard = {
  inventoryId: number;
  title: string;
  location: string;
  dateTime: string;
  imageUrl: string | null;
  priority?: 'high' | 'medium' | 'low';
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  private invSvc = inject(InventoryService);
  private invInspectorSvc = inject(InventoryInspectorService);
  private inspectorsSvc = inject(InspectorsService);
  private invDocSvc = inject(InventoryDocumentFileService);
  private auth = inject(InspectorAuthService);
  private elementRef = inject(ElementRef);

  loading = true;
  error: string | null = null;

  // ✅ avatar is now a URL string or null (never an object)
  inspector = {
    name: '',
    handle: '',
    avatarUrl: null as string | null,
    role: 'Lead Inspector',
    level: 'Premium'
  };

  summaryTiles: SummaryTile[] = [];
  myReports: ReportCard[] = [];
  upcoming: UpcomingCard | null = null;
  registeredVehicles: VehicleCard[] = [];

  private upcomingList: UpcomingCard[] = [];
  private upcomingIndex = 0;
  private upcomingRotationTimer: any = null;

  showAllVehicles = false;

  public fallbackHero =
    'https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?auto=format&fit=crop&w=1200&q=80';

  totalInspections = 0;
  completedInspections = 0;
  pendingInspections = 0;
  totalVehicles = 0;
  assignedVehicles = 0;
  avgInspectionTime = '2.5h';
  completionRate = 0;

  private io?: IntersectionObserver;
  private observedEls = new WeakSet<Element>();

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    this.initScrollAnimations();
  }

  ngOnDestroy(): void {
    if (this.upcomingRotationTimer) {
      clearInterval(this.upcomingRotationTimer);
      this.upcomingRotationTimer = null;
    }

    try {
      this.io?.disconnect();
    } catch {}
  }

  private initScrollAnimations(): void {
    this.io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            try {
              this.io?.unobserve(entry.target);
            } catch {}
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -80px 0px'
      }
    );
  }

  private observeAnimatedElements(): void {
    if (!this.io) return;

    const root: HTMLElement = this.elementRef.nativeElement as HTMLElement;
    const elements = root.querySelectorAll('.animate-on-scroll');

    elements.forEach((el: Element) => {
      if (this.observedEls.has(el)) return;
      this.observedEls.add(el);
      try {
        this.io!.observe(el);
      } catch {}
    });
  }

  public load(): void {
    this.loading = true;
    this.error = null;

    forkJoin({
      inventories: this.invSvc.getList(),
      mappings: this.invInspectorSvc.getList(),
      inspectors: this.inspectorsSvc.getList(),
      docs: this.invDocSvc.getList()
    }).subscribe({
      next: ({ inventories, mappings, inspectors, docs }) => {
        const invs = inventories ?? [];
        const mapps = mappings ?? [];
        const insps = inspectors ?? [];
        const files = docs ?? [];

        const currentUserId = this.auth.currentUser?.userId ?? null;

        this.buildInspectorHeader(insps, currentUserId);
        const imgMap = this.buildImageMap(files);
        const assignmentMap = this.buildAssignmentMap(mapps);

        const assignedToMe = currentUserId
          ? invs.filter(
              i => assignmentMap.get(i.inventoryId)?.assignedTo === currentUserId
            )
          : [];

        this.buildUpcomingCard(assignedToMe, assignmentMap, imgMap);
        this.buildVehicleCards(invs, assignmentMap, imgMap, insps, currentUserId);
        this.buildMyReports(assignedToMe, imgMap);
        this.buildSummaryTiles(invs, assignmentMap, currentUserId);
        this.calculateStatistics(invs, assignedToMe);
      },
      error: (err) => {
        console.error('Inspector dashboard load failed', err);
        this.error = err?.error?.message || 'Failed to load dashboard.';
      },
      complete: () => {
        this.loading = false;

        setTimeout(() => {
          this.observeAnimatedElements();
        }, 100);
      }
    });
  }

  // ✅ converts string/object avatar into a proper URL string (or null)
  private coerceAvatarUrl(value: unknown): string | null {
    if (!value) return null;

    if (typeof value === 'string') {
      const s = value.trim();
      // Avoid accidentally accepting "[object Object]"
      if (!s || s.toLowerCase() === '[object object]') return null;
      return s;
    }

    if (typeof value === 'object') {
      const v = value as any;
      const candidate =
        v.url ?? v.avatarUrl ?? v.imageUrl ?? v.photoUrl ?? v.path ?? v.downloadUrl ?? null;

      if (typeof candidate === 'string') {
        const s = candidate.trim();
        if (!s || s.toLowerCase() === '[object object]') return null;
        return s;
      }
    }

    return null;
  }

  private buildInspectorHeader(inspectors: Inspector[], currentUserId: number | null): void {
    const user = this.auth.currentUser;
    let displayName = '';
    let handle = '';
    let avatarUrl: string | null = null;

    if (currentUserId != null) {
      const insp = inspectors.find(x => x.userId === currentUserId) || null;
      if (insp) {
        const name = [insp.firstName, insp.lastName].filter(Boolean).join(' ').trim();
        displayName = name || (insp as any).userName || 'Inspector';
        handle = (insp as any).userName ? `@${(insp as any).userName}` : '@inspector';

        // ✅ if your Inspector model has any avatar field, this will pick it up
        avatarUrl = this.coerceAvatarUrl((insp as any).avatarUrl ?? (insp as any).avatar ?? (insp as any).photoUrl);
      }
    }

    if (!displayName) {
      const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
      displayName = name || user?.userName || 'Inspector';
      handle = user?.userName ? `@${user.userName}` : '@inspector';

      // ✅ if auth user has avatar somewhere
      avatarUrl = this.coerceAvatarUrl((user as any)?.avatarUrl ?? (user as any)?.avatar ?? (user as any)?.photoUrl);
    }

    this.inspector = {
      name: displayName,
      handle,
      avatarUrl, // ✅ only string or null
      role: 'Lead Inspector',
      level: 'Premium'
    };
  }

  // ✅ if the avatar image fails to load, fallback to initials
  onAvatarError(): void {
    this.inspector.avatarUrl = null;
  }

  private buildImageMap(files: InventoryDocumentFile[]): Map<number, string> {
    const imageMap = new Map<number, string>();

    const isImage = (d: InventoryDocumentFile): boolean => {
      const s = (
        d.documentUrl ||
        d.documentName ||
        d.documentDisplayName ||
        ''
      )
        .toString()
        .toLowerCase();

      return ['.jpg', '.jpeg', '.png', '.webp'].some(ext => s.endsWith(ext));
    };

    (files || [])
      .filter(f => (f.active ?? true) && f.inventoryId && f.documentUrl && isImage(f))
      .forEach(f => {
        const id = f.inventoryId!;
        if (!imageMap.has(id)) {
          imageMap.set(id, f.documentUrl!);
        }
      });

    return imageMap;
  }

  private buildAssignmentMap(mappings: InventoryInspector[]): Map<number, InventoryInspector> {
    const map = new Map<number, InventoryInspector>();
    (mappings || []).forEach(m => {
      if (m.inventoryId != null) {
        map.set(m.inventoryId, m);
      }
    });
    return map;
  }

  private buildUpcomingCard(
    assignedToMe: Inventory[],
    _assignmentMap: Map<number, InventoryInspector>,
    imgMap: Map<number, string>
  ): void {
    if (this.upcomingRotationTimer) {
      clearInterval(this.upcomingRotationTimer);
      this.upcomingRotationTimer = null;
    }
    this.upcomingList = [];
    this.upcomingIndex = 0;
    this.upcoming = null;

    if (!assignedToMe.length) return;

    const sorted = [...assignedToMe].sort(
      (a, b) => (a.inventoryId ?? 0) - (b.inventoryId ?? 0)
    );

    this.upcomingList = sorted.map((nextInv, idx) => {
      const snap = this.safeParse(nextInv.productJSON);
      const year = snap?.Year ?? snap?.year ?? '';
      const make = snap?.Make ?? snap?.make ?? '';
      const model = snap?.Model ?? snap?.model ?? '';
      const displayName =
        nextInv.displayName ||
        snap?.DisplayName ||
        snap?.displayName ||
        [year, make, model].filter(Boolean).join(' ') ||
        `Inventory #${nextInv.inventoryId}`;

      const img = imgMap.get(nextInv.inventoryId) ?? null;
      const priority = idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low';

      return {
        inventoryId: nextInv.inventoryId,
        title: displayName,
        location: 'Algo Business Hub',
        dateTime: 'Fri, 20th June - 7:00-7:30 PM',
        imageUrl: img,
        priority
      } as UpcomingCard;
    });

    this.upcoming = this.upcomingList[0] ?? null;
    this.startUpcomingRotation();
  }

  private startUpcomingRotation(): void {
    if (this.upcomingList.length <= 1) return;

    this.upcomingRotationTimer = setInterval(() => {
      if (!this.upcomingList.length) return;
      this.upcomingIndex = (this.upcomingIndex + 1) % this.upcomingList.length;
      this.upcoming = this.upcomingList[this.upcomingIndex];
    }, 5000);
  }

  private buildVehicleCards(
    inventories: Inventory[],
    assignmentMap: Map<number, InventoryInspector>,
    imgMap: Map<number, string>,
    inspectors: Inspector[],
    currentUserId: number | null
  ): void {
    this.registeredVehicles = (inventories || []).map((inv, idx) => {
      const snap = this.safeParse(inv.productJSON);
      const year = snap?.Year ?? snap?.year ?? '';
      const make = snap?.Make ?? snap?.make ?? '';
      const model = snap?.Model ?? snap?.model ?? '';
      const reg = inv.registrationNo || '';

      const title =
        inv.displayName ||
        snap?.DisplayName ||
        snap?.displayName ||
        [year, make, model].filter(Boolean).join(' ') ||
        `Inventory #${inv.inventoryId}`;

      const subtitle = reg || `INV-${inv.inventoryId}`;

      const mapping = assignmentMap.get(inv.inventoryId);
      let assignedToLabel = 'Unassigned';
      let isMine = false;
      let status: 'pending' | 'in-progress' | 'completed' = 'pending';

      if (mapping && mapping.assignedTo != null) {
        if (currentUserId != null && mapping.assignedTo === currentUserId) {
          assignedToLabel = 'Assigned to you';
          isMine = true;
          status = idx % 3 === 0 ? 'completed' : idx % 3 === 1 ? 'in-progress' : 'pending';
        } else {
          const insp = inspectors.find(x => x.userId === mapping.assignedTo) || null;
          if (insp) {
            const name = [insp.firstName, insp.lastName].filter(Boolean).join(' ').trim();
            assignedToLabel = `Assigned to ${name || (insp as any).userName}`;
          } else {
            assignedToLabel = `Assigned to #${mapping.assignedTo}`;
          }
        }
      }

      const thumbnail = imgMap.get(inv.inventoryId) ?? null;

      return {
        inventoryId: inv.inventoryId,
        title,
        subtitle,
        thumbnail,
        assignedToLabel,
        isMine,
        year: year?.toString() || '',
        status
      } as VehicleCard;
    });
  }

  private buildMyReports(assignedToMe: Inventory[], imgMap: Map<number, string>): void {
    this.myReports = (assignedToMe || []).map((inv, idx) => {
      const snap = this.safeParse(inv.productJSON);
      const year = snap?.Year ?? snap?.year ?? '';
      const make = snap?.Make ?? snap?.make ?? '';
      const model = snap?.Model ?? snap?.model ?? '';
      const reg = inv.registrationNo || '';

      const title =
        inv.displayName ||
        snap?.DisplayName ||
        snap?.displayName ||
        [year, make, model].filter(Boolean).join(' ') ||
        `Inventory #${inv.inventoryId}`;

      const subtitle = reg || `INV-${inv.inventoryId}`;
      const thumbnail = imgMap.get(inv.inventoryId) ?? null;

      const progress = 40 + (idx * 15) % 60;
      const status = progress >= 80 ? 'Completed' : progress >= 50 ? 'In Progress' : 'Pending';

      return {
        inventoryId: inv.inventoryId,
        title,
        subtitle,
        thumbnail,
        status,
        progress
      } as ReportCard;
    });
  }

  private buildSummaryTiles(
    inventories: Inventory[],
    assignmentMap: Map<number, InventoryInspector>,
    currentUserId: number | null
  ): void {
    const totalVehicles = inventories.length;
    const assignedToMeCount = currentUserId
      ? inventories.filter(
          i => assignmentMap.get(i.inventoryId)?.assignedTo === currentUserId
        ).length
      : 0;

    this.summaryTiles = [
      { label: 'Active Inspections', value: assignedToMeCount, icon: 'assignment', color: '#2c3e50', trend: '+12%', trendDirection: 'up' },
      { label: 'Completed Reports', value: this.myReports.length, icon: 'task_alt', color: '#27ae60', trend: '+8%', trendDirection: 'up' },
      { label: 'Total Vehicles', value: totalVehicles, icon: 'directions_car', color: '#d4af37', trend: '+24%', trendDirection: 'up' },
      { label: 'Avg. Time', value: '2.5h', icon: 'schedule', color: '#8b7355', trend: '-15%', trendDirection: 'down' }
    ];
  }

  private calculateStatistics(inventories: Inventory[], assignedToMe: Inventory[]): void {
    this.totalVehicles = inventories.length;
    this.assignedVehicles = assignedToMe.length;
    this.totalInspections = assignedToMe.length;
    this.completedInspections = Math.floor(assignedToMe.length * 0.65);
    this.pendingInspections = assignedToMe.length - this.completedInspections;
    this.completionRate = assignedToMe.length > 0
      ? Math.round((this.completedInspections / assignedToMe.length) * 100)
      : 0;
  }

  private safeParse(json?: string | null): any | null {
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
  }

  get initials(): string {
    const name = (this.inspector?.name ?? '').toString();
    const parts = name.split(' ').filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts[1]?.[0] ?? '';
    return (a + b).toUpperCase() || 'IN';
  }

  get heroImage(): string {
    return this.upcoming?.imageUrl || this.fallbackHero;
  }

  get visibleRegisteredVehicles(): VehicleCard[] {
    return this.showAllVehicles ? this.registeredVehicles : this.registeredVehicles.slice(0, 6);
  }

  toggleVehicleView(): void {
    this.showAllVehicles = !this.showAllVehicles;
    setTimeout(() => this.observeAnimatedElements(), 50);
  }

  getStatusColor(status?: string): string {
    switch (status) {
      case 'completed': return '#27ae60';
      case 'in-progress': return '#d4af37';
      default: return '#95a5a6';
    }
  }
}
