// src/app/pages/inspector/inspections/inspections.ts
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

import { ActivatedRoute } from '@angular/router';

import { forkJoin, of, Subject } from 'rxjs';
import { catchError, finalize, map, switchMap, take, takeUntil, tap } from 'rxjs/operators';

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

type NormalizedInputType = 'text' | 'textarea' | 'number' | 'yesno' | 'image';

interface ImageItem {
  inspectionId: number;
  url: string;
}

interface InspectionCheckpointRow {
  inspectionId?: number;
  inspectionTypeId: number;
  inspectionTypeName: string;
  inspectionCheckpointId: number;
  inspectionCheckpointName: string;
  inputType?: string | null;
  resultValue: string;
  imageUrls?: string[];
  imageItems?: ImageItem[];
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
export class Inspections implements OnInit, AfterViewInit, OnDestroy {
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
  private elementRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  loading = true;
  error: string | null = null;

  blocks: InspectorInventoryBlock[] = [];
  allTypes: InspectionType[] = [];
  allCheckpoints: InspectionCheckpoint[] = [];

  selectedImageGallery: string[] = [];
  selectedImageIndex = 0;
  showImageViewer = false;

  private targetInventoryId: number | null = null;
  private hasScrolledToTarget = false;

  // Scroll-reveal (IntersectionObserver) must re-bind after async render
  private io?: IntersectionObserver;
  private observedEls = new WeakSet<Element>();

  // Effects cleanup
  private destroy$ = new Subject<void>();
  private removeFns: Array<() => void> = [];
  private cursorEl?: HTMLElement;
  private cursorDotEl?: HTMLElement;

  ngOnInit(): void {
    // react to query params
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id = params.get('inventoryId');
        this.targetInventoryId = id ? +id : null;

        // if already loaded, attempt scroll after render
        if (!this.loading && this.blocks.length && this.targetInventoryId) {
          this.queueAfterRender(() => this.scrollToTargetInventory());
        }
      });

    this.loadData();
  }

  ngAfterViewInit(): void {
    // Create observer ONCE and keep it for the component lifetime
    this.ensureIntersectionObserver();
    // Might be empty on first call (loading), but harmless
    this.observeAnimatedElements();

    // Effects
    this.initCursorEffects();
    this.initScrollAnimations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Disconnect IntersectionObserver
    try {
      this.io?.disconnect();
    } catch {}

    // Remove event listeners
    this.removeFns.forEach(fn => {
      try {
        fn();
      } catch {}
    });
    this.removeFns = [];

    // Remove custom cursor nodes (avoid duplicates on route nav)
    if (this.cursorEl?.parentNode) this.cursorEl.parentNode.removeChild(this.cursorEl);
    if (this.cursorDotEl?.parentNode) this.cursorDotEl.parentNode.removeChild(this.cursorDotEl);
    this.cursorEl = undefined;
    this.cursorDotEl = undefined;
  }

  // ---------------------------------------------------------------------------
  // FIX: bind scroll-reveal to elements AFTER async blocks render
  // ---------------------------------------------------------------------------

  private ensureIntersectionObserver(): void {
    if (this.io) return;

    this.io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            // once revealed, no need to keep observing
            try {
              this.io?.unobserve(entry.target);
            } catch {}
          }
        });
      },
      {
        threshold: 0.12,
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

  private queueAfterRender(fn: () => void): void {
    // Ensure Angular has applied bindings and painted DOM nodes
    // This is the key to preventing "reload twice" when content is async.
    this.ngZone.onStable
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe(() => {
        try {
          fn();
        } catch {}
      });
  }

  private postDataRenderTasks(): void {
    // Force the view to update immediately, then run after it stabilizes
    this.cdr.detectChanges();
    this.queueAfterRender(() => {
      // Re-bind observer to newly created elements
      this.ensureIntersectionObserver();
      this.observeAnimatedElements();

      // Scroll to target (if any) after DOM is real
      this.scrollToTargetInventory();
    });
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  loadData(): void {
    this.loading = true;
    this.error = null;
    this.blocks = [];
    this.hasScrolledToTarget = false;

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
        takeUntil(this.destroy$),
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
            tap(results => {
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
            }),
            map(() => null)
          );
        }),
        catchError(err => {
          console.error('Failed to load assigned inspections', err);
          this.error = err?.error?.message || 'Failed to load assigned inspections.';
          this.blocks = [];
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
          // IMPORTANT: run reveal + scroll only after the async DOM exists
          this.postDataRenderTasks();
        })
      )
      .subscribe();
  }

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

  private isActiveInspection(i: Inspection): boolean {
    const raw =
      (i as any).active ??
      (i as any).Active ??
      (i as any).isActive ??
      true;
    return raw !== false && raw !== 0;
  }

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

      if (!cps.length) return;

      const rows: InspectionCheckpointRow[] = cps.map(cp => {
        const cpId =
          (cp as any).inspectionCheckpointId ??
          (cp as any).inspectioncheckpointId;

        const cpInspectionsAll = existing.filter(
          i =>
            i.inspectionTypeId === t.inspectionTypeId &&
            i.inspectionCheckpointId === cpId &&
            i.inventoryId === inventory.inventoryId
        );

        const cpInspections = cpInspectionsAll.filter(i =>
          this.isActiveInspection(i)
        );

        const inputType = cp.inputType;
        const norm = this.normalizeInputType(inputType);

        let resultValue = '';
        let inspectionId: number | undefined;
        let imageUrls: string[] | undefined;
        let imageItems: ImageItem[] | undefined;

        if (norm === 'image') {
          imageItems = cpInspections
            .map(i => ({
              inspectionId: i.inspectionId,
              url: i.result ?? ''
            }))
            .filter(x => !!x.url);

          imageUrls = imageItems.map(x => x.url);
          inspectionId = imageItems[0]?.inspectionId;
        } else {
          const match = cpInspections[0];
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
          imageUrls: imageUrls ?? [],
          imageItems: imageItems ?? []
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

  toggleExpanded(block: InspectorInventoryBlock): void {
    block.expanded = !block.expanded;

    if (block.expanded) {
      // wait for expand DOM to render, then ensure reveal + scroll works
      this.cdr.detectChanges();
      this.queueAfterRender(() => {
        this.observeAnimatedElements();
        const el = document.getElementById(`inv-${block.inventory.inventoryId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }

  // FIX: correct normalization (you had yes/no UI but never returned 'yesno')
  normalizeInputType(inputType?: string | null): NormalizedInputType {
    const v = (inputType || '').toLowerCase().trim();

    if (v === 'textarea' || v === 'multiline' || v === 'longtext') return 'textarea';
    if (v === 'number' || v === 'numeric' || v === 'score' || v === 'qty') return 'number';
    if (v === 'yesno' || v === 'yes/no' || v === 'boolean' || v === 'passfail' || v === 'pass/fail') return 'yesno';
    if (v === 'image' || v === 'photo' || v === 'picture' || v === 'file') return 'image';

    return 'text';
  }

  setYesNo(row: InspectionCheckpointRow, value: 'Pass' | 'Fail'): void {
    row.resultValue = value;
  }

  private isValueAnswered(value?: string | null): boolean {
    return !!(value && value.toString().trim().length);
  }

  isRowAnswered(row: InspectionCheckpointRow): boolean {
    const t = this.normalizeInputType(row.inputType);
    if (t === 'image') {
      return !!(row.imageUrls && row.imageUrls.length);
    }
    return this.isValueAnswered(row.resultValue);
  }

  getGroupCompleted(group: InspectionTypeGroupForUI): number {
    return group.checkpoints.filter(r => this.isRowAnswered(r)).length;
  }

  getBlockCompleted(block: InspectorInventoryBlock): number {
    return block.groups.reduce((sum, g) => sum + this.getGroupCompleted(g), 0);
  }

  getBlockTotal(block: InspectorInventoryBlock): number {
    return block.groups.reduce((sum, g) => sum + g.checkpoints.length, 0);
  }

  get totalCheckpoints(): number {
    return this.blocks.reduce((sum, b) => sum + this.getBlockTotal(b), 0);
  }

  get totalCompleted(): number {
    return this.blocks.reduce((sum, b) => sum + this.getBlockCompleted(b), 0);
  }

  getBlockProgressPercent(block: InspectorInventoryBlock): number {
    const total = this.getBlockTotal(block);
    if (!total) return 0;
    return Math.round((this.getBlockCompleted(block) / total) * 100);
  }

  getBlockStatus(block: InspectorInventoryBlock): 'Not Started' | 'In Progress' | 'Completed' {
    const total = this.getBlockTotal(block);
    const done = this.getBlockCompleted(block);
    if (!total || !done) return 'Not Started';
    if (done < total) return 'In Progress';
    return 'Completed';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Completed':
        return '#10b981';
      case 'In Progress':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  }

  private scrollToTargetInventory(): void {
    if (!this.targetInventoryId || this.hasScrolledToTarget || !this.blocks.length) return;
    this.hasScrolledToTarget = true;
    this.scrollToInventory(this.targetInventoryId);
  }

  scrollToInventory(inventoryId: number): void {
    const block = this.blocks.find(b => b.inventory.inventoryId === inventoryId);
    if (block) block.expanded = true;

    this.cdr.detectChanges();
    this.queueAfterRender(() => {
      this.observeAnimatedElements();
      const el = document.getElementById(`inv-${inventoryId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

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

  uploadCheckpointImages(
    block: InspectorInventoryBlock,
    group: InspectionTypeGroupForUI,
    row: InspectionCheckpointRow,
    event: Event
  ): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input?.files ?? []);
    if (!files.length) return;

    const currentUserId = this.auth.currentUser?.userId ?? null;
    if (!currentUserId) {
      this.snack.open('Session expired. Please sign in again.', 'Dismiss', { duration: 3000 });
      return;
    }

    const documentTypeId = 1;
    block.saving = true;

    const calls = files.map(file =>
      this.inspectionsSvc
        .addWithImage(file, {
          inspectionTypeId: group.inspectionTypeId,
          inspectionCheckpointId: row.inspectionCheckpointId,
          inventoryId: block.inventory.inventoryId,
          documentTypeId,
          createdById: currentUserId,
          documentName: row.inspectionCheckpointName
        })
        .pipe(
          catchError(err => {
            console.error('Failed to upload checkpoint image', err);
            return of(0);
          })
        )
    );

    forkJoin(calls)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ids => {
          const successCount = (ids || []).filter(id => id && id > 0).length;
          if (successCount) {
            this.snack.open(`${successCount} image(s) uploaded for "${row.inspectionCheckpointName}".`, 'OK', {
              duration: 3500
            });
            this.refreshInventoryBlock(block);
          } else {
            this.snack.open('Failed to upload images for this checkpoint.', 'Dismiss', { duration: 3500 });
          }
        },
        complete: () => {
          block.saving = false;
          if (input) input.value = '';
        }
      });
  }

  private refreshInventoryBlock(block: InspectorInventoryBlock): void {
    this.inspectionsSvc
      .getByInventory(block.inventory.inventoryId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of([] as Inspection[]))
      )
      .subscribe(list => {
        block.groups = this.buildGroupsForInventory(block.inventory, list ?? []);
        // Re-bind animations for any newly rendered rows
        this.postDataRenderTasks();
      });
  }

  removeCheckpointImage(
    row: InspectionCheckpointRow,
    index: number,
    event?: MouseEvent
  ): void {
    event?.stopPropagation();
    event?.preventDefault();

    const currentUserId = this.auth.currentUser?.userId ?? null;
    if (!currentUserId) {
      this.snack.open('Session expired. Please sign in again.', 'Dismiss', { duration: 3000 });
      return;
    }

    const item = row.imageItems?.[index];
    if (!item || !item.inspectionId) return;

    this.inspectionsSvc
      .activate({
        InspectionId: item.inspectionId,
        Active: false,
        ModifiedById: currentUserId
      })
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Failed to deactivate inspection image', err);
          this.snack.open('Failed to remove image. Please try again.', 'Dismiss', { duration: 3000 });
          return of(false);
        })
      )
      .subscribe(success => {
        if (success) {
          row.imageItems = (row.imageItems ?? []).filter((_, i) => i !== index);
          row.imageUrls = (row.imageUrls ?? []).filter((_, i) => i !== index);
          this.snack.open('Image removed from checkpoint.', 'OK', { duration: 2500 });
        }
      });
  }

  saveInventory(block: InspectorInventoryBlock): void {
    const currentUserId = this.auth.currentUser?.userId ?? null;
    if (!currentUserId) {
      this.snack.open('Session expired. Please sign in again.', 'Dismiss', { duration: 3000 });
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
        const normType = this.normalizeInputType(row.inputType);

        if (normType === 'image') return;

        const trimmed = row.resultValue?.toString().trim() ?? '';

        if (!row.inspectionId && !trimmed) return;

        if (row.inspectionId && row.inspectionId > 0) {
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

          calls.push(this.inspectionsSvc.update(payload).pipe(catchError(() => of(false))));
        } else {
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
            this.inspectionsSvc.add(payload).pipe(
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
      this.snack.open('Nothing to save for this inventory.', 'Dismiss', { duration: 2500 });
      return;
    }

    block.saving = true;

    forkJoin(calls)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Failed to save inspection', err);
          this.snack.open('Failed to save inspection for this inventory.', 'Dismiss', { duration: 3000 });
          return of([]);
        }),
        finalize(() => {
          block.saving = false;
          // After save (and possible UI changes), ensure new content is revealed
          this.postDataRenderTasks();
        })
      )
      .subscribe({
        next: results => {
          const okCount = (results || []).filter(x => x === true || x === 1).length;
          if (okCount) {
            this.snack.open('Inspection saved successfully!', 'OK', { duration: 2500 });
          } else {
            this.snack.open('No changes could be saved.', 'Dismiss', { duration: 3000 });
          }
        }
      });
  }

  // ---------------------------------------------------------------------------
  // Effects (cursor + parallax) with cleanup to avoid duplicates
  // ---------------------------------------------------------------------------

  private initCursorEffects(): void {
    if (window.innerWidth < 1024) return;

    // prevent duplicate cursors when navigating back to this route
    if (document.querySelector('.custom-cursor') || document.querySelector('.custom-cursor-dot')) return;

    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);
    this.cursorEl = cursor;

    const cursorDot = document.createElement('div');
    cursorDot.className = 'custom-cursor-dot';
    document.body.appendChild(cursorDot);
    this.cursorDotEl = cursorDot;

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.left = mouseX + 'px';
      cursorDot.style.top = mouseY + 'px';
    };

    document.addEventListener('mousemove', onMove);
    this.removeFns.push(() => document.removeEventListener('mousemove', onMove));

    const animateCursor = () => {
      if (!this.cursorEl || !this.cursorDotEl) return; // destroyed
      const dx = mouseX - cursorX;
      const dy = mouseY - cursorY;
      cursorX += dx * 0.15;
      cursorY += dy * 0.15;
      cursor.style.left = cursorX + 'px';
      cursor.style.top = cursorY + 'px';
      requestAnimationFrame(animateCursor);
    };
    animateCursor();

    const bindHoverTargets = () => {
      const interactiveElements = this.elementRef.nativeElement.querySelectorAll(
        'button, a, .vehicle-card, .shortcut-card, .gallery-item'
      );

      interactiveElements.forEach((el: Element) => {
        const enter = () => {
          cursor.classList.add('cursor-hover');
          cursorDot.classList.add('cursor-hover');
        };
        const leave = () => {
          cursor.classList.remove('cursor-hover');
          cursorDot.classList.remove('cursor-hover');
        };

        el.addEventListener('mouseenter', enter);
        el.addEventListener('mouseleave', leave);

        this.removeFns.push(() => el.removeEventListener('mouseenter', enter));
        this.removeFns.push(() => el.removeEventListener('mouseleave', leave));
      });
    };

    // bind now + after data renders (new DOM nodes)
    bindHoverTargets();
    this.queueAfterRender(() => bindHoverTargets());
  }

  private initScrollAnimations(): void {
    let ticking = false;
    let scrollPos = 0;

    const onScroll = () => {
      scrollPos = window.scrollY;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          this.updateParallax(scrollPos);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    this.removeFns.push(() => window.removeEventListener('scroll', onScroll));
  }

  private updateParallax(scrollPos: number): void {
    const parallaxElements = this.elementRef.nativeElement.querySelectorAll('.parallax');
    parallaxElements.forEach((el: HTMLElement) => {
      const speed = parseFloat(el.dataset['speed'] || '0.5');
      const yPos = -(scrollPos * speed);
      el.style.transform = `translateY(${yPos}px)`;
    });
  }
}
