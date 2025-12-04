// src/app/pages/inspector/inspections/inspections.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

import { ActivatedRoute } from '@angular/router';

import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { Inventory } from '../../../../models/inventory.model';
import { InventoryInspector } from '../../../../models/inventoryinspector.model';
import { Inspection } from '../../../../models/inspection.model';
import { InspectionType } from '../../../../models/inspectiontype.model';
import { InspectionCheckpoint } from '../../../../models/inspectioncheckpoint.model';
import { InventoryDocumentFile } from '../../../../models/inventorydocumentfile.model';

import { InventoryService } from '../../../../services/inventory.service';
import { InventoryInspectorService } from '../../../../services/inventoryinspector.service';
import { InspectionTypesService } from '../../../../services/inspectiontypes.service';
import { InspectionCheckpointsService } from '../../../../services/inspectioncheckpoints.service';
import { InspectionsService } from '../../../../services/inspection.service';
import { InventoryDocumentFileService } from '../../../../services/inventorydocumentfile.service';
import { InspectorAuthService } from '../../../../services/inspectorauth';

interface InspectionCheckpointRow {
  inspectionId?: number;
  inspectionTypeId: number;
  inspectionTypeName: string;
  inspectionCheckpointId: number;
  inspectionCheckpointName: string;
  inputType?: string | null;
  resultValue: string;
}

interface InspectionTypeGroupForUI {
  inspectionTypeId: number;
  inspectionTypeName: string;
  weightage?: number | null;
  checkpoints: InspectionCheckpointRow[];
}

interface InspectorInventoryBlock {
  inventory: Inventory;
  productName: string;
  productMeta: string;
  groups: InspectionTypeGroupForUI[];
  expanded: boolean;
  saving: boolean;
  images: string[];
  registrationNo: string;
  chassisNo: string;
}

@Component({
  selector: 'app-inspections',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './inspections.html',
  styleUrls: ['./inspections.scss']
})
export class Inspections implements OnInit {
  private invSvc = inject(InventoryService);
  private invInspectorSvc = inject(InventoryInspectorService);
  private inspTypesSvc = inject(InspectionTypesService);
  private cpSvc = inject(InspectionCheckpointsService);
  private inspectionsSvc = inject(InspectionsService);
  private invDocSvc = inject(InventoryDocumentFileService);
  private auth = inject(InspectorAuthService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);

  loading = true;
  error: string | null = null;

  blocks: InspectorInventoryBlock[] = [];
  allTypes: InspectionType[] = [];
  allCheckpoints: InspectionCheckpoint[] = [];

  selectedImageGallery: string[] = [];
  selectedImageIndex = 0;
  showImageViewer = false;

  // query-param based targeting
  private targetInventoryId: number | null = null;
  private hasScrolledToTarget = false;

  ngOnInit(): void {
    // Listen for ?inventoryId=... in the URL
    this.route.queryParamMap.subscribe(params => {
      const id = params.get('inventoryId');
      this.targetInventoryId = id ? +id : null;

      // If data is already loaded, try to scroll immediately
      if (!this.loading && this.blocks.length && this.targetInventoryId) {
        this.scrollToTargetInventory();
      }
    });

    this.loadData();
  }

  // ---------- LOAD DATA ----------

  loadData(): void {
    this.loading = true;
    this.error = null;
    this.blocks = [];
    this.hasScrolledToTarget = false; // reset on reload

    const currentUserId = this.auth.currentUser?.userId ?? null;
    if (!currentUserId) {
      this.error = 'Unable to resolve current inspector. Please sign in again.';
      this.loading = false;
      return;
    }

    forkJoin({
      inventory: this.invSvc.getList(),
      mappings: this.invInspectorSvc.getList(),
      types: this.inspTypesSvc.getList(),
      checkpoints: this.cpSvc.getList(),
      docs: this.invDocSvc.getList()
    })
      .pipe(
        switchMap(({ inventory, mappings, types, checkpoints, docs }) => {
          this.allTypes = types ?? [];
          this.allCheckpoints = checkpoints ?? [];

          const myInventoryIds = (mappings ?? [])
            .filter((m: InventoryInspector) => m.assignedTo === currentUserId)
            .map(m => m.inventoryId);

          const uniqueIds = Array.from(new Set(myInventoryIds));
          const myInventory = (inventory ?? []).filter(i =>
            uniqueIds.includes(i.inventoryId)
          );

          const imageMap = this.buildImagesMap(docs ?? []);

          if (!myInventory.length) {
            this.blocks = [];
            return of(null);
          }

          const calls = myInventory.map(inv =>
            this.inspectionsSvc.getByInventory(inv.inventoryId).pipe(
              catchError(() => of([] as Inspection[]))
            )
          );

          return forkJoin(calls).pipe(
            map(results => {
              const blocks: InspectorInventoryBlock[] = myInventory.map(
                (inv, idx) => ({
                  inventory: inv,
                  productName: this.getProductName(inv),
                  productMeta: this.getProductMeta(inv),
                  registrationNo: inv.registrationNo || 'N/A',
                  chassisNo: inv.chassisNo || 'N/A',
                  groups: this.buildGroupsForInventory(inv, results[idx] ?? []),
                  expanded: false,
                  saving: false,
                  images: imageMap.get(inv.inventoryId) ?? []
                })
              );

              this.blocks = blocks;
              return null;
            })
          );
        }),
        catchError(err => {
          console.error('Failed to load assigned inspections', err);
          this.error =
            err?.error?.message || 'Failed to load assigned inspections.';
          this.blocks = [];
          return of(null);
        })
      )
      .subscribe({
        complete: () => {
          this.loading = false;
          // after everything is loaded, try scrolling to any target from query param
          this.scrollToTargetInventory();
        }
      });
  }

  // Build images map: inventoryId -> all image URLs
  private buildImagesMap(files: InventoryDocumentFile[]): Map<number, string[]> {
    const map = new Map<number, string[]>();

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
      .filter(
        f =>
          (f.active ?? true) &&
          f.inventoryId != null &&
          !!f.documentUrl &&
          isImage(f)
      )
      .forEach(f => {
        const id = f.inventoryId!;
        const arr = map.get(id) ?? [];
        arr.push(f.documentUrl!);
        map.set(id, arr);
      });

    return map;
  }

  // Build UI groups for an inventory using types + checkpoints + existing inspections
  private buildGroupsForInventory(
    inventory: Inventory,
    existing: Inspection[]
  ): InspectionTypeGroupForUI[] {
    const groups: InspectionTypeGroupForUI[] = [];

    const activeTypes = (this.allTypes ?? []).filter(t => t.active !== false);

    activeTypes.forEach(t => {
      const cps = (this.allCheckpoints ?? []).filter(
        cp =>
          ((cp as any).inspectionTypeId === t.inspectionTypeId ||
            (cp as any).InspectionTypeId === t.inspectionTypeId) &&
          cp.active !== false
      );

      if (!cps.length) {
        return;
      }

      const rows: InspectionCheckpointRow[] = cps.map(cp => {
        const cpId =
          (cp as any).inspectionCheckpointId ??
          (cp as any).inspectioncheckpointId;

        const match = existing.find(
          i =>
            i.inspectionTypeId === t.inspectionTypeId &&
            i.inspectionCheckpointId === cpId &&
            i.inventoryId === inventory.inventoryId
        );

        return {
          inspectionId: match?.inspectionId,
          inspectionTypeId: t.inspectionTypeId,
          inspectionTypeName: t.inspectionTypeName,
          inspectionCheckpointId: cpId,
          inspectionCheckpointName:
            (cp as any).inspectionCheckpointName ??
            (cp as any).inspectioncheckpointName ??
            '',
          inputType: cp.inputType,
          resultValue: match?.result ?? ''
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

  // ---------- HELPERS: INVENTORY META ----------

  getProductName(i: Inventory): string {
    if (i.displayName) return i.displayName;
    const pj = this.safeParseProductJSON(i.productJSON);
    return (
      pj?.DisplayName ||
      pj?.displayName ||
      pj?.Name ||
      `Inventory #${i.inventoryId}`
    );
  }

  getProductMeta(i: Inventory): string {
    const pj = this.safeParseProductJSON(i.productJSON);

    const bits: string[] = [];
    const make = pj?.Make || pj?.make;
    const model = pj?.Model || pj?.model;
    const year = pj?.Year || pj?.year;

    if (year) bits.push(year);
    if (make) bits.push(make);
    if (model) bits.push(model);

    return bits.join(' ');
  }

  private safeParseProductJSON(json?: string | null): any | null {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  // ---------- UI HELPERS ----------

  toggleExpanded(block: InspectorInventoryBlock): void {
    block.expanded = !block.expanded;
  }

  normalizeInputType(inputType?: string | null): 'text' | 'textarea' | 'number' | 'yesno' {
    const v = (inputType || '').toLowerCase();
    if (v === 'textarea' || v === 'multiline') return 'textarea';
    if (v === 'number' || v === 'numeric' || v === 'score') return 'number';
    if (v === 'yesno' || v === 'boolean' || v === 'bool') return 'yesno';
    return 'text';
  }

  setYesNo(row: InspectionCheckpointRow, value: 'Pass' | 'Fail'): void {
    row.resultValue = value;
  }

  isAnswered(value?: string | null): boolean {
    return !!(value && value.toString().trim().length);
  }

  getGroupCompleted(group: InspectionTypeGroupForUI): number {
    return group.checkpoints.filter(r => this.isAnswered(r.resultValue)).length;
  }

  getBlockCompleted(block: InspectorInventoryBlock): number {
    return block.groups.reduce(
      (sum, g) => sum + this.getGroupCompleted(g),
      0
    );
  }

  getBlockTotal(block: InspectorInventoryBlock): number {
    return block.groups.reduce(
      (sum, g) => sum + g.checkpoints.length,
      0
    );
  }

  get totalCheckpoints(): number {
    return this.blocks.reduce((sum, b) => sum + this.getBlockTotal(b), 0);
  }

  get totalCompleted(): number {
    return this.blocks.reduce((sum, b) => sum + this.getBlockCompleted(b), 0);
  }

  getBlockProgressPercent(block: InspectorInventoryBlock): number {
    const total = this.getBlockTotal(block);
    if (!total) {
      return 0;
    }
    return Math.round((this.getBlockCompleted(block) / total) * 100);
  }

  getBlockStatus(block: InspectorInventoryBlock): 'Not Started' | 'In Progress' | 'Completed' {
    const total = this.getBlockTotal(block);
    const done = this.getBlockCompleted(block);
    if (!total || !done) {
      return 'Not Started';
    }
    if (done < total) {
      return 'In Progress';
    }
    return 'Completed';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Completed':
        return '#22c55e';
      case 'In Progress':
        return '#f59e0b';
      default:
        return '#94a3b8';
    }
  }

  // ---------- QUICK JUMP SHORTCUTS ----------

  private scrollToTargetInventory(): void {
    if (!this.targetInventoryId || this.hasScrolledToTarget || !this.blocks.length) {
      return;
    }
    this.hasScrolledToTarget = true;
    this.scrollToInventory(this.targetInventoryId);
  }

  scrollToInventory(inventoryId: number): void {
    const el = document.getElementById(`inv-${inventoryId}`);
    const block = this.blocks.find(b => b.inventory.inventoryId === inventoryId);

    if (block) {
      block.expanded = true;
    }

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ---------- IMAGE VIEWER ----------

  openImageGallery(images: string[], startIndex: number = 0): void {
    this.selectedImageGallery = images;
    this.selectedImageIndex = startIndex;
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

  // ---------- SAVE ----------

  saveInventory(block: InspectorInventoryBlock): void {
    const currentUserId = this.auth.currentUser?.userId ?? null;
    if (!currentUserId) {
      this.snack.open('Session expired. Please sign in again.', 'Dismiss', {
        duration: 3000
      });
      return;
    }

    const inventoryId = block.inventory.inventoryId;
    const productId = block.inventory.productId ?? 0;
    const productDisplayName = block.productName;
    const productJSON = block.inventory.productJSON ?? null;
    const inventoryDescription = block.inventory.description ?? null;

    const calls: any[] = [];

    block.groups.forEach(group => {
      group.checkpoints.forEach(row => {
        const trimmed = row.resultValue?.toString().trim() ?? '';

        // If it's a new record with no value, skip.
        if (!row.inspectionId && !trimmed) {
          return;
        }

        if (row.inspectionId && row.inspectionId > 0) {
          // UPDATE existing inspection
          const payload: Inspection = {
            inspectionId: row.inspectionId,
            inspectionTypeId: group.inspectionTypeId,
            inspectionTypeName: group.inspectionTypeName,
            inspectionCheckpointId: row.inspectionCheckpointId,
            inspectionCheckpointName: row.inspectionCheckpointName,
            inputType: row.inputType,
            inventoryId,
            productId,
            productDisplayName,
            productJSON,
            inventoryDescription,
            result: trimmed || null,
            modifiedById: currentUserId
          };

          calls.push(
            this.inspectionsSvc
              .update(payload)
              .pipe(catchError(() => of(false)))
          );
        } else {
          // ADD new inspection row
          const payload: Inspection = {
            inspectionId: 0,
            inspectionTypeId: group.inspectionTypeId,
            inspectionTypeName: group.inspectionTypeName,
            inspectionCheckpointId: row.inspectionCheckpointId,
            inspectionCheckpointName: row.inspectionCheckpointName,
            inputType: row.inputType,
            inventoryId,
            productId,
            productDisplayName,
            productJSON,
            inventoryDescription,
            result: trimmed || null,
            createdById: currentUserId
          };

          calls.push(
            this.inspectionsSvc
              .add(payload)
              .pipe(
                map(id => {
                  row.inspectionId = id;
                  return true;
                }),
                catchError(() => of(false))
              )
          );
        }
      });
    });

    if (!calls.length) {
      this.snack.open('Nothing to save for this inventory.', 'Dismiss', {
        duration: 2500
      });
      return;
    }

    block.saving = true;

    forkJoin(calls)
      .pipe(
        catchError(err => {
          console.error('Failed to save inspection', err);
          this.snack.open(
            'Failed to save inspection for this inventory.',
            'Dismiss',
            { duration: 3000 }
          );
          return of([]);
        })
      )
      .subscribe({
        next: results => {
          const okCount = (results || []).filter(
            x => x === true || x === 1
          ).length;
          if (okCount) {
            this.snack.open('Inspection saved successfully!', 'OK', {
              duration: 2500
            });
          } else {
            this.snack.open('No changes could be saved.', 'Dismiss', {
              duration: 3000
            });
          }
        },
        complete: () => {
          block.saving = false;
        }
      });
  }
}
