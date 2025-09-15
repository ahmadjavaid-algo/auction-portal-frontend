import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { BiddersService } from '../../../../services/bidders.service';
import { Bidder } from '../../../../models/bidder.model';

@Component({
  selector: 'app-bidders-details',
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
  templateUrl: './bidders-details.html',
  styleUrl: './bidders-details.scss'
})
export class BiddersDetails {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usersSvc = inject(BiddersService);

  loading = true;
  error: string | null = null;
  user: Bidder | null = null;

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
    this.router.navigate(['/admin/bidders']);
  }

  get initials(): string {
    if (!this.user) return '';
    const first = this.user.firstName?.[0] ?? '';
    const last = this.user.lastName?.[0] ?? this.user.userName?.[0] ?? '';
    return (first + last).toUpperCase();
  }

}
