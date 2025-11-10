import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { BidderAuthService } from '../../../../services/bidderauth';
import {
  NotificationHubService,
  NotificationItem
} from '../../../../services/notification-hub.service';

@Component({
  selector: 'app-bidder-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  templateUrl: './bidder-layout.html',
  styleUrls: ['./bidder-layout.scss']
})
export class BidderLayout implements OnInit, OnDestroy {
  private auth = inject(BidderAuthService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private notifHub = inject(NotificationHubService);

  dropdownOpen = false;
  sidebarCollapsed = false;

  notifOpen = false;
  notifications: NotificationItem[] = [];
  unreadCount = 0;

  @ViewChild('dropdown') dropdownRef!: ElementRef;
  @ViewChild('notifHost') notifHostRef!: ElementRef;

  private notifSub?: any;

  get displayName(): string {
    const u = this.auth.currentUser;
    if (!u) return 'Admin';
    const name = [u.firstName].filter(Boolean).join(' ').trim();
    return name || u.userName || 'Admin';
  }

  ngOnInit(): void {
    const uid = this.auth.currentUser?.userId ?? null;


    this.notifHub.initForUser(uid);

    this.notifSub = this.notifHub.notifications$.subscribe(list => {
      this.notifications = list;
      this.unreadCount = list.filter(n => !n.read).length;
    });
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) this.notifOpen = false;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleNotifications(): void {
    this.notifOpen = !this.notifOpen;
    if (this.notifOpen) {
      this.dropdownOpen = false;
      this.notifHub.markAllAsRead();
    }
  }

  clearNotifications(ev?: MouseEvent): void {
    ev?.stopPropagation();
    this.notifHub.clearAll();
  }

  
  onNotificationClick(n: NotificationItem): void {
    this.notifOpen = false;


    if (n.auctionId && n.inventoryAuctionId) {
      this.router.navigate([
        '/bidder/auctions',
        n.auctionId,
        n.inventoryAuctionId
      ]);
      return;
    }


    if (n.type === 'favourite-added' || n.type === 'favourite-deactivated') {
      this.router.navigate(['/bidder/favourites-list']);
      return;
    }


    this.router.navigate(['/bidder/allauctions']);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    const target = ev.target as HTMLElement;

    if (this.dropdownOpen && this.dropdownRef &&
        !this.dropdownRef.nativeElement.contains(target)) {
      this.dropdownOpen = false;
    }

    if (this.notifOpen && this.notifHostRef &&
        !this.notifHostRef.nativeElement.contains(target)) {
      this.notifOpen = false;
    }
  }

  
  goAccount(ev?: Event): void {
    ev?.preventDefault();
    ev?.stopPropagation();
    this.dropdownOpen = false;

    if (!this.auth.isAuthenticated || !this.auth.currentUser?.userId) {
      this.router.navigate(['/bidder/login'], { queryParams: { returnUrl: '/bidder/accdetails' } });
      return;
    }

    this.router.navigate(['/bidder/accdetails']);
  }

// bidder-layout.ts (only the changePassword method changed)
  changePassword(): void {
    this.dropdownOpen = false;

    if (!this.auth.isAuthenticated || !this.auth.currentUser?.userId) {
      this.router.navigate(['/bidder/login'], {
        queryParams: { returnUrl: '/bidder/change-password' }
      });
      return;
    }

    this.router.navigate(['/bidder/change-password']);
  }


  async logout(): Promise<void> {
    this.dropdownOpen = false;
    this.notifOpen = false;


    await this.notifHub.stop();

    this.auth.logout();
    this.router.navigate(['/bidder/login']);
  }
}
