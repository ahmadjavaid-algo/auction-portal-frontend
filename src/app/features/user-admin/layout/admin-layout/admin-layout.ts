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
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../../services/auth';
import {
  AdminNotificationHubService,
  AdminNotificationItem
} from '../../../../services/admin-notification-hub.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.scss']
})
export class AdminLayout implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private adminNotifHub = inject(AdminNotificationHubService);

  dropdownOpen = false;
  sidebarCollapsed = false;

  notifOpen = false;
  notifications: AdminNotificationItem[] = [];
  unreadCount = 0;

  
  currentPageTitle = 'Dashboard';

  @ViewChild('dropdown') dropdownRef!: ElementRef;
  @ViewChild('notifHost') notifHostRef!: ElementRef;

  private notifSub?: Subscription;
  private routeSub?: Subscription;

  get displayName(): string {
    const u = this.auth.currentUser;
    if (!u) return 'Admin';
    const name = [u.firstName].filter(Boolean).join(' ').trim();
    return name || u.userName || 'Admin';
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated) {
      this.adminNotifHub.init();
      this.notifSub = this.adminNotifHub.notifications$.subscribe(list => {
        this.notifications = list;
        this.unreadCount = list.filter(n => !n.read).length;
      });
    }

    
    this.updatePageTitleFromUrl(this.router.url);

    
    this.routeSub = this.router.events.subscribe(ev => {
      if (ev instanceof NavigationEnd) {
        this.updatePageTitleFromUrl(ev.urlAfterRedirects || ev.url);
      }
    });
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  private updatePageTitleFromUrl(url: string): void {
    const clean = (url || '').split('?')[0].toLowerCase();

    if (clean.includes('/admin/users')) {
      this.currentPageTitle = 'Users';
    } else if (clean.includes('/admin/roles')) {
      this.currentPageTitle = 'Roles';
    } else if (clean.includes('/admin/inspectors')) {
      this.currentPageTitle = 'Inspectors';
    } else if (clean.includes('/admin/bidders')) {
      this.currentPageTitle = 'Bidders';
    } else if (clean.includes('/admin/emails')) {
      this.currentPageTitle = 'Emails';
    } else if (clean.includes('/admin/make')) {
      this.currentPageTitle = 'Product Configuration';
    } else if (clean.includes('/admin/products')) {
      this.currentPageTitle = 'Products';
    } else if (clean.includes('/admin/inventory')) {
      this.currentPageTitle = 'Inventory';
    } else if (clean.includes('/admin/auctions')) {
      this.currentPageTitle = 'Auctions';
    } else if (clean.includes('/admin/inspection')) {
      this.currentPageTitle = 'Inspection';
    } else if (clean.includes('/admin/change-password')) {
      this.currentPageTitle = 'Change Password';
    } else if (clean.includes('/admin/dashboard')) {
      this.currentPageTitle = 'Dashboard';
    } else {
      this.currentPageTitle = 'Admin';
    }
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
      this.adminNotifHub.markAllAsRead();
    }
  }

  clearNotifications(ev?: MouseEvent): void {
    ev?.stopPropagation();
    this.adminNotifHub.clearAll();
  }

  onNotificationClick(n: AdminNotificationItem): void {
    this.notifOpen = false;

    if (n.auctionId && n.inventoryAuctionId) {
      this.router.navigate(['/admin/auctions', n.auctionId]);
      return;
    }

    if (n.affectedUserId) {
      this.router.navigate(['/admin/bidders', n.affectedUserId]);
      return;
    }

    this.router.navigate(['/admin/dashboard']);
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

  changePassword(): void {
    this.dropdownOpen = false;

    if (!this.auth.isAuthenticated || !this.auth.currentUser?.userId) {
      this.router.navigate(['/admin/login'], {
        queryParams: { returnUrl: '/admin/change-password' }
      });
      return;
    }

    this.router.navigate(['/admin/change-password']);
  }

  logout(): void {
    this.dropdownOpen = false;
    this.notifOpen = false;

    this.adminNotifHub.stop();
    this.auth.logout();
    this.router.navigate(['/admin/login']);
  }
}
