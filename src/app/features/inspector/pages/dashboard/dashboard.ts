// src/app/pages/inspector/dashboard/dashboard.ts 
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
};

type ReportCard = {
  title: string;
  month: string;
  year: number;
};

type VehicleCard = {
  inventoryId: number;
  title: string;
  subtitle: string;
  thumbnail: string | null;
  assignedToLabel: string;
  isMine: boolean;
};

type UpcomingCard = {
  inventoryId: number;
  title: string;
  location: string;
  dateTime: string;
  imageUrl: string | null;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard {
  private invSvc = inject(InventoryService);
  private invInspectorSvc = inject(InventoryInspectorService);
  private inspectorsSvc = inject(InspectorsService);
  private invDocSvc = inject(InventoryDocumentFileService);
  private auth = inject(InspectorAuthService);

  loading = true;
  error: string | null = null;

  inspector = {
    name: '',
    handle: '',
    avatar: ''
  };

  summaryTiles: SummaryTile[] = [];

  myReports: ReportCard[] = [
    { title: 'BMW M3 Inspection Report', month: 'June', year: 2024 },
    { title: 'Jaguar XE L P250 Inspection Report', month: 'Dec', year: 2023 },
    { title: 'Yamaha YZF-R3 Inspection Report', month: 'Dec', year: 2023 }
  ];

  upcoming: UpcomingCard | null = null;
  registeredVehicles: VehicleCard[] = [];

  public fallbackHero =
    'https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?auto=format&fit=crop&w=1200&q=80';

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
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
          ? invs.filter(i => assignmentMap.get(i.inventoryId)?.assignedTo === currentUserId)
          : [];

        this.buildUpcomingCard(assignedToMe, assignmentMap, imgMap);
        this.buildVehicleCards(invs, assignmentMap, imgMap, insps, currentUserId);
        this.buildSummaryTiles(invs, assignmentMap, currentUserId);
      },
      error: (err) => {
        console.error('Inspector dashboard load failed', err);
        this.error = err?.error?.message || 'Failed to load dashboard.';
      },
      complete: () => (this.loading = false)
    });
  }

  private buildInspectorHeader(inspectors: Inspector[], currentUserId: number | null): void {
    const user = this.auth.currentUser;
    let displayName = '';
    let handle = '';

    if (currentUserId != null) {
      const insp = inspectors.find(x => x.userId === currentUserId) || null;
      if (insp) {
        const name = [insp.firstName, insp.lastName].filter(Boolean).join(' ').trim();
        displayName = name || insp.userName || 'Inspector';
        handle = insp.userName ? `@${insp.userName}` : '@inspector';
      }
    }

    if (!displayName) {
      const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
      displayName = name || user?.userName || 'Inspector';
      handle = user?.userName ? `@${user.userName}` : '@inspector';
    }

    this.inspector = {
      name: displayName,
      handle,
      avatar: ''
    };
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

  private buildAssignmentMap(
    mappings: InventoryInspector[]
  ): Map<number, InventoryInspector> {
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
    assignmentMap: Map<number, InventoryInspector>,
    imgMap: Map<number, string>
  ): void {
    if (!assignedToMe.length) {
      this.upcoming = null;
      return;
    }

    const nextInv = [...assignedToMe].sort(
      (a, b) => (a.inventoryId ?? 0) - (b.inventoryId ?? 0)
    )[0];

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

    this.upcoming = {
      inventoryId: nextInv.inventoryId,
      title: displayName,
      location: 'QuickCheck Auto',
      dateTime: 'Fri, 20th June - 7:00-7:30 PM',
      imageUrl: img
    };
  }

  private buildVehicleCards(
    inventories: Inventory[],
    assignmentMap: Map<number, InventoryInspector>,
    imgMap: Map<number, string>,
    inspectors: Inspector[],
    currentUserId: number | null
  ): void {
    this.registeredVehicles = (inventories || []).map(inv => {
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

      if (mapping && mapping.assignedTo != null) {
        if (currentUserId != null && mapping.assignedTo === currentUserId) {
          assignedToLabel = 'Assigned to you';
          isMine = true;
        } else {
          const insp = inspectors.find(x => x.userId === mapping.assignedTo) || null;
          if (insp) {
            const name = [insp.firstName, insp.lastName].filter(Boolean).join(' ').trim();
            assignedToLabel = `Assigned to ${name || insp.userName}`;
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
        isMine
      } as VehicleCard;
    });
  }

  private buildSummaryTiles(
    inventories: Inventory[],
    assignmentMap: Map<number, InventoryInspector>,
    currentUserId: number | null
  ): void {
    const totalVehicles = inventories.length;
    const assignedToMe = currentUserId
      ? inventories.filter(i => assignmentMap.get(i.inventoryId)?.assignedTo === currentUserId)
          .length
      : 0;
    const unassigned = inventories.filter(
      i => !assignmentMap.get(i.inventoryId) || !assignmentMap.get(i.inventoryId)!.assignedTo
    ).length;

    this.summaryTiles = [
      { label: 'Inspections', value: String(assignedToMe).padStart(2, '0'), icon: 'description',  color: '#6366f1' },
      { label: 'Reports',     value: String(this.myReports.length).padStart(2, '0'), icon: 'assignment', color: '#ec4899' },
      { label: 'Vehicles',    value: String(totalVehicles).padStart(2, '0'), icon: 'directions_car', color: '#06b6d4' }
    ];
  }

  private safeParse(json?: string | null): any | null {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  get initials(): string {
    const parts = this.inspector.name.split(' ').filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts[1]?.[0] ?? '';
    return (a + b).toUpperCase();
  }

  get heroImage(): string {
    return this.upcoming?.imageUrl || this.fallbackHero;
  }
}
