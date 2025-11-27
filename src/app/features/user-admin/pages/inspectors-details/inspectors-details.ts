import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { InspectorsService } from '../../../../services/inspectors.service';
import { Inspector } from '../../../../models/inspector.model';

@Component({
  selector: 'app-inspectors-details',
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
  templateUrl: './inspectors-details.html',
  styleUrl: './inspectors-details.scss'
})
export class InspectorsDetails {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usersSvc = inject(InspectorsService);

  loading = true;
  error: string | null = null;
  user: Inspector | null = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid user id.';
      this.loading = false;
      return;
    }

    this.usersSvc.getById(id).subscribe({
      next: (u) => {
        this.user = u;
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'Failed to load user.';
        this.loading = false;
      }
    });
  }

  back(): void {
    this.router.navigate(['/admin/inspectors']);
  }

  get initials(): string {
    if (!this.user) return '';
    const first = this.user.firstName?.[0] ?? '';
    const last = this.user.lastName?.[0] ?? this.user.userName?.[0] ?? '';
    return (first + last).toUpperCase();
  }

}
