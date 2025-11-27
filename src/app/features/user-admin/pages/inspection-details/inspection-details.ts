import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { InspectionType } from '../../../../models/inspectiontype.model';
import { InspectionTypesService } from '../../../../services/inspectiontypes.service';

@Component({
  selector: 'app-inspection-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './inspection-details.html',
  styleUrls: ['./inspection-details.scss']
})
export class InspectionDetails {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inspTypeSvc = inject(InspectionTypesService);

  loading = true;
  error: string | null = null;
  inspectionType: InspectionType | null = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid inspection type id.';
      this.loading = false;
      return;
    }

    this.inspTypeSvc.getById(id).subscribe({
      next: (x) => {
        this.inspectionType = x;
        this.loading = false;
      },
      error: (err) => {
        this.error =
          err?.error?.message || 'Failed to load inspection type.';
        this.loading = false;
      }
    });
  }

  back(): void {
    // match your route: list page for inspection types
    this.router.navigate(['/admin/inspection']);
  }

  get initials(): string {
    const name = this.inspectionType?.inspectionTypeName?.trim() || '';
    if (name) {
      const parts = name.split(/\s+/);
      const a = parts[0]?.[0] ?? 'I';
      const b = parts[1]?.[0] ?? 'T';
      return (a + b).toUpperCase();
    }
    return 'IT';
  }

  get weightageLabel(): string {
    const w = this.inspectionType?.weightage ?? null;
    if (w === null || w === undefined) return '—';
    return `${w}%`;
  }
}
