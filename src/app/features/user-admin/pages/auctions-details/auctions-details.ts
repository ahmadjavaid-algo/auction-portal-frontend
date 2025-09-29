import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuctionService } from '../../../../services/auctions.service';
import { Auction } from '../../../../models/auction.model';

@Component({
  selector: 'app-auctions-details',
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
  templateUrl: './auctions-details.html',
  styleUrls: ['./auctions-details.scss']
})
export class AuctionsDetails {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private aucSvc = inject(AuctionService);

  loading = true;
  error: string | null = null;
  auction: Auction | null = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid auction id.';
      this.loading = false;
      return;
    }

    this.aucSvc.getById(id).subscribe({
      next: (a) => {
        this.auction = a;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load auction.';
        this.loading = false;
      }
    });
  }

  back(): void {
    this.router.navigate(['/admin/auctions']);
  }

  get initials(): string {
    const name = this.auction?.auctionName?.trim() || '';
    if (name) {
      const parts = name.split(/\s+/);
      const a = parts[0]?.[0] ?? 'A';
      const b = parts[1]?.[0] ?? 'U';
      return (a + b).toUpperCase();
    }
    return 'AU';
  }

  get hasSchedule(): boolean {
    const s = this.auction?.startDateTime?.toString().trim();
    const e = this.auction?.endDateTime?.toString().trim();
    return !!(s && e);
  }

  getStart(): Date | null {
    const s = this.auction?.startDateTime;
    return s ? new Date(s) : null;
    }
  getEnd(): Date | null {
    const e = this.auction?.endDateTime;
    return e ? new Date(e) : null;
  }
}
