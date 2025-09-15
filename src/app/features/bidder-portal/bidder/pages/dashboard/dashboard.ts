import { Component, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BidderAuthService } from '../../../../../services/bidderauth'; // <- adjust path if needed

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, MatProgressBarModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard implements AfterViewInit, OnDestroy {
  /** Expose Math so we can use it in template bindings */
  readonly Math = Math;

  /** Pull the logged-in name from your AuthService (no hardcoding) */
  private auth = inject(BidderAuthService);
  get adminName(): string {
    const u = this.auth.currentUser;
    if (!u) return 'Admin';
    const name = [u.firstName].filter(Boolean).join(' ').trim();
    return name || u.userName || 'Admin';
  }

  // KPI tiles
  stats = [
    { icon: 'local_fire_department', label: 'Live Auctions', value: 18, delta: '+3', up: true },
    { icon: 'directions_car',        label: 'Vehicles Listed', value: 742, delta: '+56', up: true },
    { icon: 'gavel',                 label: 'Bids Today', value: 5230, delta: '-4%', up: false },
    { icon: 'attach_money',          label: 'Revenue (7d)', value: 126, delta: '+12%', up: true },
    { icon: 'verified_user',         label: 'KYC Approved', value: 128, delta: '+9', up: true },
    { icon: 'pending_actions',       label: 'KYC Pending', value: 7,  delta: '–',  up: true },
  ];

  // Live auctions snapshot
  liveAuctions = [
    { lot: 'AU-1042', car: 'Toyota Prado 2019 TXL',  endsInMin: 26,  bids: 34, topBid: 36_500, status: 'Live' },
    { lot: 'AU-1041', car: 'Honda Civic 2021 Oriel', endsInMin: 58,  bids: 21, topBid: 24_900, status: 'Live' },
    { lot: 'AU-1039', car: 'Kia Sportage 2020 AWD',   endsInMin: 120, bids: 12, topBid: 29_300, status: 'Scheduled' },
  ];

  // Verification queue
  kycQueue = [
    { name: 'Hiba Khan',  handle: '@hibak',  doc: 'CNIC',    age: '2h' },
    { name: 'Bilal A.',   handle: '@bilal',  doc: 'Passport',age: '5h' },
    { name: 'M. Ali',     handle: '@alidee', doc: 'DL',      age: '1d' },
  ];

  // Top bidders today
  topBidders = [
    { name: 'Zain R.',   handle: '@zain',   bids: 188, color: '#6ee7b7' },
    { name: 'Ayesha S.', handle: '@ayesha', bids: 163, color: '#93c5fd' },
    { name: 'Junaid I.', handle: '@junaid', bids: 151, color: '#fca5a5' },
  ];

  // Activity feed
  activity = [
    { icon: 'gavel',            text: 'Bid placed on AU-1042 (Prado) — $36,500', time: '2m' },
    { icon: 'directions_car',   text: 'New vehicle listed: Corolla 2022 Altis',  time: '14m' },
    { icon: 'person_add',       text: 'New dealer signed up: Prime Motors',      time: '43m' },
    { icon: 'verified_user',    text: 'KYC verified: @hibak',                    time: '1h'  },
  ];

  private counterTimer?: any;

  ngAfterViewInit(): void {
    // lightweight number animation for tiles
    const els = Array.from(document.querySelectorAll<HTMLElement>('.count-up'));
    const anim = (el: HTMLElement) => {
      const target = Number(el.dataset['value'] || '0');
      const dur = 900; // ms
      const step = (t0: number) => {
        const p = Math.min(1, (performance.now() - t0) / dur);
        const val = Math.floor(target * (0.2 + 0.8 * p * (2 - p))); // ease-out
        el.innerText = this.formatNumber(val);
        if (p < 1) requestAnimationFrame(() => step(t0));
      };
      requestAnimationFrame(() => step(performance.now()));
    };
    this.counterTimer = setTimeout(() => els.forEach(anim), 300);
  }

  ngOnDestroy(): void {
    if (this.counterTimer) clearTimeout(this.counterTimer);
  }

  formatNumber(n: number): string {
    return n >= 1000 ? n.toLocaleString() : String(n);
  }
}
