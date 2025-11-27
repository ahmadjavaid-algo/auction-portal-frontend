import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { InspectionCheckpoint } from '../../../../models/inspectioncheckpoint.model';
import { InspectionCheckpointsService } from '../../../../services/inspectioncheckpoints.service';
import { AuthService } from '../../../../services/auth';

import {
  InspectioncheckpointsForm,
  InspectionCheckpointsFormResult
} from '../inspectioncheckpoints-form/inspectioncheckpoints-form';

@Component({
  selector: 'app-inspectioncheckpoints-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './inspectioncheckpoints-list.html',
  styleUrls: ['./inspectioncheckpoints-list.scss']
})
export class InspectioncheckpointsList implements OnChanges {
  private cpSvc = inject(InspectionCheckpointsService);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);

  /** Parent inspection type id (like auctionId in inventoryauctions-list) */
  @Input() inspectionTypeId!: number;

  displayedColumns: string[] = [
    'name',
    'inputType',
    'active',
    'actions'
  ];

  rows: InspectionCheckpoint[] = [];
  loading = false;

  ngOnChanges(changes: SimpleChanges): void {
    if ('inspectionTypeId' in changes && this.inspectionTypeId) {
      this.load();
    }
  }

  private load(): void {
    this.loading = true;

    this.cpSvc.getList().subscribe({
      next: list => {
        // Filter checkpoints belonging to this inspection type
        this.rows = (list ?? []).filter(
          x => (x as any).inspectionTypeId === this.inspectionTypeId
        );
      },
      error: () =>
        this.snack.open(
          'Failed to load inspection checkpoints for this type.',
          'Dismiss',
          { duration: 3000 }
        ),
      complete: () => (this.loading = false)
    });
  }

  toggleActive(row: InspectionCheckpoint): void {
    const newState = !(row.active ?? false);
    this.cpSvc
      .activate({
        InspectionCheckpointId:
          (row as any).inspectionCheckpointId ??
          (row as any).inspectioncheckpointId,
        Active: newState,
        ModifiedById: this.auth.currentUser?.userId ?? null
      })
      .subscribe({
        next: ok => {
          if (ok) {
            row.active = newState;
            this.snack.open(
              `Checkpoint ${newState ? 'activated' : 'deactivated'}.`,
              'OK',
              { duration: 2000 }
            );
          } else {
            this.snack.open(
              'Failed to change status.',
              'Dismiss',
              { duration: 3000 }
            );
          }
        },
        error: () =>
          this.snack.open(
            'Failed to change status.',
            'Dismiss',
            { duration: 3000 }
          )
      });
  }

  addItem(): void {
    const ref = this.dialog.open<
      InspectioncheckpointsForm,
      { mode: 'create'; presetInspectionTypeId: number },
      InspectionCheckpointsFormResult
    >(InspectioncheckpointsForm, {
      width: '720px',
      data: { mode: 'create', presetInspectionTypeId: this.inspectionTypeId }
    });

    ref.afterClosed().subscribe(res => {
      if (!res) return;
      if (res.action === 'create') {
        const payload = {
          ...res.payload,
          inspectionTypeId: this.inspectionTypeId
        } as InspectionCheckpoint;

        this.cpSvc.add(payload).subscribe({
          next: id => {
            this.snack.open(
              `Inspection checkpoint created (ID ${id}).`,
              'OK',
              { duration: 2500 }
            );
            this.load();
          },
          error: e =>
            this.snack.open(
              e?.error?.message || 'Failed to create inspection checkpoint.',
              'Dismiss',
              { duration: 3000 }
            )
        });
      }
    });
  }

  editItem(row: InspectionCheckpoint): void {
    const ref = this.dialog.open<
      InspectioncheckpointsForm,
      { mode: 'edit'; initialData: InspectionCheckpoint },
      InspectionCheckpointsFormResult
    >(InspectioncheckpointsForm, {
      width: '720px',
      data: { mode: 'edit', initialData: row }
    });

    ref.afterClosed().subscribe(res => {
      if (!res) return;
      if (res.action === 'edit') {
        const payload: InspectionCheckpoint = {
          ...res.payload,
          inspectionCheckpointId:
            (res.payload as any).inspectionCheckpointId ??
            (res.payload as any).inspectioncheckpointId,
          inspectionTypeId: this.inspectionTypeId
        } as InspectionCheckpoint;

        this.cpSvc.update(payload).subscribe({
          next: ok => {
            if (ok) {
              this.snack.open(
                'Inspection checkpoint updated.',
                'OK',
                { duration: 2000 }
              );
              this.load();
            } else {
              this.snack.open(
                'Failed to update checkpoint.',
                'Dismiss',
                { duration: 3000 }
              );
            }
          },
          error: e =>
            this.snack.open(
              e?.error?.message || 'Failed to update checkpoint.',
              'Dismiss',
              { duration: 3000 }
            )
        });
      }
    });
  }

  viewItem(_row: InspectionCheckpoint): void {
    // Reserved for future navigation if you want a checkpoint details page
  }
}
