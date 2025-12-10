// src/app/pages/admin/inventory/add-to-auction/add-to-auction.dialog.ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';

import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuctionService } from '../../../../services/auctions.service';
import { Auction } from '../../../../models/auction.model';

import { InspectionTypesService } from '../../../../services/inspectiontypes.service';
import { InspectionCheckpointsService } from '../../../../services/inspectioncheckpoints.service';
import { InspectionsService } from '../../../../services/inspection.service';

import { InspectionType } from '../../../../models/inspectiontype.model';
import { InspectionCheckpoint } from '../../../../models/inspectioncheckpoint.model';
import { Inspection } from '../../../../models/inspection.model';

export type AddToAuctionResult = {
  auctionId: number;
  inventoryAuctionStatusId: number;
  buyNowPrice?: number | null;
  reservePrice?: number | null;
};

type StatusVm = { id: number; name: string; code: string };

type NormalizedInputType = 'text' | 'textarea' | 'number' | 'yesno' | 'image';
type CompletionStatus = 'Not Started' | 'In Progress' | 'Completed';

@Component({
  selector: 'app-add-to-auction-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './add-to-auction.dialog.html',
  styleUrls: ['./add-to-auction.dialog.scss']
})
export class AddToAuctionDialog implements OnInit {
  auctions: Auction[] = [];
  loadingAuctions = false;

  // inspection rule flags (for the whole selection)
  loadingInspection = false;
  inspectionChecked = false;
  allSelectionInspectionCompleted = true;
  completedCount = 0;
  totalSelected = 0;

  statuses: StatusVm[] = [
    { id: 1, name: 'Scheduled', code: 'schedule' },
    { id: 2, name: 'Live', code: 'live' },
    { id: 3, name: 'Stop', code: 'stop' }
  ];

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private aucSvc: AuctionService,
    private inspTypesSvc: InspectionTypesService,
    private cpSvc: InspectionCheckpointsService,
    private inspectionsSvc: InspectionsService,
    private snack: MatSnackBar,
    private ref: MatDialogRef<AddToAuctionDialog, AddToAuctionResult>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      count: number;
      /** IDs of inventories being added in bulk */
      inventoryIds: number[];
    }
  ) {}

  ngOnInit(): void {
    this.totalSelected = this.data?.inventoryIds?.length ?? this.data.count ?? 0;

    this.form = this.fb.group({
      auctionId: [null as number | null, Validators.required],
      inventoryAuctionStatusId: [1, Validators.required],
      buyNowPrice: [0, [Validators.min(0)]],
      reservePrice: [0, [Validators.min(0)]]
    });

    this.loadAuctions();
    this.checkInspectionCompletionForSelection();
  }

  // ---------------- AUCTIONS ----------------

  private loadAuctions(): void {
    this.loadingAuctions = true;
    this.aucSvc.getList().subscribe({
      next: list => {
        this.auctions = (list ?? []).sort((a, b) =>
          (a.auctionName ?? '').localeCompare(b.auctionName ?? '')
        );
      },
      complete: () => (this.loadingAuctions = false)
    });
  }

  // --------------- INSPECTION COMPLETION LOGIC (mirrors inventoryauctions-form) ---------------

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
    if (v === 'image' || v === 'photo' || v === 'picture' || v === 'file')
      return 'image';
    return 'text';
  }

  private isAnswered(value?: string | null): boolean {
    return !!(value && value.toString().trim().length);
  }

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

  private computeStatusForInventory(
    inventoryId: number,
    types: InspectionType[],
    checkpoints: InspectionCheckpoint[],
    inspections: Inspection[]
  ): CompletionStatus {
    const activeTypes = (types ?? []).filter(t => t.active !== false);
    const activeInspections = (inspections ?? []).filter(i =>
      this.isActiveInspection(i)
    );

    let total = 0;
    let completed = 0;

    activeTypes.forEach(t => {
      const typeId = t.inspectionTypeId;

      const cps = (checkpoints ?? []).filter(
        cp =>
          (
            ((cp as any).inspectionTypeId === typeId) ||
            ((cp as any).InspectionTypeId === typeId)
          ) && cp.active !== false
      );

      if (!cps.length) return;

      cps.forEach(cp => {
        const cpId =
          (cp as any).inspectionCheckpointId ??
          (cp as any).inspectioncheckpointId;

        const forThisCp = activeInspections.filter(
          i =>
            i.inspectionTypeId === typeId &&
            i.inspectionCheckpointId === cpId &&
            i.inventoryId === inventoryId
        );

        total++;
        if (this.isCheckpointAnswered(cp.inputType, forThisCp)) {
          completed++;
        }
      });
    });

    if (!total || !completed) return 'Not Started';
    if (completed < total) return 'In Progress';
    return 'Completed';
  }

  /**
   * Checks that ALL selected inventory IDs have Completed inspection.
   * Follows same rule as inventoryauctions-form.
   */
  private checkInspectionCompletionForSelection(): void {
    const ids = this.data?.inventoryIds ?? [];
    if (!ids.length) {
      // If caller didn't pass IDs, we can't enforce per-vehicle safely;
      // treat as not completed to be strict (you can relax this if needed).
      this.inspectionChecked = true;
      this.allSelectionInspectionCompleted = false;
      this.completedCount = 0;
      return;
    }

    this.loadingInspection = true;
    this.inspectionChecked = false;
    this.allSelectionInspectionCompleted = true;
    this.completedCount = 0;

    forkJoin({
      types: this.inspTypesSvc
        .getList()
        .pipe(catchError(() => of([] as InspectionType[]))),
      cps: this.cpSvc
        .getList()
        .pipe(catchError(() => of([] as InspectionCheckpoint[]))),
      inspectionsLists: forkJoin(
        ids.map(id =>
          this.inspectionsSvc
            .getByInventory(id)
            .pipe(catchError(() => of([] as Inspection[])))
        )
      )
    }).subscribe({
      next: ({ types, cps, inspectionsLists }) => {
        const t = types ?? [];
        const cp = cps ?? [];

        if (!t.length || !cp.length) {
          // same behaviour as inventoryauctions-form: treat as Not Started
          this.allSelectionInspectionCompleted = false;
          this.completedCount = 0;
          return;
        }

        let allComplete = true;
        let completedInventories = 0;

        ids.forEach((inventoryId, idx) => {
          const inspections = (inspectionsLists as Inspection[][])[idx] ?? [];
          const status = this.computeStatusForInventory(
            inventoryId,
            t,
            cp,
            inspections
          );

          if (status === 'Completed') {
            completedInventories++;
          } else {
            allComplete = false;
          }
        });

        this.completedCount = completedInventories;
        this.allSelectionInspectionCompleted = allComplete;
      },
      error: err => {
        console.error('Failed to check inspection completion before add to auction', err);
        this.allSelectionInspectionCompleted = false;
      },
      complete: () => {
        this.loadingInspection = false;
        this.inspectionChecked = true;
      }
    });
  }

  // --------------- ACTIONS ---------------

  submit(): void {
    if (this.form.invalid) return;

    if (this.inspectionChecked && !this.allSelectionInspectionCompleted) {
      this.snack.open(
        'Selected vehicles cannot be added. All inspections must be fully completed (100%).',
        'Dismiss',
        { duration: 4000 }
      );
      return;
    }

    const v = this.form.getRawValue();
    this.ref.close({
      auctionId: v.auctionId!,
      inventoryAuctionStatusId: v.inventoryAuctionStatusId!,
      buyNowPrice: Number(v.buyNowPrice ?? 0),
      reservePrice: Number(v.reservePrice ?? 0)
    });
  }

  cancel(): void {
    this.ref.close();
  }
}
