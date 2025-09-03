import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { RolesService } from '../../../../services/roles.service';
import { Role } from '../../../../models/role.model';

@Component({
  selector: 'app-roles-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './roles-details.html',
  styleUrls: ['./roles-details.scss']
})
export class RolesDetails {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rolesSvc = inject(RolesService);

  loading = true;
  error: string | null = null;
  role: Role | null = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid role id.';
      this.loading = false;
      return;
    }

    this.rolesSvc.getById(id).subscribe({
      next: (r) => {
        this.role = r;
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'Failed to load role.';
        this.loading = false;
      }
    });
  }

  back(): void {
    this.router.navigate(['/admin/roles']);
  }

  get initials(): string {
    if (!this.role) return '';
    const name = this.role.roleName?.trim() || '';
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      const first = parts[0]?.[0] ?? '';
      const second = parts[1]?.[0] ?? '';
      return (first + second).toUpperCase();
    }
    const code = this.role.roleCode?.trim() || '';
    return code.slice(0, 2).toUpperCase();
  }
}
