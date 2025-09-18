import {
  Component, ElementRef, HostListener, ViewChild, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { BidderAuthService } from '../../../../services/bidderauth';

@Component({
  selector: 'app-bidder-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  templateUrl: './bidder-layout.html',
  styleUrls: ['./bidder-layout.scss']
})
export class BidderLayout {
  private auth = inject(BidderAuthService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  dropdownOpen = false;
  sidebarCollapsed = false;

  @ViewChild('dropdown') dropdownRef!: ElementRef;

  get displayName(): string {
    const u = this.auth.currentUser;
    if (!u) return 'Admin';
    const name = [u.firstName].filter(Boolean).join(' ').trim();
    return name || u.userName || 'Admin';
  }

  toggleDropdown(): void { this.dropdownOpen = !this.dropdownOpen; }
  toggleSidebar(): void { this.sidebarCollapsed = !this.sidebarCollapsed; }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    if (this.dropdownOpen && this.dropdownRef && !this.dropdownRef.nativeElement.contains(ev.target)) {
      this.dropdownOpen = false;
    }
  }

/** Open current bidder's account details page */
goAccount(ev?: Event): void {
  ev?.preventDefault();
  ev?.stopPropagation();      // don't re-toggle the dropdown
  this.dropdownOpen = false;

  if (!this.auth.isAuthenticated || !this.auth.currentUser?.userId) {
    this.router.navigate(['/bidder/login'], { queryParams: { returnUrl: '/bidder/accdetails' } });
    return;
  }

  this.router.navigate(['/bidder/accdetails']);  // <-- matches your routing table
}


  changePassword(): void {
    // Keep your placeholder for now (or navigate if you have a route ready)
    this.dropdownOpen = false;
    this.snack.open('Change password coming soon.', 'OK', { duration: 2500 });
  }

  logout(): void {
    this.dropdownOpen = false;
    this.auth.logout();
    this.router.navigate(['/bidder/login']);
  }
}
