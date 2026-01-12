import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';

import { forkJoin, of, interval, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuctionBidService } from '../../../../../services/auctionbids.service';
import { BidderAuthService } from '../../../../../services/bidderauth';
import { BiddersService } from '../../../../../services/bidders.service'; // ✅ ADD
import { Bidder } from '../../../../../models/bidder.model';

interface LeaderboardEntry {
  rank: number;
  userId: number;
  userName: string;
  displayName: string; // Full name with bidder number
  avatar?: string;
  stats: {
    totalBids?: number;
    totalWins?: number;
    highestBid?: number;
    aiEnabled?: boolean;
    aiActivations?: number;
  };
  badge?: 'champion' | 'elite' | 'pro' | null;
  isCurrentUser?: boolean;
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatTabsModule
  ],
  templateUrl: './leaderboard.html',
  styleUrls: ['./leaderboard.scss']
})
export class Leaderboard implements OnInit, OnDestroy {
  private bidsSvc = inject(AuctionBidService);
  private bidderAuth = inject(BidderAuthService);
  private biddersSvc = inject(BiddersService); // ✅ ADD

  private refreshSub?: Subscription;

  loading = true;
  error: string | null = null;
  isLightMode = false;

  activeCategory: 'bids' | 'wins' | 'amount' | 'ai' = 'ai';

  mostBidsLeaders: LeaderboardEntry[] = [];
  mostWinsLeaders: LeaderboardEntry[] = [];
  highestAmountLeaders: LeaderboardEntry[] = [];
  aiMastersLeaders: LeaderboardEntry[] = [];

  currentLeaders: LeaderboardEntry[] = [];

  totalBidders = 0;
  totalAiBidders = 0;
  totalBidsPlaced = 0;
  totalAiActivations = 0;

  // Cache bidders (same idea as your accdetails -> we now fill this map)
  private biddersMap = new Map<number, Bidder>();

  ngOnInit(): void {
    this.loadLeaderboards();

    this.refreshSub = interval(120000).subscribe(() => this.loadLeaderboards());

    try {
      const savedTheme = localStorage.getItem('theme-preference');
      if (savedTheme === 'light') {
        this.isLightMode = true;
        setTimeout(() => {
          const hostElement = document.querySelector('app-leaderboard');
          if (hostElement) hostElement.classList.add('light-mode');
        }, 0);
      }
    } catch (e) {
      console.warn('Could not load theme preference:', e);
    }
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  toggleTheme(): void {
    this.isLightMode = !this.isLightMode;

    const hostElement = document.querySelector('app-leaderboard');
    if (hostElement) {
      hostElement.classList.toggle('light-mode', this.isLightMode);
    }

    try {
      localStorage.setItem('theme-preference', this.isLightMode ? 'light' : 'dark');
    } catch (e) {
      console.warn('Could not save theme preference:', e);
    }
  }

  loadLeaderboards(): void {
    this.loading = true;
    this.error = null;

    // 1) Load bids first
    this.bidsSvc
      .getList()
      .pipe(
        catchError((err) => {
          console.error('Failed to load bids:', err);
          this.error = 'Failed to load leaderboard data';
          return of([]);
        })
      )
      .subscribe({
        next: (bids) => {
          // 2) Extract unique bidder ids (same field you already use in leaderboard)
          const userIds = this.extractUniqueUserIdsFromBids(bids);

          // If no bidders, still render with fallbacks
          if (userIds.length === 0) {
            this.biddersMap.clear();
            this.processLeaderboardData(bids);
            this.loading = false;
            return;
          }

          // 3) Fetch each bidder using SAME pattern as your accdetails (getById)
          // Safety: don't spam too many calls if bid history is huge
          const cappedIds = userIds.slice(0, 200);

          const calls = cappedIds.map((id) =>
            this.biddersSvc.getById(id).pipe(
              catchError((err) => {
                console.warn(`Failed to load bidder ${id}`, err);
                return of(null);
              })
            )
          );

          forkJoin(calls).subscribe({
            next: (bidders) => {
              // 4) Cache bidders
              const ok = (bidders ?? []).filter((b): b is Bidder => !!b && !!(b as any).userId);
              this.cacheBidders(ok);

              // 5) Build leaderboard with real names
              this.processLeaderboardData(bids);
              this.loading = false;
            },
            error: (err) => {
              console.error('Failed to load bidder profiles:', err);
              // Still show leaderboard even if names failed
              this.processLeaderboardData(bids);
              this.loading = false;
            }
          });
        },
        error: (err) => {
          console.error('Failed to load leaderboard data', err);
          this.error = 'Failed to load leaderboard data';
          this.loading = false;
        }
      });
  }

  private extractUniqueUserIdsFromBids(bids: any[]): number[] {
    const set = new Set<number>();

    for (const bid of bids ?? []) {
      const id = Number((bid as any).createdById ?? 0);
      if (id > 0) set.add(id);
    }

    return Array.from(set.values());
  }

  private cacheBidders(bidders: Bidder[]): void {
    this.biddersMap.clear();
    for (const b of bidders ?? []) {
      if (!b?.userId) continue;
      this.biddersMap.set(b.userId, b);
    }
  }

  // ✅ SAME logic style as your accdetails displayName getter, but includes bidder number
  private getBidderDisplayName(userId: number): string {
    const bidder = this.biddersMap.get(userId);
    if (!bidder) return `Bidder #${userId}`;

    const fn = (bidder.firstName || '').trim();
    const ln = (bidder.lastName || '').trim();
    const full = `${fn} ${ln}`.trim();
    const base = full || (bidder.userName || '').trim() || `Bidder #${userId}`;

    return `${base} (Bidder #${userId})`;
  }

  private processLeaderboardData(bids: any[]): void {
    const currentUserId = this.bidderAuth.currentUser?.userId ?? null;

    const userMap = new Map<number, {
      totalBids: number;
      totalWins: number;
      highestBid: number;
      aiActivations: number;
    }>();

    for (const bid of bids ?? []) {
      const userId = Number((bid as any).createdById ?? 0);
      if (!userId) continue;

      const amount = Number((bid as any).bidAmount ?? (bid as any).BidAmount ?? 0);
      const isAi = !!((bid as any).isAutoBid ?? (bid as any).IsAutoBid ?? false);
      const statusName = String((bid as any).auctionBidStatusName ?? (bid as any).AuctionBidStatusName ?? '').toLowerCase();
      const isWin = statusName === 'won' || statusName === 'winning';

      if (!userMap.has(userId)) {
        userMap.set(userId, { totalBids: 0, totalWins: 0, highestBid: 0, aiActivations: 0 });
      }

      const u = userMap.get(userId)!;
      u.totalBids++;
      if (isWin) u.totalWins++;
      if (amount > u.highestBid) u.highestBid = amount;
      if (isAi) u.aiActivations++;
    }

    const entries: LeaderboardEntry[] = [];
    userMap.forEach((data, userId) => {
      const displayName = this.getBidderDisplayName(userId);

      entries.push({
        rank: 0,
        userId,
        userName: displayName.replace(/\s*\(Bidder #\d+\)\s*$/, ''), // strip suffix for plain name
        displayName,
        stats: {
          totalBids: data.totalBids,
          totalWins: data.totalWins,
          highestBid: data.highestBid,
          aiEnabled: data.aiActivations > 0,
          aiActivations: data.aiActivations
        },
        badge: null,
        isCurrentUser: userId === currentUserId
      });
    });

    this.mostBidsLeaders = [...entries]
      .sort((a, b) => (b.stats.totalBids ?? 0) - (a.stats.totalBids ?? 0))
      .slice(0, 50)
      .map((e, i) => ({ ...e, rank: i + 1, badge: this.getBadge(i + 1) }));

    this.mostWinsLeaders = [...entries]
      .sort((a, b) => (b.stats.totalWins ?? 0) - (a.stats.totalWins ?? 0))
      .slice(0, 50)
      .map((e, i) => ({ ...e, rank: i + 1, badge: this.getBadge(i + 1) }));

    this.highestAmountLeaders = [...entries]
      .sort((a, b) => (b.stats.highestBid ?? 0) - (a.stats.highestBid ?? 0))
      .slice(0, 50)
      .map((e, i) => ({ ...e, rank: i + 1, badge: this.getBadge(i + 1) }));

    this.aiMastersLeaders = [...entries]
      .filter(e => (e.stats.aiActivations ?? 0) > 0)
      .sort((a, b) => (b.stats.aiActivations ?? 0) - (a.stats.aiActivations ?? 0))
      .slice(0, 50)
      .map((e, i) => ({ ...e, rank: i + 1, badge: this.getBadge(i + 1) }));

    this.totalBidders = entries.length;
    this.totalAiBidders = entries.filter(e => e.stats.aiEnabled).length;
    this.totalBidsPlaced = entries.reduce((sum, e) => sum + (e.stats.totalBids ?? 0), 0);
    this.totalAiActivations = entries.reduce((sum, e) => sum + (e.stats.aiActivations ?? 0), 0);

    this.switchCategory(this.activeCategory);
  }

  private getBadge(rank: number): 'champion' | 'elite' | 'pro' | null {
    if (rank === 1) return 'champion';
    if (rank <= 3) return 'elite';
    if (rank <= 10) return 'pro';
    return null;
  }

  switchCategory(category: 'bids' | 'wins' | 'amount' | 'ai'): void {
    this.activeCategory = category;

    switch (category) {
      case 'bids':
        this.currentLeaders = this.mostBidsLeaders;
        break;
      case 'wins':
        this.currentLeaders = this.mostWinsLeaders;
        break;
      case 'amount':
        this.currentLeaders = this.highestAmountLeaders;
        break;
      case 'ai':
        this.currentLeaders = this.aiMastersLeaders;
        break;
    }
  }

  money(n?: number | null): string {
    return n == null
      ? '—'
      : n.toLocaleString(undefined, {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0
        });
  }

  getRankIcon(rank: number): string {
    if (rank === 1) return 'emoji_events';
    if (rank === 2) return 'military_tech';
    if (rank === 3) return 'workspace_premium';
    return 'star_outline';
  }

  getRankColor(rank: number): string {
    if (rank === 1) return '#ffd700';
    if (rank === 2) return '#c0c0c0';
    if (rank === 3) return '#cd7f32';
    return 'currentColor';
  }
}
