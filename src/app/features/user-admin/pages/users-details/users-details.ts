import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UsersService } from '../../../../services/users.service';
import { User } from '../../../../models/user.model';

@Component({
  selector: 'app-users-details',
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
  templateUrl: './users-details.html',
  styleUrls: ['./users-details.scss']
})
export class UsersDetails {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usersSvc = inject(UsersService);

  loading = true;
  error: string | null = null;
  user: User | null = null;

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
    this.router.navigate(['/admin/users']);
  }

  get initials(): string {
    if (!this.user) return '';
    const first = this.user.firstName?.[0] ?? '';
    const last = this.user.lastName?.[0] ?? this.user.userName?.[0] ?? '';
    return (first + last).toUpperCase();
  }

  
  get roleIds(): number[] {
    const v: any = this.user?.roleId;
    if (Array.isArray(v)) {
      return v
        .map(n => Number(n))
        .filter(n => Number.isFinite(n));
    }
    if (typeof v === 'number' && Number.isFinite(v)) return [v];
    return [];
  }

  get hasRoles(): boolean {
    return this.roleIds.length > 0;
  }

  trackByRole(_i: number, rid: number): number {
    return rid;
  }
}
