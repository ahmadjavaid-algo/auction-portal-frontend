import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { BiddersService } from '../../../../../services/bidders.service';
import { Bidder } from '../../../../../models/bidder.model';
import { BidderAuthService } from '../../../../../services/bidderauth';

@Component({
  selector: 'app-bidders-accdetails',
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
  templateUrl: './bidders-accdetails.html',
  styleUrl: './bidders-accdetails.scss'
})
export class BiddersAccdetails {
  private router = inject(Router);
  private biddersSvc = inject(BiddersService);
  private auth = inject(BidderAuthService);

  loading = true;
  error: string | null = null;
  user: Bidder | null = null;

  ngOnInit(): void {
    
    if (!this.auth.isAuthenticated || !this.auth.currentUser?.userId) {
      
      this.router.navigate(['/bidder/login'], { queryParams: { returnUrl: this.router.url } });
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
    this.router.navigate(['/bidder/dashboard']);
  }

  changePassword(): void {
    this.router.navigate(['/bidder/change-password']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/bidder/login']);
  }

  get initials(): string {
    if (!this.user) return '';
    const first = this.user.firstName?.[0] ?? '';
    const last = this.user.lastName?.[0] ?? this.user.userName?.[0] ?? '';
    return (first + last).toUpperCase();
  }
}
