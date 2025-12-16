
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { InventoryAuction } from '../../../../models/inventoryauction.model';
import { Inventory } from '../../../../models/inventory.model';
import { Auction } from '../../../../models/auction.model';
import { InspectionType } from '../../../../models/inspectiontype.model';
import { InspectionCheckpoint } from '../../../../models/inspectioncheckpoint.model';
import { Inspection } from '../../../../models/inspection.model';

import { InventoryService } from '../../../../services/inventory.service';
import { AuctionService } from '../../../../services/auctions.service';
import { AuthService } from '../../../../services/auth';
import { InspectionTypesService } from '../../../../services/inspectiontypes.service';
import { InspectionCheckpointsService } from '../../../../services/inspectioncheckpoints.service';
import { InspectionsService } from '../../../../services/inspection.service';

type Mode = 'create' | 'edit';

export type InventoryAuctionsFormResult =
  | { action: 'create'; payload: InventoryAuction }
  | { action: 'edit'; payload: InventoryAuction };

type NormalizedInputType = 'text' | 'textarea' | 'number' | 'yesno' | 'image';

type CompletionStatus = 'Not Started' | 'In Progress' | 'Completed';

interface InventoryInspectionSummary {
  totalCheckpoints: number;
  completedCheckpoints: number;
  percent: number;
  status: CompletionStatus;
}

@Component({
  selector: 'app-inventoryauctions-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './inventoryauctions-form.html',
  styleUrls: ['./inventoryauctions-form.scss']
})
export class InventoryauctionsForm implements OnInit {
  form!: FormGroup;
  mode: Mode;

  inventories: Inventory[] = [];
  auctions: Auction[] = [];
  loadingInventories = false;
  loadingAuctions = false;
  loadingInspectionMeta = false;

  allTypes: InspectionType[] = [];
  allCheckpoints: InspectionCheckpoint[] = [];

  
  inspectionSummaryByInventory: Record<number, InventoryInspectionSummary> = {};

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<InventoryauctionsForm, InventoryAuctionsFormResult>,
    private auth: AuthService,
    private inventorySvc: InventoryService,
    private auctionSvc: AuctionService,
    private inspTypesSvc: InspectionTypesService,
    private cpSvc: InspectionCheckpointsService,
    private inspectionsSvc: InspectionsService,
    private snack: MatSnackBar,
    @Inject(MAT_DIALOG_DATA)
    public data: { mode: Mode; initialData?: InventoryAuction | null; presetAuctionId?: number | null }
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      inventoryAuctionId: [0],
      inventoryId: [null, Validators.required],
      auctionId: [this.data?.presetAuctionId ?? null, Validators.required],
      inventoryAuctionStatusId: [1, [Validators.required, Validators.min(1)]],
      auctionStartPrice: [null, [Validators.min(0)]],
      buyNowPrice: [null, [Validators.min(0)]],
      reservePrice: [null, [Validators.min(0)]]
    });

    this.loadAuctions();
    this.loadInventoriesWithInspectionStatus();

    
    if (this.mode === 'edit' && this.data.initialData) {
      const r = this.data.initialData;
      this.form.patchValue({
        inventoryAuctionId:
          (r as any).inventoryAuctionId ?? (r as any).inventoryauctionId ?? 0,
        inventoryId: r.inventoryId ?? null,
        auctionId: r.auctionId ?? null,
        inventoryAuctionStatusId:
          (r as any).inventoryAuctionStatusId ??
          (r as any).inventoryauctionStatusId ??
          1,
        auctionStartPrice: r.auctionStartPrice ?? null,
        buyNowPrice: r.buyNowPrice ?? null,
        reservePrice: r.reservePrice ?? null
      });
    }
  }

  

  private loadAuctions(): void {
    this.loadingAuctions = true;
    this.auctionSvc.getList().subscribe({
      next: list => (this.auctions = list ?? []),
      error: () => (this.auctions = []),
      complete: () => (this.loadingAuctions = false)
    });
  }

  /**
   * Load inventories + inspection meta (types, checkpoints)
   * and then compute completion summaries for each inventory.
   */
  private loadInventoriesWithInspectionStatus(): void {
    this.loadingInventories = true;
    this.loadingInspectionMeta = true;

    forkJoin({
      inventories: this.inventorySvc.getList(),
      types: this.inspTypesSvc.getList().pipe(catchError(() => of([] as InspectionType[]))),
      checkpoints: this.cpSvc.getList().pipe(catchError(() => of([] as InspectionCheckpoint[])))
    }).subscribe({
      next: ({ inventories, types, checkpoints }) => {
        this.inventories = inventories ?? [];
        this.allTypes = (types ?? []).filter(t => t.active !== false);
        this.allCheckpoints = checkpoints ?? [];

        if (!this.inventories.length || !this.allTypes.length || !this.allCheckpoints.length) {
          
          this.loadingInventories = false;
          this.loadingInspectionMeta = false;
          return;
        }

        
        const calls = this.inventories.map(inv =>
          this.inspectionsSvc.getByInventory(inv.inventoryId).pipe(
            catchError(() => of([] as Inspection[]))
          )
        );

        forkJoin(calls).subscribe({
          next: inspectionLists => {
            inspectionLists.forEach((inspections, idx) => {
              const inv = this.inventories[idx];
              this.computeInspectionSummaryForInventory(inv, inspections ?? []);
            });
          },
          error: err => {
            console.error('Failed to load inspections for inventories', err);
          },
          complete: () => {
            this.loadingInventories = false;
            this.loadingInspectionMeta = false;
          }
        });
      },
      error: err => {
        console.error('Failed to load inventories / inspection meta', err);
        this.inventories = [];
        this.loadingInventories = false;
        this.loadingInspectionMeta = false;
      }
    });
  }

  

  private isActiveInspection(i: Inspection): boolean {
    const raw =
      (i as any).active ??
      (i as any).Active ??
      (i as any).isActive ??
      true;
    return raw !== false && raw !== 0;
  }

  private normalizeInputType(inputType?: string | null): NormalizedInputType {
    const v = (inputType || '').toLowerCase();
    if (v === 'textarea' || v === 'multiline') return 'textarea';
    if (v === 'number' || v === 'numeric' || v === 'score') return 'number';
    if (v === 'yesno' || v === 'boolean' || v === 'bool') return 'yesno';
    if (v === 'image' || v === 'photo' || v === 'picture' || v === 'file') return 'image';
    return 'text';
  }

  private isAnswered(value?: string | null): boolean {
    return !!(value && value.toString().trim().length);
  }

  /**
   * For a single checkpoint, decide if it's answered given all inspections for that cp.
   * Mirrors logic from inventory-inspectionreport.
   */
  private isCheckpointAnswered(
    inputType: string | null | undefined,
    inspectionsForCheckpoint: Inspection[]
  ): boolean {
    const norm = this.normalizeInputType(inputType);

    if (!inspectionsForCheckpoint || !inspectionsForCheckpoint.length) {
      return false;
    }

    if (norm === 'image') {
      const urls = inspectionsForCheckpoint
        .map(i => i.result ?? '')
        .filter(u => !!u);
      return !!urls.length;
    }

    
    const first = inspectionsForCheckpoint[0];
    return this.isAnswered(first?.result ?? '');
  }

  /**
   * Compute total/completed checkpoints and status for a given inventory.
   * Uses all active inspection types and checkpoints, plus existing inspections.
   */
  private computeInspectionSummaryForInventory(
    inventory: Inventory,
    existing: Inspection[]
  ): void {
    const activeInspections = (existing ?? []).filter(i => this.isActiveInspection(i));
    const activeTypes = (this.allTypes ?? []).filter(t => t.active !== false);

    let total = 0;
    let completed = 0;

    activeTypes.forEach(t => {
      const typeId = t.inspectionTypeId;

      const cps = (this.allCheckpoints ?? []).filter(cp =>
        (
          ((cp as any).inspectionTypeId === typeId) ||
          ((cp as any).InspectionTypeId === typeId)
        ) && cp.active !== false
      );

      if (!cps.length) {
        return;
      }

      cps.forEach(cp => {
        const cpId =
          (cp as any).inspectionCheckpointId ??
          (cp as any).inspectioncheckpointId;

        const forThisCp = activeInspections.filter(
          i =>
            i.inspectionTypeId === typeId &&
            i.inspectionCheckpointId === cpId &&
            i.inventoryId === inventory.inventoryId
        );

        total++;
        if (this.isCheckpointAnswered(cp.inputType, forThisCp)) {
          completed++;
        }
      });
    });

    let status: CompletionStatus;
    if (!total || !completed) {
      status = 'Not Started';
    } else if (completed < total) {
      status = 'In Progress';
    } else {
      status = 'Completed';
    }

    const percent = total ? Math.round((completed / total) * 100) : 0;

    this.inspectionSummaryByInventory[inventory.inventoryId] = {
      totalCheckpoints: total,
      completedCheckpoints: completed,
      percent,
      status
    };
  }

  

  inventoryLabel(i: any): string {
    return i?.displayName
      ? `${i.displayName} (#${i.inventoryId})`
      : `Inventory #${i?.inventoryId}`;
  }

  auctionLabel(a: any): string {
    return a?.auctionName
      ? `${a.auctionName} (#${a.auctionId})`
      : `Auction #${a?.auctionId}`;
  }

  getInventoryInspectionSummary(inventoryId: number): InventoryInspectionSummary | null {
    return this.inspectionSummaryByInventory[inventoryId] ?? null;
  }

  getInventoryInspectionStatus(inventoryId: number): CompletionStatus {
    return this.getInventoryInspectionSummary(inventoryId)?.status ?? 'Not Started';
  }

  getInventoryCompletionPercent(inventoryId: number): number {
    return this.getInventoryInspectionSummary(inventoryId)?.percent ?? 0;
  }

  isInventoryInspectionCompleted(inventoryId: number): boolean {
    return this.getInventoryInspectionStatus(inventoryId) === 'Completed';
  }

  

  onSubmit(): void {
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;
    const selectedInventoryId = v.inventoryId as number | null;
    const originalInventoryId = this.data.initialData?.inventoryId ?? null;

    
    
    
    const inventoryChanged =
      this.mode === 'create' ||
      (!!selectedInventoryId && selectedInventoryId !== originalInventoryId);

    if (inventoryChanged && selectedInventoryId) {
      if (!this.isInventoryInspectionCompleted(selectedInventoryId)) {
        this.snack.open(
          'This vehicle cannot be added to an auction until its inspection is fully completed (100%).',
          'Dismiss',
          { duration: 4000 }
        );
        return;
      }
    }

    const payload: InventoryAuction = {
      inventoryAuctionId: v.inventoryAuctionId,
      inventoryId: v.inventoryId,
      auctionId: v.auctionId,
      inventoryAuctionStatusId: v.inventoryAuctionStatusId,

      auctionStartPrice: v.auctionStartPrice ?? 0,
      buyNowPrice: v.buyNowPrice ?? 0,
      reservePrice: v.reservePrice ?? 0,

      bidIncrement: 0,

      createdById: this.mode === 'create' ? currentUserId : null,
      createdDate: null,
      modifiedById: currentUserId ?? null,
      modifiedDate: null,
      active: undefined
    } as InventoryAuction;

    this.dialogRef.close(
      this.mode === 'create'
        ? { action: 'create', payload }
        : { action: 'edit', payload }
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
