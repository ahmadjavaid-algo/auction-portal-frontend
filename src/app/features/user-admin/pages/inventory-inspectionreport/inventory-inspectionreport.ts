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
import { FormsModule } from '@angular/forms'; 
import { forkJoin } from 'rxjs';

import { InventoryService } from '../../../../services/inventory.service';
import { InventoryInspectorService } from '../../../../services/inventoryinspector.service';
import { InspectorsService } from '../../../../services/inspectors.service';
import { AuthService } from '../../../../services/auth';

import { Inventory } from '../../../../models/inventory.model';
import { InventoryInspector } from '../../../../models/inventoryinspector.model';
import { Inspector } from '../../../../models/inspector.model';

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
    FormsModule,
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

  inventoryId!: number;

  loading = true;
  saving = false;
  error: string | null = null;

  inventory: Inventory | null = null;
  inspectors: Inspector[] = [];
  assignment: InventoryInspector | null = null;

  // bound to dropdown
  selectedInspectorId: number | null = null;

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

    forkJoin({
      inventory: this.invSvc.getById(this.inventoryId),
      inspectors: this.inspectorsSvc.getList(),
      mappings: this.invInspectorSvc.getList()
    }).subscribe({
      next: ({ inventory, inspectors, mappings }) => {
        this.inventory = inventory ?? null;
        this.inspectors = inspectors ?? [];

        const existing = (mappings ?? []).find(m => m.inventoryId === this.inventoryId) ?? null;
        this.assignment = existing;
        this.selectedInspectorId = existing?.assignedTo ?? null;
      },
      error: (err) => {
        console.error('Failed to load inspection report data', err);
        this.error = err?.error?.message || 'Failed to load inspection report data.';
      },
      complete: () => (this.loading = false)
    });
  }

  back(): void {
    this.router.navigate(['/admin/inventory']);
  }

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

  getInspectorDisplay(i: Inspector): string {
    const name = [i.firstName, i.lastName].filter(Boolean).join(' ').trim();
    if (name) return `${name} (${i.userName})`;
    return i.userName || `Inspector #${i.userId}`;
  }

  get currentInspectorName(): string {
    if (!this.assignment || !this.assignment.assignedTo) return 'Unassigned';

    const match = this.inspectors.find(x => x.userId === this.assignment!.assignedTo);
    if (match) return this.getInspectorDisplay(match);
    if (this.assignment.inspectorName) return this.assignment.inspectorName;

    return `Inspector #${this.assignment.assignedTo}`;
  }

  get hasAssignment(): boolean {
    return !!(this.assignment && this.assignment.assignedTo);
  }

  saveAssignment(): void {
    if (!this.selectedInspectorId) {
      this.snack.open('Please select an inspector to assign.', 'Dismiss', { duration: 2500 });
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
            this.snack.open('Inspector assignment updated.', 'OK', { duration: 2500 });
            this.assignment = payload;
          } else {
            this.snack.open('Failed to update assignment.', 'Dismiss', { duration: 3000 });
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
          this.snack.open('Inspector assigned to inventory.', 'OK', { duration: 2500 });
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
            this.snack.open('Inspector unassigned from this inventory.', 'OK', { duration: 2500 });
          } else {
            this.snack.open('Failed to clear assignment.', 'Dismiss', { duration: 3000 });
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
}
