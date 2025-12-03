import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { InspectorsService } from '../../../../services/inspectors.service';
import { Inspector } from '../../../../models/inspector.model';
import { InspectorAuthService } from '../../../../services/inspectorauth';

@Component({
  selector: 'app-inspectors-accdetails',
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
  templateUrl: './inspectors-accdetails.html',
  styleUrl: './inspectors-accdetails.scss'
})
export class InspectorsAccdetails {
  private router = inject(Router);
  private biddersSvc = inject(InspectorsService);
  private auth = inject(InspectorAuthService);

  loading = true;
  error: string | null = null;
  user: Inspector | null = null;

  ngOnInit(): void {
    
    if (!this.auth.isAuthenticated || !this.auth.currentUser?.userId) {
      
      this.router.navigate(['/inspector/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const id = this.auth.currentUser.userId;
    this.loadUser(id);
  }

  private loadUser(id: number): void {
    this.loading = true;
    this.error = null;

    this.biddersSvc.getById(id).subscribe({
      next: (u) => {
        this.user = u;
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'Failed to load account details.';
        this.loading = false;
      }
    });
  }

  refresh(): void {
    const id = this.auth.currentUser?.userId;
    if (!id) return;
    this.loadUser(id);
  }

  back(): void {
    this.router.navigate(['/inspector/dashboard']);
  }

  changePassword(): void {
    this.router.navigate(['/inspector/change-password']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/inspector/login']);
  }

  get initials(): string {
    if (!this.user) return '';
    const first = this.user.firstName?.[0] ?? '';
    const last = this.user.lastName?.[0] ?? this.user.userName?.[0] ?? '';
    return (first + last).toUpperCase();
  }
}
