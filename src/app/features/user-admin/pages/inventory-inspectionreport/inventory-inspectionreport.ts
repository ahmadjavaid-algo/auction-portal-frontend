// src/app/pages/admin/inventory/inventory-inspectionreport/inventory-inspectionreport.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule } from '@angular/forms';

import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { InventoryService } from '../../../../services/inventory.service';
import { InventoryInspectorService } from '../../../../services/inventoryinspector.service';
import { InspectorsService } from '../../../../services/inspectors.service';
import { AuthService } from '../../../../services/auth';
import { InspectionTypesService } from '../../../../services/inspectiontypes.service';
import { InspectionCheckpointsService } from '../../../../services/inspectioncheckpoints.service';
import { InspectionsService } from '../../../../services/inspection.service';
import { InventoryDocumentFileService } from '../../../../services/inventorydocumentfile.service';

import { Inventory } from '../../../../models/inventory.model';
import { InventoryInspector } from '../../../../models/inventoryinspector.model';
import { Inspector } from '../../../../models/inspector.model';
import { InspectionType } from '../../../../models/inspectiontype.model';
import { InspectionCheckpoint } from '../../../../models/inspectioncheckpoint.model';
import { Inspection } from '../../../../models/inspection.model';
import { InventoryDocumentFile } from '../../../../models/inventorydocumentfile.model';

type SummaryTile = {
  label: string;
  value: number | string;
  icon: string;
  color: string;
};

type NormalizedInputType = 'text' | 'textarea' | 'number' | 'yesno' | 'image';

interface InspectionCheckpointRow {
  inspectionId?: number;
  inspectionTypeId: number;
  inspectionTypeName: string;
  inspectionCheckpointId: number;
  inspectionCheckpointName: string;
  inputType?: string | null;
  resultValue: string;
  imageUrls?: string[]; // for image checkpoints
}

interface InspectionTypeGroupForUI {
  inspectionTypeId: number;
  inspectionTypeName: string;
  weightage?: number | null;
  checkpoints: InspectionCheckpointRow[];
}

@Component({
  selector: 'app-inventory-inspectionreport',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTabsModule,
    FormsModule
  ],
  templateUrl: './inventory-inspectionreport.html',
  styleUrls: ['./inventory-inspectionreport.scss']
})
export class InventoryInspectionreport {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private invSvc = inject(InventoryService);
  private invInspectorSvc = inject(InventoryInspectorService);
  private inspectorsSvc = inject(InspectorsService);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);

  private inspTypesSvc = inject(InspectionTypesService);
  private cpSvc = inject(InspectionCheckpointsService);
  private inspectionsSvc = inject(InspectionsService);
  private invDocSvc = inject(InventoryDocumentFileService);

  inventoryId!: number;

  loading = true;
  saving = false;
  error: string | null = null;

  inventory: Inventory | null = null;
  inspectors: Inspector[] = [];
  assignment: InventoryInspector | null = null;

  // bound to dropdown
  selectedInspectorId: number | null = null;

  // inspection report data
  allTypes: InspectionType[] = [];
  allCheckpoints: InspectionCheckpoint[] = [];
  reportGroups: InspectionTypeGroupForUI[] = [];
  reportLoaded = false;

  // inventory-level images
  inventoryImages: string[] = [];

  // shared image viewer (inventory photos + checkpoint images)
  selectedImageGallery: string[] = [];
  selectedImageIndex = 0;
  showImageViewer = false;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid inventory id.';
      this.loading = false;
      return;
    }

    this.inventoryId = id;
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    this.error = null;
    this.reportGroups = [];
    this.reportLoaded = false;
    this.inventoryImages = [];

    forkJoin({
      inventory: this.invSvc.getById(this.inventoryId),
      inspectors: this.inspectorsSvc.getList(),
      mappings: this.invInspectorSvc.getList(),
      types: this.inspTypesSvc.getList(),
      checkpoints: this.cpSvc.getList(),
      inspections: this.inspectionsSvc.getByInventory(this.inventoryId).pipe(
        catchError(() => of([] as Inspection[]))
      ),
      docs: this.invDocSvc.getList().pipe(
        catchError(() => of([] as InventoryDocumentFile[]))
      )
    }).subscribe({
      next: ({
        inventory,
        inspectors,
        mappings,
        types,
        checkpoints,
        inspections,
        docs
      }) => {
        if (!inventory) {
          this.inventory = null;
          this.error = 'Inventory not found.';
          return;
        }

        this.inventory = inventory ?? null;
        this.inspectors = inspectors ?? [];

        const existing = (mappings ?? []).find(
          m => m.inventoryId === this.inventoryId
        ) ?? null;
        this.assignment = existing;
        this.selectedInspectorId = existing?.assignedTo ?? null;

        this.allTypes = types ?? [];
        this.allCheckpoints = checkpoints ?? [];

        // inventory-level images (same logic as inspector inspections page)
        this.inventoryImages = this.buildInventoryImages(docs ?? [], this.inventoryId);

        this.reportGroups = this.buildGroupsForInventory(
          this.inventory,
          inspections ?? []
        );
        this.reportLoaded = true;
      },
      error: (err) => {
        console.error('Failed to load inspection report data', err);
        this.error =
          err?.error?.message || 'Failed to load inspection report data.';
      },
      complete: () => (this.loading = false)
    });
  }

  back(): void {
    this.router.navigate(['/admin/inventory']);
  }

  // ---------- INVENTORY DISPLAY ----------

  get inventoryTitle(): string {
    if (!this.inventory) return '(No inventory)';
    if (this.inventory.displayName) return this.inventory.displayName;
    const pj = this.safeParse(this.inventory.productJSON);
    return pj?.DisplayName || pj?.displayName || `Inventory #${this.inventory.inventoryId}`;
  }

  get inventorySubtitle(): string {
    if (!this.inventory) return '';
    const pj = this.safeParse(this.inventory.productJSON);

    const bits: string[] = [];
    const make = pj?.Make || pj?.make;
    const model = pj?.Model || pj?.model;
    const year = pj?.Year || pj?.year;

    if (make) bits.push(make);
    if (model) bits.push(model);
    if (year) bits.push(year);

    return bits.join(' • ');
  }

  private safeParse(json?: string | null): any | null {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  // ---------- INSPECTOR ASSIGNMENT ----------

  getInspectorDisplay(i: Inspector): string {
    const name = [i.firstName, i.lastName].filter(Boolean).join(' ').trim();
    if (name) return `${name} (${i.userName})`;
    return i.userName || `Inspector #${i.userId}`;
  }

  get currentInspectorName(): string {
    if (!this.assignment || !this.assignment.assignedTo) return 'Unassigned';

    const match = this.inspectors.find(
      x => x.userId === this.assignment!.assignedTo
    );
    if (match) return this.getInspectorDisplay(match);
    if (this.assignment.inspectorName) return this.assignment.inspectorName;

    return `Inspector #${this.assignment.assignedTo}`;
  }

  get hasAssignment(): boolean {
    return !!(this.assignment && this.assignment.assignedTo);
  }

  saveAssignment(): void {
    if (!this.selectedInspectorId) {
      this.snack.open('Please select an inspector to assign.', 'Dismiss', {
        duration: 2500
      });
      return;
    }

    const currentUserId = this.auth.currentUser?.userId ?? null;
    this.saving = true;

    if (this.assignment && this.assignment.inventoryInspectorId > 0) {
      // update existing mapping
      const payload: InventoryInspector = {
        inventoryInspectorId: this.assignment.inventoryInspectorId,
        assignedTo: this.selectedInspectorId,
        inventoryId: this.inventoryId,
        inspectorName: this.assignment.inspectorName ?? undefined,
        createdById: this.assignment.createdById ?? currentUserId,
        createdDate: this.assignment.createdDate ?? null,
        modifiedById: currentUserId,
        modifiedDate: null,
        active: this.assignment.active ?? true
      };

      this.invInspectorSvc.update(payload).subscribe({
        next: (ok) => {
          if (ok) {
            this.snack.open('Inspector assignment updated.', 'OK', {
              duration: 2500
            });
            this.assignment = payload;
          } else {
            this.snack.open('Failed to update assignment.', 'Dismiss', {
              duration: 3000
            });
          }
        },
        error: (err) => {
          console.error('Failed to update assignment', err);
          this.snack.open(
            err?.error?.message || 'Failed to update assignment.',
            'Dismiss',
            { duration: 3000 }
          );
        },
        complete: () => (this.saving = false)
      });
    } else {
      // create new mapping
      const payload: InventoryInspector = {
        inventoryInspectorId: 0,
        assignedTo: this.selectedInspectorId,
        inventoryId: this.inventoryId,
        inspectorName: undefined,
        createdById: currentUserId,
        createdDate: null,
        modifiedById: currentUserId,
        modifiedDate: null,
        active: true
      };

      this.invInspectorSvc.add(payload).subscribe({
        next: (id) => {
          this.snack.open('Inspector assigned to inventory.', 'OK', {
            duration: 2500
          });
          this.assignment = { ...payload, inventoryInspectorId: id };
        },
        error: (err) => {
          console.error('Failed to assign inspector', err);
          this.snack.open(
            err?.error?.message || 'Failed to assign inspector.',
            'Dismiss',
            { duration: 3000 }
          );
        },
        complete: () => (this.saving = false)
      });
    }
  }

  clearAssignment(): void {
    if (!this.assignment || !this.assignment.inventoryInspectorId) return;

    const currentUserId = this.auth.currentUser?.userId ?? null;
    this.saving = true;

    this.invInspectorSvc
      .update({
        inventoryInspectorId: this.assignment.inventoryInspectorId,
        assignedTo: null,
        inventoryId: this.inventoryId,
        inspectorName: this.assignment.inspectorName ?? undefined,
        createdById: this.assignment.createdById ?? currentUserId,
        createdDate: this.assignment.createdDate ?? null,
        modifiedById: currentUserId,
        modifiedDate: null,
        active: this.assignment.active ?? true
      } as InventoryInspector)
      .subscribe({
        next: (ok) => {
          if (ok) {
            this.assignment = {
              ...this.assignment!,
              assignedTo: null
            };
            this.selectedInspectorId = null;
            this.snack.open('Inspector unassigned from this inventory.', 'OK', {
              duration: 2500
            });
          } else {
            this.snack.open('Failed to clear assignment.', 'Dismiss', {
              duration: 3000
            });
          }
        },
        error: (err) => {
          console.error('Failed to clear assignment', err);
          this.snack.open(
            err?.error?.message || 'Failed to clear assignment.',
            'Dismiss',
            { duration: 3000 }
          );
        },
        complete: () => (this.saving = false)
      });
  }

  // ---------- REPORT BUILDING + IMAGES ----------

  private isActiveInspection(i: Inspection): boolean {
    const raw =
      (i as any).active ??
      (i as any).Active ??
      (i as any).isActive ??
      true;
    return raw !== false && raw !== 0;
  }

  private buildInventoryImages(
    files: InventoryDocumentFile[],
    inventoryId: number
  ): string[] {
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

    return (files || [])
      .filter(
        f =>
          (f.active ?? true) &&
          f.inventoryId === inventoryId &&
          !!f.documentUrl &&
          isImage(f)
      )
      .map(f => f.documentUrl!);
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

      if (!cps.length) {
        return;
      }

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
          imageUrls = cpInspectionsAll
            .map(i => i.result ?? '')
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

  normalizeInputType(inputType?: string | null): NormalizedInputType {
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
        return '#22c55e';
      case 'In Progress':
        return '#f59e0b';
      default:
        return '#94a3b8';
    }
  }

  isYesNo(value: string | null | undefined): boolean {
    if (!value) return false;
    const v = value.toLowerCase();
    return v === 'pass' || v === 'fail';
  }

  // ---------- IMAGE VIEWER (inventory + checkpoint images) ----------

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
}
