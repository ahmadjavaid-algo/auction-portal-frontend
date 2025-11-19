
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

import { AuthService } from '../../../../services/auth';
import {
  AdminNotificationHubService,
  AdminNotificationItem
} from '../../../../services/admin-notification-hub.service';

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
    if (this.auth.isAuthenticated) {
      this.adminNotifHub.init();
      this.notifSub = this.adminNotifHub.notifications$.subscribe(list => {
        this.notifications = list;
        this.unreadCount = list.filter(n => !n.read).length;
      });
    }
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) this.notifOpen = false;
  }

  toggleSidebar(): void { this.sidebarCollapsed = !this.sidebarCollapsed; }

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
